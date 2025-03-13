const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// YouTube API setup
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// Store active connections and their associated player states
const clients = new Map();

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Initialize client state
  clients.set(socket.id, {
    videoId: null,
    state: 'stopped',
    timestamp: 0,
    volume: 100,
    muted: false
  });

  // Handle play command
  socket.on('play', (data) => {
    const clientState = clients.get(socket.id);
    if (clientState) {
      clientState.state = 'playing';
      clientState.videoId = data.videoId || clientState.videoId;
      clientState.timestamp = data.timestamp || clientState.timestamp;
      
      // Broadcast update to clients
      io.emit('playerStateUpdate', {
        clientId: socket.id,
        state: clientState
      });
      
      console.log(`Client ${socket.id} playing: ${clientState.videoId} at ${clientState.timestamp}`);
    }
  });

  // Handle pause command
  socket.on('pause', (data) => {
    const clientState = clients.get(socket.id);
    if (clientState) {
      clientState.state = 'paused';
      clientState.timestamp = data.timestamp || clientState.timestamp;
      
      // Broadcast update to clients
      io.emit('playerStateUpdate', {
        clientId: socket.id,
        state: clientState
      });
      
      console.log(`Client ${socket.id} paused at ${clientState.timestamp}`);
    }
  });

  // Handle stop command
  socket.on('stop', () => {
    const clientState = clients.get(socket.id);
    if (clientState) {
      clientState.state = 'stopped';
      clientState.timestamp = 0;
      
      // Broadcast update to clients
      io.emit('playerStateUpdate', {
        clientId: socket.id,
        state: clientState
      });
      
      console.log(`Client ${socket.id} stopped`);
    }
  });

  // Handle seek command
  socket.on('seek', (data) => {
    const clientState = clients.get(socket.id);
    if (clientState && data.timestamp !== undefined) {
      clientState.timestamp = data.timestamp;
      
      // Broadcast update to clients
      io.emit('playerStateUpdate', {
        clientId: socket.id,
        state: clientState
      });
      
      console.log(`Client ${socket.id} seeked to ${clientState.timestamp}`);
    }
  });

  // Handle volume control
  socket.on('volume', (data) => {
    const clientState = clients.get(socket.id);
    if (clientState && data.volume !== undefined) {
      clientState.volume = data.volume;
      
      // Broadcast update to clients
      io.emit('playerStateUpdate', {
        clientId: socket.id,
        state: clientState
      });
      
      console.log(`Client ${socket.id} volume set to ${clientState.volume}`);
    }
  });

  // Handle mute/unmute
  socket.on('mute', (data) => {
    const clientState = clients.get(socket.id);
    if (clientState && data.muted !== undefined) {
      clientState.muted = data.muted;
      
      // Broadcast update to clients
      io.emit('playerStateUpdate', {
        clientId: socket.id,
        state: clientState
      });
      
      console.log(`Client ${socket.id} muted: ${clientState.muted}`);
    }
  });

  // Handle timestamp updates (for synchronization)
  socket.on('updateTimestamp', (data) => {
    const clientState = clients.get(socket.id);
    if (clientState && data.timestamp !== undefined) {
      clientState.timestamp = data.timestamp;
    }
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    clients.delete(socket.id);
  });
});

// API Routes
// Get video information
app.get('/api/video/:videoId', async (req, res) => {
  try {
    const response = await youtube.videos.list({
      part: 'snippet,contentDetails',
      id: req.params.videoId
    });
    
    if (response.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const videoData = response.data.items[0];
    res.json({
      id: videoData.id,
      title: videoData.snippet.title,
      description: videoData.snippet.description,
      thumbnail: videoData.snippet.thumbnails.high.url,
      duration: videoData.contentDetails.duration,
      channelTitle: videoData.snippet.channelTitle
    });
  } catch (error) {
    console.error('Error fetching video data:', error);
    res.status(500).json({ error: 'Error fetching video data' });
  }
});

// Search YouTube videos
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const response = await youtube.search.list({
      part: 'snippet',
      q: query,
      maxResults: 10,
      type: 'video'
    });
    
    const results = response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt
    }));
    
    res.json(results);
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ error: 'Error searching videos' });
  }
});

// Get active clients
app.get('/api/clients', (req, res) => {
  const clientList = Array.from(clients.entries()).map(([id, state]) => ({
    id,
    state
  }));
  
  res.json(clientList);
});

// Static files
app.use(express.static('public'));

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`YouTube MCP Server running on port ${PORT}`);
});