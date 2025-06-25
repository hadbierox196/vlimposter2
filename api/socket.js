const { Server } = require("socket.io")
const { createServer } = require("http")

// Game state storage (in-memory for this implementation)
const rooms = new Map()
const playerSockets = new Map() // socketId -> player info

// Question sets for the game
const questionSets = [
  {
    normal: "What's your favorite color?",
    imposter: "What's your favorite animal?",
  },
  {
    normal: "What's your dream vacation destination?",
    imposter: "What's your favorite food?",
  },
  {
    normal: "What's your favorite movie genre?",
    imposter: "What's your favorite season?",
  },
  {
    normal: "What's your favorite hobby?",
    imposter: "What's your favorite drink?",
  },
  {
    normal: "What's your ideal weekend activity?",
    imposter: "What's your favorite book?",
  },
  {
    normal: "What's your favorite type of music?",
    imposter: "What's your favorite sport?",
  },
  {
    normal: "What's your favorite time of day?",
    imposter: "What's your favorite weather?",
  },
]

// Utility functions
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function createRoom(roomCode, hostSocketId, hostName) {
  const room = {
    code: roomCode,
    hostSocketId,
    players: [
      {
        socketId: hostSocketId,
        name: hostName,
        isHost: true,
        ready: false,
        isImposter: false,
        question: "",
        answer: "",
        hasAnswered: false,
        votes: 0,
        votedFor: null,
        hasVoted: false,
      },
    ],
    gameState: "lobby", // lobby, answering, chatting, voting, results, finished
    currentQuestion: null,
    imposterQuestion: null,
    timer: 0,
    timerInterval: null,
    answers: {},
    votes: {},
    eliminatedPlayer: null,
    imposterCaught: false,
    createdAt: Date.now(),
  }

  rooms.set(roomCode, room)
  console.log(`🏠 Room ${roomCode} created by ${hostName}`)
  return room
}

function addPlayerToRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode)
  if (!room) return null

  if (room.players.length >= 4) {
    return { error: "Room is full" }
  }

  // Check if player name already exists in room
  if (room.players.some((p) => p.name === playerName)) {
    return { error: "Player name already taken in this room" }
  }

  const player = {
    socketId,
    name: playerName,
    isHost: false,
    ready: false,
    isImposter: false,
    question: "",
    answer: "",
    hasAnswered: false,
    votes: 0,
    votedFor: null,
    hasVoted: false,
  }

  room.players.push(player)
  console.log(`👤 ${playerName} joined room ${roomCode} (${room.players.length}/4)`)

  return room
}

function removePlayerFromRoom(socketId) {
  const playerInfo = playerSockets.get(socketId)
  if (!playerInfo) return null

  const room = rooms.get(playerInfo.roomCode)
  if (!room) return null

  // Remove player from room
  room.players = room.players.filter((p) => p.socketId !== socketId)

  console.log(`👋 ${playerInfo.name} left room ${playerInfo.roomCode}`)

  // If room is empty, delete it
  if (room.players.length === 0) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval)
    }
    rooms.delete(playerInfo.roomCode)
    console.log(`🗑️ Room ${playerInfo.roomCode} deleted (empty)`)
    return null
  }

  // If host left, assign new host
  if (playerInfo.isHost && room.players.length > 0) {
    room.players[0].isHost = true
    room.hostSocketId = room.players[0].socketId
    console.log(`👑 ${room.players[0].name} is now host of room ${playerInfo.roomCode}`)
  }

  return room
}

function startGame(roomCode, io) {
  const room = rooms.get(roomCode)
  if (!room || room.players.length !== 4) return false

  console.log(`🎮 Starting game in room ${roomCode}`)

  // Assign roles and questions
  const questionSet = questionSets[Math.floor(Math.random() * questionSets.length)]
  const imposterIndex = Math.floor(Math.random() * 4)

  room.currentQuestion = questionSet.normal
  room.imposterQuestion = questionSet.imposter
  room.gameState = "answering"
  room.timer = 10

  // Assign questions to players
  room.players.forEach((player, index) => {
    player.isImposter = index === imposterIndex
    player.question = player.isImposter ? questionSet.imposter : questionSet.normal
    player.hasAnswered = false
    player.answer = ""
  })

  console.log(`❓ Question assigned: "${questionSet.normal}" (Imposter: "${questionSet.imposter}")`)
  console.log(`🎭 Imposter is: ${room.players[imposterIndex].name}`)

  // Send game start to all players
  room.players.forEach((player) => {
    io.to(player.socketId).emit("gameStarted", {
      question: player.question,
      isImposter: player.isImposter,
      phase: "answering",
      timer: 10,
    })
  })

  // Start answer timer
  startAnswerTimer(roomCode, io)

  return true
}

