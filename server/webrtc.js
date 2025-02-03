const setupWebRTC = (io) => {
    io.on('connection', (socket) => {
        console.log('WebRTC signaling connection established:', socket.id);

        // Handle WebRTC signaling events
        socket.on('offer', (offer) => {
            socket.broadcast.emit('offer', offer); // Broadcast offer to other clients
        });

        socket.on('answer', (answer) => {
            socket.broadcast.emit('answer', answer); // Broadcast answer to other clients
        });

        socket.on('ice-candidate', (candidate) => {
            socket.broadcast.emit('ice-candidate', candidate); // Broadcast ICE candidate to other clients
        });
    });
};

module.exports = setupWebRTC;