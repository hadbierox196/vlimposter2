// Complete VL Imposter 2 Client - Frontend JavaScript
class VLImposter2Client {
  constructor() {
    this.socket = null
    this.connectionReady = false
    this.gameState = {
      playerName: "",
      roomCode: "",
      isHost: false,
      players: [],
      currentPlayer: null,
      gamePhase: "entry",
      timer: 0,
      question: "",
      answer: "",
      answers: [],
      isImposter: false,
    }

    this.init()
  }

  init() {
    this.bindEvents()
    this.loadTheme()
    // Connect to server after a short delay to ensure page is loaded
    setTimeout(() => {
      this.connectToServer()
    }, 100)
  }

  connectToServer() {
    console.log("🔌 Attempting to connect to server...")

    // Load Socket.IO from CDN if not available
    if (typeof window.io === "undefined") {
      console.log("📦 Loading Socket.IO from CDN...")
      const script = document.createElement("script")
      script.src = "https://cdn.socket.io/4.7.4/socket.io.min.js"
      script.onload = () => {
        console.log("✅ Socket.IO loaded from CDN")
        this.initializeSocket()
      }
      script.onerror = () => {
        console.error("❌ Failed to load Socket.IO from CDN")
        this.showError("Failed to load Socket.IO. Please refresh the page.")
      }
      document.head.appendChild(script)
    } else {
      this.initializeSocket()
    }
  }

