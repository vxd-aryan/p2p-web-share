const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = 8080;
const app = express();
app.use(cors({ origin: "*" }));

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('create-room', (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        if (room) {
            socket.emit('room-error', 'Room already exists.');
            return;
        }
        socket.join(roomId);
        socket.roomId = roomId;
        socket.role = 'sender'; 
        console.log(`Room created: ${roomId} by ${socket.id}`);
        socket.emit('room-created', { roomId, role: 'sender' });
    });

    socket.on('join-room', (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        if (!room) {
            socket.emit('room-error', 'Room does not exist.');
            return;
        }
        if (room.size >= 2) {
            socket.emit('room-error', 'Room is full.');
            return;
        }
        socket.join(roomId);
        socket.roomId = roomId;
        socket.role = 'receiver';
        console.log(`Client ${socket.id} joined room: ${roomId}`);
        socket.emit('room-joined', { roomId, role: 'receiver' });
        socket.to(roomId).emit('peer-joined', socket.id);
    });

    socket.on('video-offer', (payload) => {
        if (socket.roomId) socket.to(socket.roomId).emit('video-offer', payload);
    });

    socket.on('video-answer', (payload) => {
        if (socket.roomId) socket.to(socket.roomId).emit('video-answer', payload);
    });

    socket.on('new-ice-candidate', (payload) => {
        if (socket.roomId) socket.to(socket.roomId).emit('new-ice-candidate', payload);
    });

    socket.on('disconnect', () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('peer-disconnected', socket.id);
        }
        console.log(`Client disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));