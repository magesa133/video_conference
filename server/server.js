const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const routes = require('./routes');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "client" directory
app.use(express.static(path.join(__dirname, '../client')));

app.use(express.json());
app.use('/api', routes);

// Store active rooms
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);

        // Notify other users in the room
        socket.to(roomId).emit('user-connected', userId);

        // Store the user in the room
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(userId);

        // Send the list of users in the room to the new user
        socket.emit('room-users', Array.from(rooms.get(roomId)));

        // Handle user disconnect
        socket.on('disconnect', () => {
            console.log(`User ${userId} disconnected from room ${roomId}`);
            socket.to(roomId).emit('user-disconnected', userId);
            rooms.get(roomId).delete(userId);
            if (rooms.get(roomId).size === 0) {
                rooms.delete(roomId); // Delete the room if empty
            }
        });
    });

    // WebRTC signaling
    socket.on('offer', (roomId, userId, offer) => {
        socket.to(roomId).emit('offer', userId, offer);
    });

    socket.on('answer', (roomId, userId, answer) => {
        socket.to(roomId).emit('answer', userId, answer);
    });

    socket.on('ice-candidate', (roomId, userId, candidate) => {
        socket.to(roomId).emit('ice-candidate', userId, candidate);
    });

    // Chat messages
    socket.on('chat-message', (roomId, userId, message) => {
        socket.to(roomId).emit('chat-message', userId, message);
    });
});

server.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});