function startAnswerTimer(roomCode, io) {
  const room = rooms.get(roomCode)
  if (!room) return

  console.log(`⏰ Starting answer timer for room ${roomCode}`)

  room.timerInterval = setInterval(() => {
    room.timer--

    // Broadcast timer update
    io.to(roomCode).emit("timerUpdate", {
      timer: room.timer,
      phase: "answering",
    })

    if (room.timer <= 0) {
      clearInterval(room.timerInterval)
      startChatPhase(roomCode, io)
    }
  }, 1000)
}

function startChatPhase(roomCode, io) {
  const room = rooms.get(roomCode)
  if (!room) return

  console.log(`💬 Starting chat phase for room ${roomCode}`)

  room.gameState = "chatting"
  room.timer = 120

  // Collect all answers
  const answers = {}
  room.players.forEach((player) => {
    answers[player.name] = player.answer || "No answer provided"
  })

  // Send answers and start chat phase
  io.to(roomCode).emit("chatPhaseStarted", {
    answers,
    timer: 120,
    phase: "chatting",
  })

  // Start chat timer
  room.timerInterval = setInterval(() => {
    room.timer--

    io.to(roomCode).emit("timerUpdate", {
      timer: room.timer,
      phase: "chatting",
    })

    if (room.timer <= 0) {
      clearInterval(room.timerInterval)
      startVotingPhase(roomCode, io)
    }
  }, 1000)
}

function startVotingPhase(roomCode, io) {
  const room = rooms.get(roomCode)
  if (!room) return

  console.log(`🗳️ Starting voting phase for room ${roomCode}`)

  room.gameState = "voting"
  room.timer = 60

  // Reset voting data
  room.players.forEach((player) => {
    player.hasVoted = false
    player.votedFor = null
    player.votes = 0
  })

  const playerData = room.players.map((p) => ({
    name: p.name,
    answer: p.answer || "No answer provided",
  }))

  io.to(roomCode).emit("votingPhaseStarted", {
    players: playerData,
    timer: 60,
    phase: "voting",
  })

  // Start voting timer
  room.timerInterval = setInterval(() => {
    room.timer--

    io.to(roomCode).emit("timerUpdate", {
      timer: room.timer,
      phase: "voting",
    })

    if (room.timer <= 0 || room.players.every((p) => p.hasVoted)) {
      clearInterval(room.timerInterval)
      calculateResults(roomCode, io)
    }
  }, 1000)
}

function calculateResults(roomCode, io) {
  const room = rooms.get(roomCode)
  if (!room) return

  console.log(`📊 Calculating results for room ${roomCode}`)

  room.gameState = "results"

  // Count votes
  const voteCounts = {}
  const voteDetails = {}

  room.players.forEach((player) => {
    if (player.votedFor) {
      voteCounts[player.votedFor] = (voteCounts[player.votedFor] || 0) + 1
      voteDetails[player.name] = player.votedFor
    }
  })

  // Find player with most votes
  let eliminatedPlayer = null
  let maxVotes = 0

  Object.entries(voteCounts).forEach(([playerName, votes]) => {
    if (votes > maxVotes) {
      maxVotes = votes
      eliminatedPlayer = playerName
    }
  })

  // Check if imposter was caught
  const imposter = room.players.find((p) => p.isImposter)
  const imposterCaught = eliminatedPlayer === imposter?.name

  room.eliminatedPlayer = eliminatedPlayer
  room.imposterCaught = imposterCaught

  console.log(`🎯 Results: ${eliminatedPlayer} eliminated (${maxVotes} votes)`)
  console.log(`🎭 Imposter was: ${imposter?.name}`)
  console.log(`✅ Imposter caught: ${imposterCaught}`)

  // Send results
  io.to(roomCode).emit("gameResults", {
    eliminatedPlayer,
    imposterName: imposter?.name,
    imposterCaught,
    voteDetails,
    voteCounts,
    phase: "results",
  })

  // Auto-reset game after 30 seconds
  setTimeout(() => {
    resetGame(roomCode, io)
  }, 30000)
}

function resetGame(roomCode, io) {
  const room = rooms.get(roomCode)
  if (!room) return

  console.log(`🔄 Resetting game in room ${roomCode}`)

  room.gameState = "lobby"
  room.timer = 0
  room.currentQuestion = null
  room.imposterQuestion = null
  room.eliminatedPlayer = null
  room.imposterCaught = false

  if (room.timerInterval) {
    clearInterval(room.timerInterval)
    room.timerInterval = null
  }

  // Reset all players
  room.players.forEach((player) => {
    player.ready = false
    player.isImposter = false
    player.question = ""
    player.answer = ""
    player.hasAnswered = false
    player.votes = 0
    player.votedFor = null
    player.hasVoted = false
  })

  io.to(roomCode).emit("gameReset", {
    message: "Game has been reset. Get ready for another round!",
  })
}

