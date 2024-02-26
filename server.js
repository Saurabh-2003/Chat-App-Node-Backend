// File: server.js
const dotenv = require('dotenv');
const connectDatabase = require('./database.js');
const app = require('./app.js');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/messageModel.js');
const User = require('./models/userModel.js');

dotenv.config({ path: "./config/config.env" });
connectDatabase();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// When a socket connects to the server :
io.on('connection', (socket) => {
  console.log('User connected once');

  // Private Messaging
  socket.on('join', (user_id) => {
    socket.join(user_id);
  });

  socket.on('sendMessage', async (data) => {
    console.log("message here in server");
    try {
      const { from, to, mess } = data;
      const message = new Message({
        from, to, message: mess
      });
      await message.save();
      io.to(to).emit('messageReceived', message);  // Emitting to the receiver
      io.to(from).emit('messageReceived', message);  // Emitting to the sender

    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  });

  // Public Groups
  socket.on("joinRoom", (data) => {
    socket.join(data);
    console.log("Connected to room successfully");
  });

  // Leave a rooom :
  socket.on("leaveRoom", ({ roomId }) => {
    socket.leave(roomId);
  });

  // Sned messages in a private room :
  socket.on('sendRoom', (data) => {
    console.log(data.username);
    io.to(data.roomId).emit('message', { username: data.username, message: data.message });
  });

  // Friend Management
  socket.on('addFriend', async (data) => {
    try {
      const { user, friend } = data;

      // Update friend lists for both users
      await User.updateOne({ username: user }, { $addToSet: { friends: friend } });
      await User.updateOne({ username: friend }, { $addToSet: { friends: user } });

      // Notify both users about the friend request acceptance
      io.to(user).emit('friendAdded', friend);
      io.to(friend).emit('friendAdded', user);
    } catch (error) {
      res.status(400).json({message : 'Enter An Email to Send Request!!'});
    }
  });

  // when a User Disconnects from the server :
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });



  // Logic for sending and accepting a request :

// Send the request to a friend :-
// Send the request to a friend :-
socket.on('sendRequest', (data) => {
  console.log('Request here');
  const { email, user } = data;
  const friend = User.findOne({ email });
  io.to(friend._id).emit('requestReceived'); // Use the correct event name here
});

// accept the Request :-
socket.on('acceptedRequest', (data) => {

  io.to(data.from).emit('requestAccepted');
  io.to(data.to).emit('requestAccepted');
});

socket.on('declineRequest', (data) => {
  io.to(data.to).to(data.from).emit('requestDeclined');
});

socket.on('friendDelete', (data) => {
  io.to(data.userId).to(data.friendId).emit('deleteFriend');
});

});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
