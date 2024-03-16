const catchAsyncError = require('../middleware/CatchAsyncError');
const User = require('../models/userModel');
const ErrorHandler = require('../utils/ErrorHandler');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary')
const Message = require('../models/messageModel')
// Login a User :
exports.loginUser = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;
    console.log(email, password)
    if (!email || !password) {
        return next(new ErrorHandler("Please enter email and password", 400));
    }

    try {
        console.log("request here for login")
        const user = await User.findOne({ email }).select("+password");
        
        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 401));
        }

        const isPasswordMatched = await user.comparePassword(password);
        if (!isPasswordMatched) {
            return next(new ErrorHandler("Invalid email or password", 401));
        }

        const token = user.generateAuthToken(); 
        console.log(token)
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An Error Occurred, Please try again later"
        });
    }
});

// Register a User
exports.registerUser = catchAsyncError(async (req, res, next) => {
    const { name, email, password, image = null } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return next(new ErrorHandler("A user is already registered with this email", 401));
        }

        const user = await User.create({ name, email, password, image });

        const token = user.generateAuthToken(); 
        
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(201).json({
            success: true,
            user
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, errors });
        }

        res.status(500).json({ success: false, message: "An Error Occurred, Please try again later" });
    }
});

// Logout a user
exports.logOut = catchAsyncError(async (req, res, next) => {
    res.clearCookie('token'); 
    res.status(200).json({
        success: true,
        message: "Logged Out"
    });
});




// get the list of friends :
exports.getFriends = catchAsyncError(async (req, res, next) => {
    const userId = req.body.userId; 
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ObjectId',
        });
    }

    try {
        const user = await User.findById(userId).populate('friends', 'name email admin image isGroup'); // Adjust the projection as needed
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.status(200).json({
            success: true,
            friends: user.friends,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
});

exports.addFriend = catchAsyncError(async (req, res, next) => {
    const userId = req.body.userId; 
    const friendId = req.body.friendId;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
        });
    }

    try {
        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'You are not a valid User!!',
            });
        }

        if (!friend) {
            return res.status(404).json({
                success: false,
                message: 'User not found !!',
            });
        }

        // Add friendId to user's friends array if not already present
        await User.findByIdAndUpdate(userId, { $addToSet: { friends: friendId } });

        // Add userId to friend's friends array if not already present
        await User.findByIdAndUpdate(friendId, { $addToSet: { friends: userId } });

        // Remove friendId from friend's requestsReceived array
        await User.findByIdAndUpdate(friendId, { $pull: { requestsRecieved: userId } });

        // Remove userId from user's requestsSent array
        await User.findByIdAndUpdate(userId, { $pull: { requestsSent: friendId } });

        // Fetch updated user document
        const updatedUser = await User.findById(userId);

        res.status(201).json({
            success: true,
            friends: updatedUser.friends,
        });
    } catch (error) {
        console.error('Error adding friend:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
});




// Find a user in the database to add as a friend
exports.findFriend = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }
    res.status(200).json({
        success: true,
        message:"Email is Valid",
        friendId: user._id
    });
});


// Send a friend request
exports.sendRequest = catchAsyncError(async (req, res, next) => {
    console.log("request to send here");
    const { email, userId } = req.body;
    const recipientUser = await User.findOne({ email });
    const senderUser = await User.findById(userId);

    if (!recipientUser) {
        return next(new ErrorHandler('Recipient user not found', 404));
    }

    if (!senderUser) {
        return next(new ErrorHandler('Sender user not found', 404));
    }

    const senderUserIdString = senderUser._id.toString();
    const recipientUserIdString = recipientUser?._id?.toString();

    if (senderUserIdString === recipientUserIdString) {
        return next(new ErrorHandler("Cannot send a friend request to yourself", 400));
    }

    if (senderUser.friends.includes(recipientUser._id) || recipientUser.friends.includes(senderUser._id)) {
        return next(new ErrorHandler('You are already friends', 400));
    }

    if (senderUser.requestsSent.includes(recipientUser._id)) {
        return next(new ErrorHandler('Friend request already sent', 400));
    }

    await User.findByIdAndUpdate(
        recipientUser._id,
        { $push: { requestsRecieved: senderUser._id } }
    );

    await User.findByIdAndUpdate(
        senderUser._id,
        { $push: { requestsSent: recipientUser._id } }
    );

    res.status(200).json({
        success: true,
        message: 'Friend request sent successfully',
    });
});




