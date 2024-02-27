const catchAsyncError = require('../middleware/CatchAsyncError');
const User = require('../models/userModel');
const ErrorHandler = require('../utils/ErrorHandler');
const mongoose = require('mongoose');

// Register a User in the database :

exports.registerUser = catchAsyncError(async(req, res, next) => {
    const {name, email, password, image=null} = req.body;
    console.log('request here')
    const user = await User.create({
        name, 
        email, 
        password,
        image,
    });

    console.log('request here')
    res.status(201).json({
        success:true,
        user
    })
});


// Login a User into the application :

exports.loginUser = catchAsyncError(async(req, res, next) => {
    const {email, password} = req.body;
    // Check if the user has entered both values :
    if(!email || !password){
        return next(new ErrorHandler("Please Enter Email and Password ", 400));
    }

    // find the user in the database : 
    const user  = await User.findOne({email}).select("+password");

    // If the user is not found in the database :
    if(!user){
        return next(new ErrorHandler("Invalid Email", 401));
    }

    // Check if the passoword matches with the hashed password  :
    const isPasswordMatched = await user.comparePassword(password);
    if(!isPasswordMatched){
        return next(new ErrorHandler("Invalid Email or Password!!"));
    }

    res.status(200).json({
        success:true,
        user
    });


});


// Logout a User :
exports.logOut = catchAsyncError(async(req, res, next) => {
    res.status(200).json({
        success:true,
        message:"Logged Out"
    });
});


// get the list of friends :

exports.getFriends = catchAsyncError(async (req, res, next) => {
    const userId = req.body.userId; // Assuming you provide userId in the request body

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ObjectId',
        });
    }

    try {
        // Find the user in the database
        const user = await User.findById(userId).populate('friends', 'name email'); // Adjust the projection as needed

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
        console.error('Error getting friends:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
});

// add a friend :

exports.addFriend = catchAsyncError(async (req, res, next) => {
    const userId = req.body.userId; // Change from myId to userId
    const friendId = req.body.friendId;

    try {
        // Update the user's document to add the friend to the friends array
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { friends: friendId } },
            { new: true }
        );
        await User.findByIdAndUpdate(
            friendId,
            { $addToSet: { friends: userId } },
            { new: true }
        );

        await User.findByIdAndUpdate(friendId, {
            $pull:{requestsRecieved : userId},
        });
    
        // update the senders friend request sent array :
        await User.findByIdAndUpdate(userId, {
            $pull:{requestsSent: friendId}
        })


        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

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



// find a user in the database to add as a friend :
exports.findFriend = catchAsyncError(async (req, res, next) => {
    const {email} = req.body;
    const user = await User.findOne({email});
    console.log(user);
    if (!user) {
        return next(new ErrorHandler("User not Found", 400));
    }

    res.status(201).json({
        success: true,
        friend: user._id
    });
});

// send Request 
exports.sendRequest = catchAsyncError(async (req, res, next) => {
    console.log("Request here")
    const { email, userId } = req.body;

    const recipientUser = await User.findOne({ email });
    const senderUser = await User.findById(userId);

    // Convert ObjectIds to strings for comparison
    const senderUserIdString = senderUser._id.toString();
    const recipientUserIdString = recipientUser._id.toString();

    if (senderUserIdString === recipientUserIdString) {
        return next(new ErrorHandler("Cannot send a request to yourself"));
    }

    if (!recipientUser) {
        return next(new ErrorHandler('User not Found!!', 400));
    }

    if (senderUser.friends.includes(recipientUser._id) || recipientUser.friends.includes(senderUser._id)) {
        return next(new ErrorHandler('Already a friend', 400));
    }

    if (senderUser.requestsSent.includes(recipientUser._id)) {
        return next(new ErrorHandler('Request already sent!', 400));
    }

    recipientUser.requestsRecieved.push(senderUser._id);
    await recipientUser.save();

    senderUser.requestsSent.push(recipientUser._id);
    await senderUser.save();

    res.status(200).json({
        success: true,
        message: 'Friend request sent successfully!',
    });
});



// Get All the Requests for a particular User
exports.getAllRequests = catchAsyncError(async (req, res, next) => {
    const userId = req.query.id; 
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId',
      });
    }
  
    try {
      // Find the user in the database
      const user = await User.findById(userId).populate('requestsRecieved', '_id name');
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
  
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

    // Update the recievers friendRequest recieved array :
    await User.findByIdAndUpdate(recieverId, {
        $pull:{requestsRecieved : senderId},
    });

    // update the senders friend request sent array :
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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ObjectId',
        });
    }

    try {
        // Remove friendId from the user's friends array
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { friends: friendId } },
            { new: true }
        );

        // Remove userId from the friend's friends array
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

        res.status(200).json({
            success: true,
            message: 'Friend removed successfully!',
        });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
});
