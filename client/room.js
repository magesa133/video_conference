// client/room.js

const socket = io('http://localhost:3000');
let localStream;
let screenStream;
let peers = {};
let isAudioMuted = false;
let isVideoOff = false;
let isScreenSharing = false;

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const username = urlParams.get('username');
const userId = uuid.v4();

// Initialize call
async function initializeCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;

        // Join room
        socket.emit('join-room', roomId, { userId, username });

        // Setup event handlers
        setupWebRTCHandlers();
        setupUIHandlers();
    } catch (error) {
        console.error('Error initializing call:', error);
        alert('Failed to access camera/microphone');
    }
}

// WebRTC handlers
function setupWebRTCHandlers() {
    socket.on('user-connected', async ({ userId, username }) => {
        console.log('User connected:', username);
        await connectToNewUser(userId, username);
    });

    socket.on('user-disconnected', userId => {
        if (peers[userId]) {
            peers[userId].close();
            delete peers[userId];
        }
        removeVideoElement(userId);
    });
}

// UI handlers
function setupUIHandlers() {
    socket.on('chat-message', addMessageToChat);
    socket.on('chat-history', messages => messages.forEach(addMessageToChat));
    socket.on('participants-updated', updateParticipantsList);
}

// Toggle audio
function toggleAudio() {
    isAudioMuted = !isAudioMuted;
    localStream.getAudioTracks().forEach(track => track.enabled = !isAudioMuted);
    updateAudioButton();
    socket.emit('toggle-audio', roomId, userId, isAudioMuted);
}

// Toggle video
function toggleVideo() {
    isVideoOff = !isVideoOff;
    localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
    updateVideoButton();
    socket.emit('toggle-video', roomId, userId, isVideoOff);
}

// Toggle screen sharing
async function toggleScreenShare() {
    if (!isScreenSharing) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia();
            isScreenSharing = true;
            updateScreenShareButton();
            socket.emit('start-screen-share', roomId, userId);

            // Replace video track in all peer connections
            Object.values(peers).forEach(peer => {
                const sender = peer.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenStream.getVideoTracks()[0]);
            });

            screenStream.getVideoTracks()[0].onended = stopScreenShare;
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    } else {
        stopScreenShare();
    }
}

// Stop screen sharing
function stopScreenShare() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
    isScreenSharing = false;
    updateScreenShareButton();
    socket.emit('stop-screen-share', roomId, userId);

    // Restore original camera feed
    localStream.getVideoTracks().forEach(track => {
        Object.values(peers).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track.kind === 'video');
            if (sender) sender.replaceTrack(track);
        });
    });
}

// Utility functions (Assumed to be implemented elsewhere)
function updateAudioButton() {
    // Logic to update audio button UI
}

function updateVideoButton() {
    // Logic to update video button UI
}

function updateScreenShareButton() {
    // Logic to update screen share button UI
}

function addMessageToChat(message) {
    // Logic to display chat messages
}

function updateParticipantsList(participants) {
    // Logic to update participants UI
}

function removeVideoElement(userId) {
    // Logic to remove user video element from the UI
}

function connectToNewUser(userId, username) {
    // Logic to establish WebRTC connection with new user
}

// Initialize call on page load
initializeCall();