// Get All the Requests for a particular User
exports.getAllRequests = catchAsyncError(async (req, res, next) => {
    const userId = req.params.id; 
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId',
      });
    }
  
    try {
      const user = await User.findById(userId).populate('requestsRecieved', '_id name isGroup');
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      console.log(user)
      res.status(201).json({
        success: true,
        requestsRecieved: user.requestsRecieved,
      });
    } catch (error) {
      console.error('Error getting requests:', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  });
  
  

// Decline a request :
exports.declineRequest = catchAsyncError(async(req, res, next) => {
    const {senderId, recieverId} = req.body;
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(recieverId) ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ObjectId',
        });
      }
    await User.findByIdAndUpdate(recieverId, {
        $pull:{requestsRecieved : senderId},
    });

    await User.findByIdAndUpdate(senderId, {
        $pull:{requestsSent: recieverId}
    })

    res.status(201).json({
        success:true,
        message : "Recieved Request is successfully Declined"
    })
})


// Remove a friend :
exports.removeFriend = catchAsyncError(async (req, res, next) => {
    const { userId, friendId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ObjectId',
        });
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { friends: friendId } },
            { new: true }
        );

        const updatedFriend = await User.findByIdAndUpdate(
            friendId,
            { $pull: { friends: userId } },
            { new: true }
        );

        if (!updatedUser || !updatedFriend) {
            return res.status(404).json({
                success: false,
                message: 'User or friend not found',
            });
        }
        await Message.deleteMany({ $or: [{ from: userId, to: friendId }, { from: friendId, to: userId }] });

        res.status(200).json({
            success: true,
            message: 'Friend removed successfully! Messages between users deleted.',
        });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
});

// Update User Profile(Image and Username only) : 
exports.updateProfile = catchAsyncError(async (req, res, next) => {
    try {
        const { name, email, image } = req.body;
        console.log(name, email, image);

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is invalid' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found - Update Failed' });
        }

        if (image && image !== user.image) {
            if (user.image && user.public_id) {
                await cloudinary.v2.uploader.destroy(user.public_id);
            }
            
            const result = await cloudinary.v2.uploader.upload(image, {
                folder: 'chat-app-users',
                width: 450,
                crop: 'scale',
            });

            user.public_id = result.public_id;
            user.image = result.secure_url;
        }

        if (name) {
            user.name = name;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: user,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error });
    }
});