  initializeSocket() {
    const socketUrl = window.location.origin
    console.log("🌐 Connecting to:", socketUrl)

    // Initialize Socket.IO connection with better stability settings
    this.socket = window.io(socketUrl, {
      path: "/api/socket",
      transports: ["polling"], // Force polling for better Vercel compatibility
      timeout: 30000, // Increased timeout
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000, // Wait 2 seconds before reconnecting
      reconnectionAttempts: 10, // More reconnection attempts
      reconnectionDelayMax: 5000, // Max delay between attempts
      maxReconnectionAttempts: 10,
      randomizationFactor: 0.5,
    })

    // Connection events with detailed logging
    this.socket.on("connect", () => {
      console.log("✅ Connected to server successfully!")
      console.log("🆔 Socket ID:", this.socket.id)
      console.log("🚀 Transport:", this.socket.io.engine.transport.name)
      this.connectionReady = true
      this.updateConnectionStatus("connected", "Connected")
      this.showNotification("Connected to server!")
      this.startConnectionHealthCheck()
    })

    this.socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error)
      console.error("❌ Error type:", error.type)
      console.error("❌ Error description:", error.description)
      this.updateConnectionStatus("disconnected", "Connection Failed")
      this.showError(`Connection failed: ${error.message || error.type || "Unknown error"}`)
      this.connectionReady = false
    })

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason)
      this.connectionReady = false
      this.updateConnectionStatus("disconnected", "Disconnected")
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        this.socket.connect()
      }
      this.showError("Connection lost. Attempting to reconnect...")
    })

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected to server after", attemptNumber, "attempts")
      this.connectionReady = true
      this.updateConnectionStatus("connected", "Reconnected")
      this.showNotification("Reconnected to server!")
    })

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Reconnection attempt", attemptNumber)
      this.updateConnectionStatus("connecting", `Reconnecting... (${attemptNumber})`)
    })

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error)
    })

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Failed to reconnect after maximum attempts")
      this.showError("Failed to reconnect. Please refresh the page.")
    })

    // Transport upgrade events
    this.socket.io.on("upgrade", () => {
      console.log("⬆️ Upgraded to transport:", this.socket.io.engine.transport.name)
    })

    this.socket.io.on("upgradeError", (error) => {
      console.error("❌ Upgrade error:", error)
    })

    // Room events
    this.socket.on("roomCreated", (data) => {
      console.log("🎉 Room created event received:", data)
      this.handleRoomCreated(data)
    })

    this.socket.on("roomJoined", (data) => {
      console.log("🎉 Room joined event received:", data)
      this.handleRoomJoined(data)
    })

    this.socket.on("playerJoined", (data) => {
      console.log("👤 Player joined event received:", data)
      this.handlePlayerJoined(data)
    })

    this.socket.on("playerLeft", (data) => {
      console.log("👋 Player left event received:", data)
      this.handlePlayerLeft(data)
    })

    this.socket.on("playerReadyChanged", (data) => {
      console.log("✅ Player ready changed event received:", data)
      this.handlePlayerReadyChanged(data)
    })

    // Game events
    this.socket.on("gameStarted", (data) => {
      console.log("🎮 Game started event received:", data)
      this.handleGameStarted(data)
    })

    this.socket.on("timerUpdate", (data) => {
      this.handleTimerUpdate(data)
    })

    this.socket.on("chatPhaseStarted", (data) => {
      console.log("💬 Chat phase started event received:", data)
      this.handleChatPhaseStarted(data)
    })

    this.socket.on("chatMessage", (data) => {
      this.handleChatMessage(data)
    })

    this.socket.on("votingPhaseStarted", (data) => {
      console.log("🗳️ Voting phase started event received:", data)
      this.handleVotingPhaseStarted(data)
    })

    this.socket.on("voteUpdate", (data) => {
      console.log("📊 Vote update event received:", data)
      this.handleVoteUpdate(data)
    })

    this.socket.on("gameResults", (data) => {
      console.log("🏆 Game results event received:", data)
      this.handleGameResults(data)
    })

    this.socket.on("gameReset", (data) => {
      console.log("🔄 Game reset event received:", data)
      this.handleGameReset(data)
    })

    // Success events
    this.socket.on("answerSubmitted", () => {
      console.log("📝 Answer submitted successfully")
      const submitBtn = document.getElementById("submit-answer-btn")
      const answerInput = document.getElementById("answer-input")
      if (submitBtn) submitBtn.disabled = true
      if (answerInput) answerInput.disabled = true
      this.showNotification("Answer submitted!")
    })

    this.socket.on("voteSubmitted", (data) => {
      console.log("🗳️ Vote submitted successfully:", data)
      this.showNotification(`Vote cast for ${data.votedFor}`)
    })

    // Error handlers
    this.socket.on("error", (data) => {
      console.error("🚨 Server error:", data)
      this.showError(data.message || "Server error occurred")
    })

    // Test connection after 3 seconds
    setTimeout(() => {
      if (!this.connectionReady) {
        console.error("⚠️ Connection not ready after 3 seconds")
        this.showError("Failed to connect to server. Please refresh the page.")
      }
    }, 3000)
  }

  updateConnectionStatus(status, message) {
    const statusEl = document.getElementById("connection-status")
    const textEl = document.getElementById("connection-text")
    const helpEl = document.getElementById("connection-help")

    if (!statusEl || !textEl) return

    statusEl.className = `connection-status ${status}`
    textEl.textContent = message

    // Show help if disconnected for too long
    if (status === "disconnected" && helpEl) {
      setTimeout(() => {
        if (!this.connectionReady) {
          helpEl.style.display = "block"
        }
      }, 5000)
    } else if (helpEl) {
      helpEl.style.display = "none"
    }
  }

  startConnectionHealthCheck() {
    // Ping server every 30 seconds to keep connection alive
    this.healthCheckInterval = setInterval(() => {
      if (this.socket && this.connectionReady) {
        console.log("💓 Sending heartbeat...")
        this.socket.emit("ping", { timestamp: Date.now() })
      }
    }, 30000)

    // Handle pong response
    this.socket.on("pong", (data) => {
      console.log("💓 Heartbeat response received:", Date.now() - data.timestamp, "ms")
    })
  }

  forceReconnect() {
    console.log("🔄 Force reconnecting...")
    this.connectionReady = false
    this.updateConnectionStatus("connecting", "Reconnecting...")

    if (this.socket) {
      this.socket.disconnect()
      this.socket.connect()
    } else {
      this.connectToServer()
    }
  }

  bindEvents() {
    // Entry page events
    const createRoomBtn = document.getElementById("create-room-btn")
    const joinRoomBtn = document.getElementById("join-room-btn")
    const startBtn = document.getElementById("start-btn")

    if (createRoomBtn) {
      createRoomBtn.addEventListener("click", () => {
        console.log("🖱️ Create room button clicked")
        this.createRoom()
      })
    }

    if (joinRoomBtn) {
      joinRoomBtn.addEventListener("click", () => {
        console.log("🖱️ Join room button clicked")
        this.toggleJoinRoom()
      })
    }

    if (startBtn) {
      startBtn.addEventListener("click", () => {
        console.log("🖱️ Start button clicked")
        this.joinRoom()
      })
    }

    // Lobby events
    const copyCodeBtn = document.getElementById("copy-code-btn")
    const readyBtn = document.getElementById("ready-btn")
    const startGameBtn = document.getElementById("start-game-btn")

    if (copyCodeBtn) copyCodeBtn.addEventListener("click", () => this.copyRoomCode())
    if (readyBtn) readyBtn.addEventListener("click", () => this.toggleReady())
    if (startGameBtn) startGameBtn.addEventListener("click", () => this.startGame())

    // Game events
    const submitAnswerBtn = document.getElementById("submit-answer-btn")
    const sendChatBtn = document.getElementById("send-chat-btn")
    const chatInput = document.getElementById("chat-input")

    if (submitAnswerBtn) submitAnswerBtn.addEventListener("click", () => this.submitAnswer())
    if (sendChatBtn) sendChatBtn.addEventListener("click", () => this.sendChatMessage())
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendChatMessage()
      })
    }

    // Elimination events
    const newGameBtn = document.getElementById("new-game-btn")
    if (newGameBtn) newGameBtn.addEventListener("click", () => this.newGame())

    // Theme toggle
    const themeToggle = document.getElementById("theme-toggle")
    if (themeToggle) themeToggle.addEventListener("click", () => this.toggleTheme())

    // Input validation
    const playerNameInput = document.getElementById("player-name")
    const roomCodeInput = document.getElementById("room-code")

    if (playerNameInput) playerNameInput.addEventListener("input", () => this.validateInputs())
    if (roomCodeInput) roomCodeInput.addEventListener("input", () => this.validateInputs())

    // Reconnect button
    const reconnectBtn = document.getElementById("reconnect-btn")
    if (reconnectBtn) reconnectBtn.addEventListener("click", () => this.forceReconnect())
  }

  createRoom() {
    console.log("🏠 Create room method called")

    const playerNameInput = document.getElementById("player-name")
    if (!playerNameInput) {
      console.error("❌ Player name input not found")
      return
    }

    const playerName = playerNameInput.value.trim()
    console.log("👤 Player name:", playerName)

    if (!playerName) {
      console.log("❌ No player name provided")
      this.showInputError("player-name", "Please enter your name")
      return
    }

    if (!this.socket) {
      console.error("❌ Socket not initialized")
      this.showError("Connection not established. Please refresh the page.")
      return
    }

    if (!this.connectionReady) {
      console.error("❌ Socket not connected")
      this.showError("Not connected to server. Please wait and try again.")
      return
    }

    console.log("📤 Emitting createRoom event...")
    this.gameState.playerName = playerName

    // Add a timeout to detect if the server doesn't respond
    const timeout = setTimeout(() => {
      console.error("⏰ Create room timeout - no response from server")
      this.showError("Server didn't respond. Please try again.")
    }, 10000)

    // Clear timeout when we get a response
    this.socket.once("roomCreated", () => {
      clearTimeout(timeout)
    })

    this.socket.once("error", () => {
      clearTimeout(timeout)
    })

    this.socket.emit("createRoom", { playerName })
    console.log("✅ CreateRoom event emitted")
  }

  async validateInputs() {
    const playerNameInput = document.getElementById("player-name")
    const roomCodeInput = document.getElementById("room-code")
    const startBtn = document.getElementById("start-btn")

    if (!playerNameInput || !roomCodeInput || !startBtn) return

    const playerName = playerNameInput.value.trim()
    const roomCode = roomCodeInput.value.trim().toUpperCase()

    // Show start button if both fields are filled
    if (playerName.length >= 2 && roomCode.length === 4) {
      this.gameState.roomCode = roomCode
      this.gameState.playerName = playerName
      startBtn.style.display = "block"
      this.showInputSuccess("player-name")

      try {
        console.log("🔍 Validating room code:", roomCode)
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomCode }),
        })

        const data = await response.json()
        console.log("📋 Room validation response:", data)

        if (response.ok && data.exists && !data.full) {
          this.showInputSuccess("room-code")
        } else {
          this.showInputError("room-code", data.error || "Room not available")
          startBtn.style.display = "none"
        }
      } catch (error) {
        console.error("❌ Room validation error:", error)
        this.showInputError("room-code", "Failed to validate room")
        startBtn.style.display = "none"
      }
    } else {
      startBtn.style.display = "none"
    }

    if (playerName.length >= 2) {
      this.showInputSuccess("player-name")
    }
  }

  joinRoom() {
    if (!this.gameState.roomCode || !this.gameState.playerName) {
      this.showError("Please enter room code and player name")
      return
    }

    if (!this.connectionReady) {
      this.showError("Not connected to server. Please wait and try again.")
      return
    }

    console.log("🚪 Joining room:", this.gameState.roomCode, "as:", this.gameState.playerName)
    this.socket.emit("joinRoom", {
      roomCode: this.gameState.roomCode,
      playerName: this.gameState.playerName,
    })
  }

  // Socket event handlers
  handleRoomCreated(data) {
    console.log("🎉 Handling room created:", data)
    this.gameState.roomCode = data.roomCode
    this.gameState.isHost = data.isHost
    this.gameState.players = data.players

    this.switchPage("lobby")
    const roomCodeDisplay = document.getElementById("room-code-display")
    if (roomCodeDisplay) roomCodeDisplay.textContent = data.roomCode
    this.updatePlayerList()
    this.updateLobbyStatus()
    this.showNotification(`Room ${data.roomCode} created!`)
  }

  handleRoomJoined(data) {
    console.log("🎉 Handling room joined:", data)
    this.gameState.roomCode = data.roomCode
    this.gameState.isHost = data.isHost
    this.gameState.players = data.players

    this.switchPage("lobby")
    const roomCodeDisplay = document.getElementById("room-code-display")
    if (roomCodeDisplay) roomCodeDisplay.textContent = data.roomCode
    this.updatePlayerList()
    this.updateLobbyStatus()
    this.showNotification(`Joined room ${data.roomCode}!`)
  }

  handlePlayerJoined(data) {
    console.log("👤 Handling player joined:", data)
    this.gameState.players = data.players
    this.updatePlayerList()
    this.updateLobbyStatus()
    this.showNotification(`${data.newPlayer} joined the room`)
  }

  handlePlayerLeft(data) {
    console.log("👋 Handling player left:", data)
    this.gameState.players = data.players
    this.updatePlayerList()
    this.updateLobbyStatus()
    this.showNotification(`${data.playerName} left the room`)
  }

  handlePlayerReadyChanged(data) {
    console.log("✅ Handling player ready changed:", data)
    this.gameState.players = data.players
    this.updatePlayerList()
    this.updateLobbyStatus()
  }

  handleGameStarted(data) {
    console.log("🎮 Handling game started:", data)
    this.gameState.gamePhase = data.phase
    this.gameState.timer = data.timer
    this.gameState.question = data.question
    this.gameState.isImposter = data.isImposter

    this.switchPage("game")
    const questionDisplay = document.getElementById("question-display")
    const phaseText = document.getElementById("phase-text")

    if (questionDisplay) questionDisplay.textContent = data.question
    if (phaseText) phaseText.textContent = "Answer Phase"

    this.updateGamePlayersList()

    // Show imposter indicator
    if (data.isImposter) {
      this.showNotification("🎭 You are the IMPOSTER! Answer carefully...")
    }
  }

  handleTimerUpdate(data) {
    this.gameState.timer = data.timer
    const timerText = document.getElementById("timer-text")
    const timerCircle = document.querySelector(".timer-circle")

    if (timerText) timerText.textContent = data.timer

    if (data.timer <= 3 && timerCircle) {
      timerCircle.classList.add("warning")
      this.playBeep()
    } else if (timerCircle) {
      timerCircle.classList.remove("warning")
    }
  }

  handleChatPhaseStarted(data) {
    console.log("💬 Handling chat phase started:", data)
    this.gameState.gamePhase = data.phase
    this.gameState.timer = data.timer
    this.gameState.answers = Object.entries(data.answers).map(([name, answer]) => ({
      playerName: name,
      answer: answer,
    }))

    const phaseText = document.getElementById("phase-text")
    const answerSection = document.getElementById("answer-section")
    const chatSection = document.getElementById("chat-section")

    if (phaseText) phaseText.textContent = "Discussion Phase"
    if (answerSection) answerSection.style.display = "none"
    if (chatSection) chatSection.style.display = "block"

    this.displayAnswers()
  }

  handleChatMessage(data) {
    this.addChatMessage(data.playerName, data.message)
  }

  handleVotingPhaseStarted(data) {
    console.log("🗳️ Handling voting phase started:", data)
    this.switchPage("elimination")
    this.setupVoting(data.players)
  }

  handleVoteUpdate(data) {
    console.log("📊 Handling vote update:", data)
    // Could show vote progress here
    const votingStatus = document.getElementById("voting-status")
    if (votingStatus) {
      votingStatus.textContent = `${data.votedCount}/${data.totalPlayers} players have voted`
    }
  }

  handleGameResults(data) {
    console.log("🏆 Handling game results:", data)
    this.showGameResults(data)
  }

  handleGameReset(data) {
    console.log("🔄 Handling game reset:", data)
    this.switchPage("lobby")
    this.resetGameUI()
    this.showNotification(data.message)
  }

  // UI Methods
  toggleReady() {
    if (!this.connectionReady) {
      this.showError("Not connected to server")
      return
    }
    console.log("🔄 Toggling ready status")
    this.socket.emit("toggleReady")
  }

  startGame() {
    if (!this.connectionReady) {
      this.showError("Not connected to server")
      return
    }
    console.log("🚀 Starting game")
    this.socket.emit("startGame")
  }

  submitAnswer() {
      const answerInput = document.getElementById("answer-input")
    if (!answerInput) return

    const answer = answerInput.value.trim()
    if (!answer) {
      this.showError("Please enter an answer")
      return
    }

    if (!this.connectionReady) {
      this.showError("Not connected to server")
      return
    }

    console.log("📝 Submitting answer:", answer)
    this.socket.emit("submitAnswer", { answer })
  }

  sendChatMessage() {
    const chatInput = document.getElementById("chat-input")
    if (!chatInput) return

    const message = chatInput.value.trim()
    if (!message) return

    if (!this.connectionReady) {
      this.showError("Not connected to server")
      return
    }

    console.log("💬 Sending chat:", message)
    this.socket.emit("sendChatMessage", { message })
    chatInput.value = ""
  }

  castVote(playerName) {
    if (!this.connectionReady) {
      this.showError("Not connected to server")
      return
    }

    console.log("🗳️ Casting vote for:", playerName)
    this.socket.emit("castVote", { votedFor: playerName })

    // Disable all vote buttons
    document.querySelectorAll(".vote-btn").forEach((btn) => {
      btn.disabled = true
    })

    // Visual feedback
    const voteCards = document.querySelectorAll(".vote-card")
    voteCards.forEach((card) => {
      const button = card.querySelector(".vote-btn")
      if (button && button.dataset.player === playerName) {
        card.classList.add("voted")
      }
    })
  }

  updatePlayerList() {
    const container = document.getElementById("players-container")
    if (!container) return

    container.innerHTML = ""

    console.log("📋 Updating player list:", this.gameState.players)

    this.gameState.players.forEach((player) => {
      const playerDiv = document.createElement("div")
      playerDiv.className = "player-item"
      playerDiv.innerHTML = `
        <div class="player-status ${player.ready ? "" : "not-ready"}"></div>
        <span>${player.name} ${player.isHost ? "(Host)" : ""}</span>
      `
      container.appendChild(playerDiv)
    })

    const playerCountEl = document.getElementById("player-count")
    if (playerCountEl) {
      playerCountEl.textContent = this.gameState.players.length
    }
  }

  updateLobbyStatus() {
    const message = document.getElementById("lobby-message")
    const startBtn = document.getElementById("start-game-btn")
    const readyBtn = document.getElementById("ready-btn")

    if (!message || !startBtn || !readyBtn) return

    if (this.gameState.players.length < 4) {
      message.textContent = `Waiting for ${4 - this.gameState.players.length} more players...`
      startBtn.style.display = "none"
    } else {
      const allReady = this.gameState.players.every((p) => p.ready)
      if (allReady) {
        message.textContent = "All players ready! Host can start the game."
        if (this.gameState.isHost) {
          startBtn.style.display = "block"
        }
      } else {
        message.textContent = "Waiting for all players to be ready..."
        startBtn.style.display = "none"
      }
    }

    // Update ready button text
    const currentPlayer = this.gameState.players.find((p) => p.name === this.gameState.playerName)
    if (currentPlayer) {
      readyBtn.textContent = currentPlayer.ready ? "Not Ready" : "Ready"
      readyBtn.className = currentPlayer.ready ? "game-btn primary" : "game-btn secondary"
    }
  }

  updateGamePlayersList() {
    const container = document.getElementById("game-players-list")
    if (!container) return

    container.innerHTML = ""

    this.gameState.players.forEach((player) => {
      const playerDiv = document.createElement("div")
      playerDiv.className = "game-player-item"
      playerDiv.innerHTML = `
        <div class="online-indicator"></div>
        <span>${player.name}</span>
      `
      container.appendChild(playerDiv)
    })
  }

  displayAnswers() {
    const container = document.getElementById("answers-list")
    if (!container) return

    container.innerHTML = ""

    this.gameState.answers.forEach((answerData) => {
      const answerDiv = document.createElement("div")
      answerDiv.className = "answer-item"
      answerDiv.innerHTML = `
        <strong>${answerData.playerName}:</strong>
        <span>${answerData.answer}</span>
      `
      container.appendChild(answerDiv)
    })
  }

  setupVoting(players) {
    const container = document.getElementById("voting-container")
    if (!container) return

    container.innerHTML = ""

    players.forEach((player) => {
      if (player.name === this.gameState.playerName) return

      const voteCard = document.createElement("div")
      voteCard.className = "vote-card"
      voteCard.innerHTML = `
        <h4>${player.name}</h4>
        <div class="answer">"${player.answer}"</div>
        <button class="game-btn primary vote-btn" data-player="${player.name}" onclick="game.castVote('${player.name}')">Vote ${player.name}</button>
      `
      container.appendChild(voteCard)
    })
  }

  showGameResults(data) {
    const votingContainer = document.getElementById("voting-container")
    const votingResults = document.getElementById("voting-results")

    if (votingContainer) votingContainer.style.display = "none"
    if (votingResults) votingResults.style.display = "block"

    // Display voting details
    const resultsList = document.getElementById("results-list")
    if (resultsList) {
      resultsList.innerHTML = ""

      Object.entries(data.voteDetails).forEach(([voter, voted]) => {
        const resultDiv = document.createElement("div")
        resultDiv.className = "result-item"
        resultDiv.textContent = `${voter} voted for ${voted}`
        resultsList.appendChild(resultDiv)
      })
    }

    // Display game outcome
    const gameResult = document.getElementById("game-result")
    if (gameResult) {
      if (data.imposterCaught) {
        gameResult.textContent = `${data.eliminatedPlayer} was the Imposter! Crew wins! 🎉`
        gameResult.className = "imposter-caught"
      } else {
        gameResult.textContent = `${data.eliminatedPlayer} was not the Imposter! ${data.imposterName} (Imposter) wins! 😈`
        gameResult.className = "imposter-survived"
      }
    }
  }

  newGame() {
    // Reset game state
    this.gameState = {
      playerName: "",
      roomCode: "",
      isHost: false,
      players: [],
      currentPlayer: null,
      gamePhase: "entry",
      timer: 0,
      question: "",
      answer: "",
      answers: [],
      isImposter: false,
    }

    this.switchPage("entry")
    this.resetForms()
  }

  resetForms() {
    const playerNameInput = document.getElementById("player-name")
    const roomCodeInput = document.getElementById("room-code")
    const roomCodeGroup = document.getElementById("room-code-group")
    const startBtn = document.getElementById("start-btn")
    const createRoomBtn = document.getElementById("create-room-btn")
    const joinRoomBtn = document.getElementById("join-room-btn")

    if (playerNameInput) playerNameInput.value = ""
    if (roomCodeInput) roomCodeInput.value = ""
    if (roomCodeGroup) roomCodeGroup.style.display = "none"
    if (startBtn) startBtn.style.display = "none"
    if (createRoomBtn) createRoomBtn.disabled = false
    if (joinRoomBtn) {
      joinRoomBtn.disabled = false
      joinRoomBtn.textContent = "🎯 Join Room"
    }

    // Reset input styles
    document.querySelectorAll("input").forEach((input) => {
      input.classList.remove("success", "error")
    })
  }

  // Utility methods
  showError(message) {
    console.error("❌ Error:", message)

    // Create a simple notification
    const notification = document.createElement("div")
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Orbitron, monospace;
      max-width: 300px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 5000)
  }

  showNotification(message) {
    console.log("📢 Notification:", message)

    // Create a simple notification
    const notification = document.createElement("div")
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #00ff00;
      color: black;
      padding: 15px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Orbitron, monospace;
      max-width: 300px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  showInputSuccess(inputId) {
    const input = document.getElementById(inputId)
    if (input) {
      input.classList.remove("error")
      input.classList.add("success")
    }
  }

  showInputError(inputId, message) {
    const input = document.getElementById(inputId)
    if (input) {
      input.classList.remove("success")
      input.classList.add("error")
    }
    this.showError(message)
  }

  switchPage(pageId) {
    console.log("📄 Switching to page:", pageId)
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active")
    })
    const targetPage = document.getElementById(`${pageId}-page`)
    if (targetPage) {
      targetPage.classList.add("active")
    }
    this.currentPage = pageId
  }

  copyRoomCode() {
    if (navigator.clipboard && this.gameState.roomCode) {
      navigator.clipboard
        .writeText(this.gameState.roomCode)
        .then(() => {
          const btn = document.getElementById("copy-code-btn")
          if (btn) {
            const originalText = btn.textContent
            btn.textContent = "✅"
            setTimeout(() => {
              btn.textContent = originalText
            }, 1000)
          }
          this.showNotification("Room code copied!")
        })
        .catch(() => {
          this.showError("Failed to copy room code")
        })
    }
  }

  resetGameUI() {
    // Reset game UI elements
    const elements = {
      "answer-section": { display: "block" },
      "chat-section": { display: "none" },
      "submit-answer-btn": { disabled: false },
      "answer-input": { disabled: false, value: "" },
      "chat-input": { value: "" },
      "chat-messages": { innerHTML: "" },
      "voting-container": { display: "block" },
      "voting-results": { display: "none" },
    }

    Object.entries(elements).forEach(([id, props]) => {
      const element = document.getElementById(id)
      if (element) {
        Object.entries(props).forEach(([prop, value]) => {
          if (prop === "innerHTML") {
            element.innerHTML = value
          } else if (prop === "value") {
            element.value = value
          } else if (prop === "display") {
            element.style.display = value
          } else {
            element[prop] = value
          }
        })
      }
    })
  }

  addChatMessage(sender, message) {
    const container = document.getElementById("chat-messages")
    if (!container) return

    const messageDiv = document.createElement("div")
    messageDiv.className = "chat-message"
    messageDiv.innerHTML = `
      <span class="sender">${sender}:</span>
      <span>${message}</span>
    `
    container.appendChild(messageDiv)
    container.scrollTop = container.scrollHeight
  }

  playBeep() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.log("Audio not supported")
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme")
    const newTheme = currentTheme === "dark" ? "light" : "dark"

    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)

    const themeToggle = document.getElementById("theme-toggle")
    if (themeToggle) {
      themeToggle.textContent = newTheme === "dark" ? "☀️" : "🌙"
    }
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)

    const themeToggle = document.getElementById("theme-toggle")
    if (themeToggle) {
      themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙"
    }
  }

  toggleJoinRoom() {
    const roomCodeGroup = document.getElementById("room-code-group")
    const joinBtn = document.getElementById("join-room-btn")
    const createRoomBtn = document.getElementById("create-room-btn")

    if (!roomCodeGroup || !joinBtn || !createRoomBtn) return

    const isVisible = roomCodeGroup.style.display !== "none"

    if (isVisible) {
      // Hide join form
      roomCodeGroup.style.display = "none"
      joinBtn.textContent = "🎯 Join Room"
      joinBtn.classList.remove("secondary")
      joinBtn.classList.add("secondary")
      createRoomBtn.disabled = false

      // Hide start button
      const startBtn = document.getElementById("start-btn")
      if (startBtn) startBtn.style.display = "none"
    } else {
      // Show join form
      roomCodeGroup.style.display = "block"
      joinBtn.textContent = "❌ Cancel"
      joinBtn.classList.remove("secondary")
      joinBtn.classList.add("primary")
      createRoomBtn.disabled = true

      // Focus on room code input
      const roomCodeInput = document.getElementById("room-code")
      if (roomCodeInput) {
        setTimeout(() => roomCodeInput.focus(), 100)
      }
    }
  }
}

// Initialize the game when the page loads
let game
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initializing VL Imposter 2 Client...")
  game = new VLImposter2Client()
})

// Make game available globally for onclick handlers
window.game = game
      
    
