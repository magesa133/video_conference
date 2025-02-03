const participantsGrid = document.getElementById('participants-grid');
const roomIdInput = document.getElementById('room-id');
const joinButton = document.getElementById('join-button');
const generateLinkButton = document.getElementById('generate-link');
const meetingLinkContainer = document.getElementById('meeting-link-container');
const meetingLink = document.getElementById('meeting-link');
const toggleAudioButton = document.getElementById('toggle-audio');
const toggleVideoButton = document.getElementById('toggle-video');
const shareScreenButton = document.getElementById('share-screen');
const leaveMeetingButton = document.getElementById('leave-meeting');
const participantCountDisplay = document.getElementById('participant-count');

const socket = io();
const peerConnections = {};
let localStream;
let roomId;
let userId = Math.random().toString(36).substring(7); // Generate a random user ID
let participants = new Set(); // Track unique participants

// Get local media stream
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        addParticipant(userId, stream, true);
        stream.getTracks().forEach(track => {
            Object.values(peerConnections).forEach(pc => pc.addTrack(track, stream));
        });
    })
    .catch(error => {
        console.error('Error accessing media devices:', error);
    });

// Add a participant to the grid
function addParticipant(userId, stream, isLocal = false) {
    const participant = document.createElement('div');
    participant.className = 'participant';
    participant.id = `participant-${userId}`;

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = isLocal;

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = userId;

    participant.appendChild(video);
    participant.appendChild(name);
    participantsGrid.appendChild(participant);

    // Add participant to the set
    participants.add(userId);
    updateParticipantCount();

    // Detect active speaker
    if (!isLocal) {
        const audioContext = new AudioContext();
        const analyzer = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyzer);
        analyzer.fftSize = 256;
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const detectActiveSpeaker = () => {
            analyzer.getByteFrequencyData(dataArray);
            const volume = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            if (volume > 50) {
                participant.classList.add('active-speaker');
            } else {
                participant.classList.remove('active-speaker');
            }
            requestAnimationFrame(detectActiveSpeaker);
        };
        detectActiveSpeaker();
    }
}

// Remove a participant from the grid
function removeParticipant(userId) {
    const participant = document.getElementById(`participant-${userId}`);
    if (participant) {
        participant.remove();
    }

    // Remove participant from the set
    participants.delete(userId);
    updateParticipantCount();
}

// Update participant count
function updateParticipantCount() {
    participantCountDisplay.textContent = participants.size;
}

// Handle WebRTC signaling
socket.on('offer', (userId, offer) => {
    const pc = new RTCPeerConnection();
    peerConnections[userId] = pc;

    pc.setRemoteDescription(offer)
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
            socket.emit('answer', roomId, userId, pc.localDescription);
        });

    pc.ontrack = (event) => {
        addParticipant(userId, event.streams[0]);
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', roomId, userId, event.candidate);
        }
    };
});

socket.on('answer', (userId, answer) => {
    const pc = peerConnections[userId];
    if (pc) {
        pc.setRemoteDescription(answer);
    }
});

socket.on('ice-candidate', (userId, candidate) => {
    const pc = peerConnections[userId];
    if (pc) {
        pc.addIceCandidate(candidate);
    }
});

// Handle user connections
socket.on('user-connected', (userId) => {
    console.log(`User ${userId} connected`);
    const pc = new RTCPeerConnection();
    peerConnections[userId] = pc;

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', roomId, userId, event.candidate);
        }
    };

    pc.ontrack = (event) => {
        addParticipant(userId, event.streams[0]);
    };

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', roomId, userId, pc.localDescription);
        });
});

socket.on('user-disconnected', (userId) => {
    console.log(`User ${userId} disconnected`);
    const pc = peerConnections[userId];
    if (pc) {
        pc.close();
        delete peerConnections[userId];
    }
    removeParticipant(userId);
});

// Join a room
joinButton.addEventListener('click', () => {
    roomId = roomIdInput.value;
    if (roomId) {
        socket.emit('join-room', roomId, userId);
        roomIdInput.style.display = 'none';
        joinButton.style.display = 'none';
    }
});

// Generate meeting link
generateLinkButton.addEventListener('click', () => {
    roomId = Math.random().toString(36).substring(7);
    const link = `${window.location.origin}?room=${roomId}`;
    meetingLink.href = link;
    meetingLink.textContent = link;
    meetingLinkContainer.style.display = 'block';
    roomIdInput.value = roomId;
});

// Toolbar controls
toggleAudioButton.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    toggleAudioButton.textContent = audioTrack.enabled ? 'Mute' : 'Unmute';
});

toggleVideoButton.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    toggleVideoButton.textContent = videoTrack.enabled ? 'Stop Video' : 'Start Video';
});

shareScreenButton.addEventListener('click', () => {
    navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(stream => {
            const videoTrack = stream.getVideoTracks()[0];
            Object.values(peerConnections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
            localStream.addTrack(videoTrack);
        });
});

leaveMeetingButton.addEventListener('click', () => {
    window.location.reload();
});

// Generate meeting link
generateLinkButton.addEventListener('click', () => {
    roomId = Math.random().toString(36).substring(7);
    const link = `${window.location.origin}?room=${roomId}`;
    meetingLink.href = link;
    meetingLink.textContent = link;
    meetingLinkContainer.style.display = 'block';
    roomIdInput.value = roomId;
});

// Toolbar controls
toggleAudioButton.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    toggleAudioButton.textContent = audioTrack.enabled ? 'Mute' : 'Unmute';
});

toggleVideoButton.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    toggleVideoButton.textContent = videoTrack.enabled ? 'Stop Video' : 'Start Video';
});

shareScreenButton.addEventListener('click', () => {
    navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(stream => {
            const videoTrack = stream.getVideoTracks()[0];
            Object.values(peerConnections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
            localStream.addTrack(videoTrack);
        });
});

leaveMeetingButton.addEventListener('click', () => {
    window.location.reload();
});