// Socket.IO handler
function handleSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`)

    // Create room
    socket.on("createRoom", (data) => {
      const { playerName } = data

      if (!playerName || playerName.trim().length === 0) {
        socket.emit("error", { message: "Player name is required" })
        return
      }

      let roomCode
      do {
        roomCode = generateRoomCode()
      } while (rooms.has(roomCode))

      const room = createRoom(roomCode, socket.id, playerName.trim())

      // Store player info
      playerSockets.set(socket.id, {
        name: playerName.trim(),
        roomCode,
        isHost: true,
      })

      // Join socket room
      socket.join(roomCode)

      socket.emit("roomCreated", {
        roomCode,
        isHost: true,
        players: room.players.map((p) => ({
          name: p.name,
          isHost: p.isHost,
          ready: p.ready,
        })),
      })
    })

    // Join room
    socket.on("joinRoom", (data) => {
      const { roomCode, playerName } = data

      if (!roomCode || !playerName) {
        socket.emit("error", { message: "Room code and player name are required" })
        return
      }

      const result = addPlayerToRoom(roomCode.toUpperCase(), socket.id, playerName.trim())

      if (!result) {
        socket.emit("error", { message: "Room not found" })
        return
      }

      if (result.error) {
        socket.emit("error", { message: result.error })
        return
      }

      // Store player info
      playerSockets.set(socket.id, {
        name: playerName.trim(),
        roomCode: roomCode.toUpperCase(),
        isHost: false,
      })

      // Join socket room
      socket.join(roomCode.toUpperCase())

      const room = result

      // Notify all players in room
      io.to(roomCode.toUpperCase()).emit("playerJoined", {
        players: room.players.map((p) => ({
          name: p.name,
          isHost: p.isHost,
          ready: p.ready,
        })),
        newPlayer: playerName.trim(),
      })

      socket.emit("roomJoined", {
        roomCode: roomCode.toUpperCase(),
        isHost: false,
        players: room.players.map((p) => ({
          name: p.name,
          isHost: p.isHost,
          ready: p.ready,
        })),
      })

      // Auto-start game if 4 players
      if (room.players.length === 4) {
        setTimeout(() => {
          startGame(roomCode.toUpperCase(), io)
        }, 2000)
      }
    })

    // Toggle ready status
    socket.on("toggleReady", () => {
      const playerInfo = playerSockets.get(socket.id)
      if (!playerInfo) return

      const room = rooms.get(playerInfo.roomCode)
      if (!room) return

      const player = room.players.find((p) => p.socketId === socket.id)
      if (!player) return

      player.ready = !player.ready

      console.log(`${player.ready ? "✅" : "❌"} ${player.name} is ${player.ready ? "ready" : "not ready"}`)

      io.to(playerInfo.roomCode).emit("playerReadyChanged", {
        playerName: player.name,
        ready: player.ready,
        players: room.players.map((p) => ({
          name: p.name,
          isHost: p.isHost,
          ready: p.ready,
        })),
      })
    })

    // Start game (host only)
    socket.on("startGame", () => {
      const playerInfo = playerSockets.get(socket.id)
      if (!playerInfo || !playerInfo.isHost) {
        socket.emit("error", { message: "Only host can start the game" })
        return
      }

      const room = rooms.get(playerInfo.roomCode)
      if (!room) return

      if (room.players.length !== 4) {
        socket.emit("error", { message: "Need exactly 4 players to start" })
        return
      }

      if (!room.players.every((p) => p.ready)) {
        socket.emit("error", { message: "All players must be ready" })
        return
      }

      startGame(playerInfo.roomCode, io)
    })

    // Submit answer
    socket.on("submitAnswer", (data) => {
      const { answer } = data
      const playerInfo = playerSockets.get(socket.id)
      if (!playerInfo) return

      const room = rooms.get(playerInfo.roomCode)
      if (!room || room.gameState !== "answering") return

      const player = room.players.find((p) => p.socketId === socket.id)
      if (!player || player.hasAnswered) return

      player.answer = answer.trim()
      player.hasAnswered = true

      console.log(`💭 ${player.name} answered: "${answer.trim()}"`)

      socket.emit("answerSubmitted", { success: true })

      // Check if all players have answered
      if (room.players.every((p) => p.hasAnswered)) {
        clearInterval(room.timerInterval)
        startChatPhase(playerInfo.roomCode, io)
      }
    })

    // Send chat message
    socket.on("sendChatMessage", (data) => {
      const { message } = data
      const playerInfo = playerSockets.get(socket.id)
      if (!playerInfo) return

      const room = rooms.get(playerInfo.roomCode)
      if (!room || room.gameState !== "chatting") return

      console.log(`💬 ${playerInfo.name}: ${message}`)

      io.to(playerInfo.roomCode).emit("chatMessage", {
        playerName: playerInfo.name,
        message: message.trim(),
        timestamp: Date.now(),
      })
    })

    // Cast vote
    socket.on("castVote", (data) => {
      const { votedFor } = data
      const playerInfo = playerSockets.get(socket.id)
      if (!playerInfo) return

      const room = rooms.get(playerInfo.roomCode)
      if (!room || room.gameState !== "voting") return

      const player = room.players.find((p) => p.socketId === socket.id)
      if (!player || player.hasVoted) return

      // Can't vote for yourself
      if (votedFor === player.name) {
        socket.emit("error", { message: "You cannot vote for yourself" })
        return
      }

      // Check if voted player exists
      if (!room.players.some((p) => p.name === votedFor)) {
        socket.emit("error", { message: "Invalid player name" })
        return
      }

      player.votedFor = votedFor
      player.hasVoted = true

      console.log(`🗳️ ${player.name} voted for ${votedFor}`)

      socket.emit("voteSubmitted", { success: true, votedFor })

      // Notify room about vote count (without revealing who voted for whom)
      const votedCount = room.players.filter((p) => p.hasVoted).length
      io.to(playerInfo.roomCode).emit("voteUpdate", {
        votedCount,
        totalPlayers: room.players.length,
      })

      // Check if all players have voted
      if (room.players.every((p) => p.hasVoted)) {
        clearInterval(room.timerInterval)
        calculateResults(playerInfo.roomCode, io)
      }
    })

    // Admin commands
    socket.on("adminReset", (data) => {
      const { roomCode, adminKey } = data

      // Simple admin key check (in production, use proper authentication)
      if (adminKey !== "admin123") {
        socket.emit("error", { message: "Invalid admin key" })
        return
      }

      if (rooms.has(roomCode)) {
        resetGame(roomCode, io)
        console.log(`🔧 Admin reset room ${roomCode}`)
      }
    })

    socket.on("adminStart", (data) => {
      const { roomCode, adminKey } = data

      if (adminKey !== "admin123") {
        socket.emit("error", { message: "Invalid admin key" })
        return
      }

      if (rooms.has(roomCode)) {
        startGame(roomCode, io)
        console.log(`🔧 Admin started game in room ${roomCode}`)
      }
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`)

      const room = removePlayerFromRoom(socket.id)
      const playerInfo = playerSockets.get(socket.id)

      if (room && playerInfo) {
        // Notify remaining players
        io.to(playerInfo.roomCode).emit("playerLeft", {
          playerName: playerInfo.name,
          players: room.players.map((p) => ({
            name: p.name,
            isHost: p.isHost,
            ready: p.ready,
          })),
        })
      }

      playerSockets.delete(socket.id)
    })

    // Get room info
    socket.on("getRoomInfo", (data) => {
      const { roomCode } = data
      const room = rooms.get(roomCode?.toUpperCase())

      if (!room) {
        socket.emit("error", { message: "Room not found" })
        return
      }

      socket.emit("roomInfo", {
        roomCode: room.code,
        playerCount: room.players.length,
        gameState: room.gameState,
        players: room.players.map((p) => ({
          name: p.name,
          isHost: p.isHost,
          ready: p.ready,
        })),
      })
    })
  })
}

// Cleanup old rooms periodically
setInterval(
  () => {
    const now = Date.now()
    const maxAge = 2 * 60 * 60 * 1000 // 2 hours

    for (const [roomCode, room] of rooms.entries()) {
      if (now - room.createdAt > maxAge) {
        if (room.timerInterval) {
          clearInterval(room.timerInterval)
        }
        rooms.delete(roomCode)
        console.log(`🧹 Cleaned up old room: ${roomCode}`)
      }
    }
  },
  30 * 60 * 1000,
) // Run every 30 minutes

// Export for Vercel
module.exports = (req, res) => {
  if (!res.socket.server.io) {
    console.log("🚀 Initializing Socket.IO server...")

    const httpServer = res.socket.server
    const io = new Server(httpServer, {
      path: "/api/socket",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    })

    res.socket.server.io = io
    handleSocket(io)
  }

  res.end()
}
