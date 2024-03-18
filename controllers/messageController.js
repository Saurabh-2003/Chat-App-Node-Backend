const catchAsyncError = require('../middleware/CatchAsyncError');
const User = require('../models/userModel');
const ErrorHandler = require('../utils/ErrorHandler');
const Message = require('../models/messageModel');


// Send the message to a friend
exports.createMessage = catchAsyncError(async (req, res, next) => {
    const { userId, friendId, messageContent } = req.body;


    // Check if the users exist
    const [user, friend] = await Promise.all([
        User.findById(userId),
        User.findById(friendId),
    ]);

    if (!user || !friend) {
        return next(new ErrorHandler("User or Friend not found", 404));
    }

    // Create the message
    const newMessage = new Message({
        from: userId,
        to: friendId,
        message: messageContent,
    });

    // Save the message
    const savedMessage = await newMessage.save();

    res.status(201).json({
        success: true,
        message: savedMessage,
    });
});


exports.getAllMessages = catchAsyncError(async (req, res, next) => {
    const { userId, friendId, page = 1 } = req.body;
    const resultPerPage = 10;
    const skip = resultPerPage * (page - 1);

    const friend = await User.findById(friendId);
    if (friend?.isGroup) {
        const newMessages = await Message.find({
            to: friendId,
        }).sort({ timestamp: -1 })
            .limit(resultPerPage)
            .skip(skip);

        newMessages.sort((a, b) => a.timestamp - b.timestamp);
        res.status(200).json({
            success: true,
            messages: newMessages,
        });
        return;
    }

    const messagesFromUserToFriend = await Message.find({
        $or: [
            { from: userId, to: friendId },
            { from: friendId, to: userId }
        ]
    }).sort({ timestamp: -1 })
        .limit(resultPerPage)
        .skip(skip);
    messagesFromUserToFriend.sort((a, b) => a.timestamp - b.timestamp);
    res.status(200).json({
        success: true,
        messages: messagesFromUserToFriend,
    });
});
