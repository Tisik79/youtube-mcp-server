// Connect to Socket.io server
const socket = io();

// YouTube Player
let player;
let currentVideoId = null;
let playerState = {
    videoId: null,
    state: 'stopped',
    timestamp: 0,
    volume: 100,
    muted: false
};

// Initialize YouTube API when ready
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'rel': 0,
            'showinfo': 0,
            'modestbranding': 1,
            'enablejsapi': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// When YouTube player is ready
function onPlayerReady(event) {
    console.log('Player ready');
    
    // Set up event listeners for buttons
    document.getElementById('play-btn').addEventListener('click', playVideo);
    document.getElementById('pause-btn').addEventListener('click', pauseVideo);
    document.getElementById('stop-btn').addEventListener('click', stopVideo);
    document.getElementById('mute-btn').addEventListener('click', toggleMute);
    document.getElementById('volume-slider').addEventListener('input', changeVolume);
    document.getElementById('search-btn').addEventListener('click', searchVideos);
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchVideos();
        }
    });
    
    // Set up progress bar
    setInterval(updateProgressBar, 1000);
}

// When YouTube player state changes
function onPlayerStateChange(event) {
    switch (event.data) {
        case YT.PlayerState.PLAYING:
            playerState.state = 'playing';
            playerState.timestamp = player.getCurrentTime();
            socket.emit('play', { 
                videoId: currentVideoId, 
                timestamp: playerState.timestamp 
            });
            break;
            
        case YT.PlayerState.PAUSED:
            playerState.state = 'paused';
            playerState.timestamp = player.getCurrentTime();
            socket.emit('pause', { timestamp: playerState.timestamp });
            break;
            
        case YT.PlayerState.ENDED:
            playerState.state = 'stopped';
            playerState.timestamp = 0;
            socket.emit('stop');
            break;
    }
}

// Control functions
function playVideo() {
    if (currentVideoId) {
        player.playVideo();
    } else {
        alert('Please select a video first.');
    }
}

function pauseVideo() {
    player.pauseVideo();
}

function stopVideo() {
    player.stopVideo();
    player.seekTo(0);
    playerState.timestamp = 0;
    socket.emit('stop');
    document.getElementById('current-time').textContent = formatTime(0);
    document.getElementById('progress-bar').style.width = '0%';
}

function loadVideo(videoId, timestamp = 0) {
    currentVideoId = videoId;
    playerState.videoId = videoId;
    
    // Get video details
    fetch(`/api/video/${videoId}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('video-title').textContent = data.title;
        })
        .catch(error => {
            console.error('Error fetching video data:', error);
        });
    
    player.loadVideoById({
        videoId: videoId,
        startSeconds: timestamp
    });
    
    // Update player state
    playerState.timestamp = timestamp;
    socket.emit('play', { videoId, timestamp });
}

function toggleMute() {
    const muteBtn = document.getElementById('mute-btn');
    
    if (player.isMuted()) {
        player.unMute();
        muteBtn.textContent = '🔊';
        playerState.muted = false;
    } else {
        player.mute();
        muteBtn.textContent = '🔇';
        playerState.muted = true;
    }
    
    socket.emit('mute', { muted: playerState.muted });
}

function changeVolume() {
    const volume = parseInt(document.getElementById('volume-slider').value);
    player.setVolume(volume);
    playerState.volume = volume;
    socket.emit('volume', { volume });
}

function updateProgressBar() {
    if (player && player.getCurrentTime && playerState.state === 'playing') {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progress = (currentTime / duration) * 100;
        
        document.getElementById('progress-bar').style.width = `${progress}%`;
        document.getElementById('current-time').textContent = formatTime(currentTime);
        document.getElementById('duration').textContent = formatTime(duration);
        
        // Send timestamp updates every few seconds
        playerState.timestamp = currentTime;
        socket.emit('updateTimestamp', { timestamp: currentTime });
    }
}

// Format seconds to MM:SS
function formatTime(seconds) {
    seconds = Math.round(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Search for videos
function searchVideos() {
    const query = document.getElementById('search-input').value.trim();
    
    if (!query) return;
    
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(results => {
            searchResults.innerHTML = '';
            
            if (results.length === 0) {
                searchResults.innerHTML = '<p class="text-center">No results found</p>';
                return;
            }
            
            results.forEach(video => {
                const videoItem = document.createElement('a');
                videoItem.href = '#';
                videoItem.className = 'list-group-item list-group-item-action video-item d-flex align-items-center';
                videoItem.innerHTML = `
                    <img src="${video.thumbnail}" alt="${video.title}" class="me-2">
                    <div>
                        <div class="video-item-title fw-bold">${video.title}</div>
                        <small class="text-muted">${video.channelTitle}</small>
                    </div>
                `;
                
                videoItem.addEventListener('click', function(e) {
                    e.preventDefault();
                    loadVideo(video.id);
                });
                
                searchResults.appendChild(videoItem);
            });
        })
        .catch(error => {
            console.error('Error searching videos:', error);
            searchResults.innerHTML = '<p class="text-center text-danger">Error searching videos</p>';
        });
}

// Update the client list
function updateClientList(clients) {
    const clientList = document.getElementById('client-list');
    clientList.innerHTML = '';
    
    clients.forEach(client => {
        const clientItem = document.createElement('li');
        clientItem.className = `list-group-item d-flex justify-content-between align-items-center client-item ${client.id === socket.id ? 'active' : ''}`;
        
        let statusText = 'Idle';
        let statusBadge = 'bg-secondary';
        
        if (client.state.state === 'playing') {
            statusText = 'Playing';
            statusBadge = 'bg-success';
        } else if (client.state.state === 'paused') {
            statusText = 'Paused';
            statusBadge = 'bg-warning';
        }
        
        clientItem.innerHTML = `
            <div>
                <div>${client.id === socket.id ? 'You' : 'Client ' + client.id.substring(0, 4)}</div>
                ${client.state.videoId ? `<small class="text-muted">Video: ${client.state.videoId}</small>` : ''}
            </div>
            <span class="badge ${statusBadge}">${statusText}</span>
        `;
        
        clientList.appendChild(clientItem);
    });
}

// Socket.io event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('playerStateUpdate', (data) => {
    // If the update is for another client, update the client list
    fetch('/api/clients')
        .then(response => response.json())
        .then(clients => {
            updateClientList(clients);
        });
    
    // If the update is for this client, ignore it (we already have the local state)
    if (data.clientId === socket.id) return;
    
    // If this is the first client, and we don't have a video loaded yet,
    // we can sync with the other client
    if (!currentVideoId && data.state.videoId) {
        loadVideo(data.state.videoId, data.state.timestamp);
        
        if (data.state.state === 'paused') {
            setTimeout(() => {
                player.pauseVideo();
            }, 1000);
        }
        
        player.setVolume(data.state.volume);
        if (data.state.muted) {
            player.mute();
            document.getElementById('mute-btn').textContent = '🔇';
        }
        
        document.getElementById('volume-slider').value = data.state.volume;
    }
});

// Initialize client list
fetch('/api/clients')
    .then(response => response.json())
    .then(clients => {
        updateClientList(clients);
    });