// Get User Info :
exports.getMyInfo = catchAsyncError(async (req, res, next) => {
    try {
        const id = req.params.id;
        let user = await User.findById(id);

        if (user) {
            if (user.isGroup) {
                user = await user.populate({
                    path: 'friends',
                    select: '_id name email image'
                });
            }
            res.status(200).json({
                success: true,
                message: "User info fetched successfully",
                info: user,
            });
        } else {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

    } catch (error) {
        console.error("Error fetching user info:", error);
        res.status(500).json({
            success: false,
            message: "Some Error Occured , Please try again"
        });
    }
});

// Create a Group :
exports.createGroup = catchAsyncError(async (req, res, next) => {
    try {
        const { groupName, admin, participants } = req.body;
        
        if (!groupName || !admin || !participants) {
            return res.status(400).json({
                success: false,
                message: 'groupName, admin, or participants is missing',
            });
        }
        
        const existingGroup = await User.findOne({ name: groupName, isGroup: true });
        if (existingGroup) {
            return res.status(400).json({
                success: false,
                message: 'Group name already exists. Please choose a different name.',
            });
        }

        const adminUser = await User.findOne({ email: admin });
        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found',
            });
        }

        const group = await User.create({
            name: groupName,
            isGroup: true,
            admin: adminUser._id,
        });

        await User.updateOne(
            { _id: group._id },
            { $addToSet: { friends: adminUser._id } }
        );

        await User.updateOne(
            { _id: adminUser._id },
            { $addToSet: { friends: group._id } }
        );

        const participantEmails = JSON.parse(participants);
        const invalidEmails = [];
        const validEmails = [];

        for (const participantEmail of participantEmails) {
            const participantUser = await User.findOne({ email: participantEmail });
           
            if (!participantUser) {
                invalidEmails.push(participantEmail);
            } else {
                await User.updateOne(
                    { _id: participantUser._id },
                    { $addToSet: { requestsRecieved: group._id } }
                );
                validEmails.push(participantEmail);
            }
        }

        if (validEmails.length === 0) {
            await group.deleteOne();
            return res.status(400).json({
                success: false,
                message: 'No valid participant email. Please check the emails entered',
                invalidEmails: invalidEmails
            });
        }

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            group: group,
            validEmails: validEmails,
            invalidEmails: invalidEmails
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors
            });
        }
        return next(new ErrorHandler(`Internal Server Error: ${error}`, 500));
    }
});




// Delete a group :
exports.deleteGroup = catchAsyncError(async (req, res, next) => {
    try {
        const { id } = req.body;
        console.log('request here', id)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid group ID.' });
        }

        const group = await User.findById(id);
        console.log(group)
        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found.' });
        }
        console.log('group found')
        await Message.deleteMany({ to: group._id });
        await group.deleteOne();
        console.log('group deleted')
        res.status(200).json({ success: true, message: 'Group deleted successfully.' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the group.' });
    }
});


// Add more partitciapents to the group :
exports.addParticipantsToGroup = catchAsyncError(async (req, res, next) => {
    try {
        const { participants, admin, groupId } = req.body;
        console.log(participants, admin, groupId)
        const adminUser = await User.findOne({ email: admin });
        if (!adminUser) {
            return next(new ErrorHandler('Admin user not found', 404));
        }

        const group = await User.findById(groupId);
        if (!group || !group.isGroup) {
            return next(new ErrorHandler(`Group with ID ${groupId} not found`, 404));
        }

        if (adminUser._id.toString() !== group.admin.toString()) {
            return next(new ErrorHandler('You are not authorized as you are not the admin', 403));
        }

        const participantEmails = JSON.parse(participants);
        const invalidEmails = [];
        const validEmails = [];
        for (const participantEmail of participantEmails) {
            const participantUser = await User.findOne({ email: participantEmail })
            console.log(participantUser);
            if (!participantUser) {
                invalidEmails.push(participantEmail);
            } 
            else {
                participantUser.requestsRecieved.push(group._id);
                await participantUser.save();
                validEmails.push(participantEmail)
            }
        }

        res.status(201).json({
            success: true,
            message: 'Request Sent Successfully !! ',
            validEmails: validEmails,
            invalidEmails: invalidEmails
        });
    } catch (error) {
        return next(new ErrorHandler(`Error updating group: ${error}`, 400));
    }
});


// Remove a Particiapent from a group :
exports.removeParticipant = async (req, res, next) => {
    try {
        const { participantId, groupId } = req.query;

        if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(participantId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid group ID or participant ID',
            });
        }

        const updateGroup = await User.findByIdAndUpdate(groupId, { $pull: { friends: participantId } });
        const updateParticipant = await User.findByIdAndUpdate(participantId, { $pull: { friends: groupId } });

        if (!updateGroup || !updateParticipant) {
            return res.status(500).json({
                success: false,
                message: 'Error removing participant from the group',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Participant removed from the group successfully',
        });
    } catch (error) {
        console.error('Error removing participant from the group:', error);
        return next(new ErrorHandler('Error removing participant from the group', 500));
    }
};  