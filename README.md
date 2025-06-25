# VL Imposter 2 Backend

A Node.js backend for the VL Imposter 2 multiplayer bluffing game, built with Express.js and Socket.IO, designed to run on Vercel.

## Features

- **Real-time multiplayer** using Socket.IO
- **Room-based gameplay** with 4-character room codes
- **Automatic game flow** with timed phases
- **Role assignment** (3 normal players + 1 imposter)
- **Chat system** during discussion phase
- **Voting mechanism** with result calculation
- **Admin commands** for debugging and management
- **Vercel-compatible** serverless architecture

## API Endpoints

### Socket.IO Events

#### Client → Server
- `createRoom` - Create a new game room
- `joinRoom` - Join an existing room
- `toggleReady` - Toggle player ready status
- `startGame` - Start the game (host only)
- `submitAnswer` - Submit answer during answer phase
- `sendChatMessage` - Send chat message during discussion
- `castVote` - Vote for a player during voting phase
- `adminReset` - Reset game (admin only)
- `adminStart` - Force start game (admin only)

#### Server → Client
- `roomCreated` - Room creation confirmation
- `roomJoined` - Room join confirmation
- `playerJoined` - New player joined notification
- `playerLeft` - Player left notification
- `playerReadyChanged` - Player ready status changed
- `gameStarted` - Game started with question assignment
- `timerUpdate` - Timer countdown updates
- `chatPhaseStarted` - Discussion phase started with answers
- `chatMessage` - Chat message from another player
- `votingPhaseStarted` - Voting phase started
- `voteUpdate` - Vote count update
- `gameResults` - Final game results
- `gameReset` - Game reset notification
- `error` - Error messages

### REST API

#### GET /api/health
Health check endpoint
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "version": "1.0.0"
}
\`\`\`

#### GET /api/rooms
Get all rooms or specific room info
\`\`\`bash
# Get all rooms
GET /api/rooms

# Get specific room
GET /api/rooms?roomCode=ABCD
\`\`\`

#### POST /api/rooms
Validate room code
\`\`\`json
{
  "roomCode": "ABCD"
}
\`\`\`

#### Admin Endpoints (require X-Admin-Key header)

#### GET /api/admin
Get detailed room information and server stats

#### POST /api/admin
Admin actions (reset room, broadcast message)

#### DELETE /api/admin
Delete rooms or cleanup old rooms

## Game Flow

1. **Lobby Phase**
   - Players join room with 4-character code
   - Host can start when all 4 players are ready

2. **Answer Phase** (10 seconds)
   - 3 players get the same question
   - 1 imposter gets a different question
   - All players submit answers privately

3. **Discussion Phase** (120 seconds)
   - All answers are revealed with player names
   - Players can chat to discuss suspicious answers

4. **Voting Phase** (60 seconds)
   - Players vote for who they think is the imposter
   - Cannot vote for themselves

5. **Results Phase**
   - Player with most votes is eliminated
   - Game reveals if imposter was caught
   - Auto-reset after 30 seconds

## Environment Variables

\`\`\`bash
NODE_ENV=production
ADMIN_KEY=your-secret-admin-key  # Optional: Override default admin key
\`\`\`

## Local Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Or run with Node.js directly
node server.js
\`\`\`

The server will start on `http://localhost:3001`

## Deployment to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`

The backend will be available at your Vercel domain with these endpoints:
- `https://your-app.vercel.app/api/health`
- `https://your-app.vercel.app/api/rooms`
- `https://your-app.vercel.app/api/admin`
- Socket.IO: `https://your-app.vercel.app/api/socket`

## Frontend Integration

Update your frontend to connect to the backend:

\`\`\`javascript
import io from 'socket.io-client'

const socket = io('https://your-backend.vercel.app', {
  path: '/api/socket',
  transports: ['websocket', 'polling']
})

// Create room
socket.emit('createRoom', { playerName: 'Alice' })

// Join room
socket.emit('joinRoom', { roomCode: 'ABCD', playerName: 'Bob' })

// Listen for events
socket.on('roomCreated', (data) => {
  console.log('Room created:', data.roomCode)
})
\`\`\`

## Admin Commands

Use the admin key `admin123` (change in production):

\`\`\`bash
# Get server stats
curl -H "X-Admin-Key: admin123" https://your-app.vercel.app/api/admin?action=stats

# Reset a room
curl -X POST -H "X-Admin-Key: admin123" -H "Content-Type: application/json" \
  -d '{"action":"reset","roomCode":"ABCD"}' \
  https://your-app.vercel.app/api/admin

# Cleanup old rooms
curl -X DELETE -H "X-Admin-Key: admin123" \
  https://your-app.vercel.app/api/admin?action=cleanup
\`\`\`

## Security Notes

- Change the default admin key in production
- Implement rate limiting for production use
- Add input validation and sanitization
- Consider using Redis for room storage in production
- Add proper error handling and logging

## Troubleshooting

### Socket.IO Connection Issues
- Ensure CORS is properly configured
- Check that the path `/api/socket` is correct
- Verify WebSocket support on your hosting platform

### Room State Issues
- Rooms are stored in memory and will reset on server restart
- Use Redis or a database for persistent storage in production

### Timer Issues
- Timers are cleared on server restart
- Consider using a job queue for production

## License

MIT License - see LICENSE file for details
