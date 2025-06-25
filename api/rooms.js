// REST API endpoints for room management

const rooms = new Map() // This should be shared with socket.js in production

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  const { method, query } = req

  try {
    switch (method) {
      case "GET":
        if (query.roomCode) {
          // Get specific room info
          const room = rooms.get(query.roomCode.toUpperCase())
          if (!room) {
            return res.status(404).json({ error: "Room not found" })
          }

          res.json({
            roomCode: room.code,
            playerCount: room.players.length,
            maxPlayers: 4,
            gameState: room.gameState,
            players: room.players.map((p) => ({
              name: p.name,
              isHost: p.isHost,
              ready: p.ready,
            })),
            createdAt: room.createdAt,
          })
        } else {
          // Get all rooms (for debugging)
          const roomList = Array.from(rooms.values()).map((room) => ({
            roomCode: room.code,
            playerCount: room.players.length,
            gameState: room.gameState,
            createdAt: room.createdAt,
          }))

          res.json({
            totalRooms: rooms.size,
            rooms: roomList,
          })
        }
        break

      case "POST":
        // Validate room code
        if (!req.body) {
          return res.status(400).json({ error: "Request body required" })
        }

        const { roomCode } = req.body
        if (!roomCode || roomCode.length !== 4) {
          return res.status(400).json({ error: "Invalid room code format" })
        }

        const room = rooms.get(roomCode.toUpperCase())
        if (!room) {
          return res.status(404).json({
            error: "Room not found",
            exists: false,
          })
        }

        if (room.players.length >= 4) {
          return res.status(400).json({
            error: "Room is full",
            exists: true,
            full: true,
          })
        }

        res.json({
          exists: true,
          full: false,
          roomCode: room.code,
          playerCount: room.players.length,
          gameState: room.gameState,
        })
        break

      default:
        res.setHeader("Allow", ["GET", "POST"])
        res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error("API Error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
