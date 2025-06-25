// Admin endpoints for debugging and management

const rooms = new Map() // This should be shared with socket.js in production

function isValidAdminKey(key) {
  return key === "admin123" // In production, use environment variables
}

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  // Check admin authentication
  const adminKey = req.headers["x-admin-key"] || req.body?.adminKey || req.query.adminKey
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ error: "Invalid admin key" })
  }

  const { method, query } = req

  try {
    switch (method) {
      case "GET":
        if (query.action === "stats") {
          // Get server statistics
          const stats = {
            totalRooms: rooms.size,
            totalPlayers: Array.from(rooms.values()).reduce((sum, room) => sum + room.players.length, 0),
            gameStates: {},
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
          }

          // Count rooms by game state
          Array.from(rooms.values()).forEach((room) => {
            stats.gameStates[room.gameState] = (stats.gameStates[room.gameState] || 0) + 1
          })

          res.json(stats)
        } else {
          // Get detailed room information
          const detailedRooms = Array.from(rooms.values()).map((room) => ({
            roomCode: room.code,
            playerCount: room.players.length,
            gameState: room.gameState,
            timer: room.timer,
            players: room.players.map((p) => ({
              name: p.name,
              isHost: p.isHost,
              ready: p.ready,
              isImposter: p.isImposter,
              hasAnswered: p.hasAnswered,
              hasVoted: p.hasVoted,
            })),
            createdAt: room.createdAt,
            currentQuestion: room.currentQuestion,
            imposterQuestion: room.imposterQuestion,
          }))

          res.json({
            totalRooms: rooms.size,
            rooms: detailedRooms,
          })
        }
        break

      case "POST":
        const { action, roomCode } = req.body

        if (action === "reset" && roomCode) {
          // Reset specific room
          const room = rooms.get(roomCode.toUpperCase())
          if (!room) {
            return res.status(404).json({ error: "Room not found" })
          }

          // Reset room state (this would need to integrate with Socket.IO)
          console.log(`🔧 Admin reset room ${roomCode}`)
          res.json({ success: true, message: `Room ${roomCode} reset` })
        } else if (action === "broadcast") {
          // Broadcast message to all rooms (would need Socket.IO integration)
          const { message } = req.body
          console.log(`📢 Admin broadcast: ${message}`)
          res.json({ success: true, message: "Broadcast sent" })
        } else {
          res.status(400).json({ error: "Invalid action or missing parameters" })
        }
        break

      case "DELETE":
        if (query.roomCode) {
          // Delete specific room
          const roomCode = query.roomCode.toUpperCase()
          if (rooms.has(roomCode)) {
            const room = rooms.get(roomCode)
            if (room.timerInterval) {
              clearInterval(room.timerInterval)
            }
            rooms.delete(roomCode)
            console.log(`🗑️ Admin deleted room ${roomCode}`)
            res.json({ success: true, message: `Room ${roomCode} deleted` })
          } else {
            res.status(404).json({ error: "Room not found" })
          }
        } else if (query.action === "cleanup") {
          // Clean up old/empty rooms
          let deletedCount = 0
          const now = Date.now()
          const maxAge = 2 * 60 * 60 * 1000 // 2 hours

          for (const [roomCode, room] of rooms.entries()) {
            if (room.players.length === 0 || now - room.createdAt > maxAge) {
              if (room.timerInterval) {
                clearInterval(room.timerInterval)
              }
              rooms.delete(roomCode)
              deletedCount++
            }
          }

          console.log(`🧹 Admin cleanup: ${deletedCount} rooms deleted`)
          res.json({ success: true, message: `${deletedCount} rooms cleaned up` })
        } else {
          res.status(400).json({ error: "Room code or cleanup action required" })
        }
        break

      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"])
        res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error("Admin API Error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
