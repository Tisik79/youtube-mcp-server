# YouTube MCP Server

A Media Control Protocol (MCP) server for YouTube integration that allows you to control YouTube playback across multiple devices.

## Features

- Play, pause, and control YouTube videos from any device
- Synchronize playback across multiple clients
- Search YouTube videos directly from the interface
- Control volume and playback position
- Real-time updates using WebSockets
- Simple and intuitive user interface

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/Tisik79/youtube-mcp-server.git
   cd youtube-mcp-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file and add your YouTube API key:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ```

   You can obtain a YouTube API key from the [Google Cloud Console](https://console.cloud.google.com/):
   - Create a new project
   - Enable the YouTube Data API v3
   - Create API credentials (API Key)

## Usage

1. Start the server:
   ```
   npm start
   ```

2. For development with automatic restart:
   ```
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How it Works

The YouTube MCP Server provides a central control point for YouTube playback across multiple devices. It uses:

- **Express.js** for the HTTP server and API endpoints
- **Socket.io** for real-time communication between clients
- **YouTube Data API** for searching videos and fetching video information
- **YouTube IFrame API** for controlling video playback

When a client connects to the server:

1. They can search for videos using the search function
2. Play videos on their device
3. Control playback (play, pause, seek, volume)
4. All commands are broadcasted to other connected clients
5. Clients can sync with the current playback state

## API Endpoints

- `GET /api/video/:videoId` - Get video information
- `GET /api/search?q=query` - Search for YouTube videos
- `GET /api/clients` - Get a list of connected clients

## WebSocket Events

### Client to Server

- `play` - Play a video
- `pause` - Pause the current video
- `stop` - Stop playback
- `seek` - Seek to a specific position
- `volume` - Change volume
- `mute` - Mute/unmute audio
- `updateTimestamp` - Update the current playback position

### Server to Client

- `playerStateUpdate` - Broadcast player state updates to all clients

## Project Structure

```
youtube-mcp-server/
├── public/               # Client-side files
│   ├── index.html        # Main HTML file
│   ├── app.js            # Client-side JavaScript
│   └── styles.css        # CSS styles
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── .env                  # Environment variables (create from .env.example)
```

## Requirements

- Node.js (v14 or higher)
- npm (v6 or higher)
- A YouTube Data API key

## Customization

You can customize the server by:

1. Modifying the UI in the `public` directory
2. Adding additional API endpoints in `server.js`
3. Extending the Socket.io event handlers for more functionality

## Troubleshooting

Common issues:

- **API Key Error**: Ensure your YouTube API key is correctly set in the `.env` file
- **Connection Issues**: Make sure your firewall allows connections on the specified port
- **Video Playback Issues**: Some videos may have embedding disabled by the owner

## License

This project is licensed under the MIT License - see the LICENSE file for details.
