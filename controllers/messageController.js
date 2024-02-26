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
    const { userId, friendId } = req.body;
    
    // Find messages where from is userId and to is friendId
    const messagesFromUserToFriend = await Message.find({
        from: userId,
    });
    
    // Find messages where from is friendId and to is userId
    const messagesFromFriendToUser = await Message.find({
        from: friendId,
    });
    
    // Concatenate the two arrays of messages
    const allMessages = [...messagesFromUserToFriend, ...messagesFromFriendToUser];

    // Sort messages based on the timestamp in ascending order
    allMessages.sort((a, b) => a.timestamp - b.timestamp);

    res.status(200).json({
        success: true,
        messages: allMessages,
    });
});
