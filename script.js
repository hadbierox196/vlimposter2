// Updated frontend JavaScript to properly integrate with the backend
import { io } from "socket.io-client"

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

    // Try multiple connection methods
    const socketUrl = window.location.origin
    console.log("🌐 Connecting to:", socketUrl)

    this.socket = io(socketUrl, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    })

    // Connection events with detailed logging
    this.socket.on("connect", () => {
      console.log("✅ Connected to server successfully!")
      console.log("🆔 Socket ID:", this.socket.id)
      this.connectionReady = true
      this.showNotification("Connected to server!")
    })

    this.socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error)
      this.showError(`Connection failed: ${error.message}`)
      this.connectionReady = false
    })

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason)
      this.connectionReady = false
      this.showError("Connection lost. Please refresh the page.")
    })

    this.socket.on("reconnect", () => {
      console.log("🔄 Reconnected to server")
      this.connectionReady = true
      this.showNotification("Reconnected to server!")
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
      document.getElementById("submit-answer-btn").disabled = true
      document.getElementById("answer-input").disabled = true
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

    // Test connection after 2 seconds
    setTimeout(() => {
      if (!this.connectionReady) {
        console.error("⚠️ Connection not ready after 2 seconds")
        this.showError("Failed to connect to server. Please refresh the page.")
      }
    }, 2000)
  }

  bindEvents() {
    // Entry page events
    document.getElementById("create-room-btn").addEventListener("click", () => {
      console.log("🖱️ Create room button clicked")
      this.createRoom()
    })

    document.getElementById("join-room-btn").addEventListener("click", () => {
      console.log("🖱️ Join room button clicked")
      this.toggleJoinRoom()
    })

    document.getElementById("start-btn").addEventListener("click", () => {
      console.log("🖱️ Start button clicked")
      this.joinRoom()
    })

    // Lobby events
    document.getElementById("copy-code-btn").addEventListener("click", () => this.copyRoomCode())
    document.getElementById("ready-btn").addEventListener("click", () => this.toggleReady())
    document.getElementById("start-game-btn").addEventListener("click", () => this.startGame())

    // Game events
    document.getElementById("submit-answer-btn").addEventListener("click", () => this.submitAnswer())
    document.getElementById("send-chat-btn").addEventListener("click", () => this.sendChatMessage())
    document.getElementById("chat-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendChatMessage()
    })

    // Theme toggle
    document.getElementById("theme-toggle").addEventListener("click", () => this.toggleTheme())

    // Input validation
    document.getElementById("player-name").addEventListener("input", () => this.validateInputs())
    document.getElementById("room-code").addEventListener("input", () => this.validateInputs())
  }

  createRoom() {
    console.log("🏠 Create room method called")

    const playerName = document.getElementById("player-name").value.trim()
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
    const playerName = document.getElementById("player-name").value.trim()
    const roomCode = document.getElementById("room-code").value.trim().toUpperCase()

    if (playerName.length >= 2) {
      this.showInputSuccess("player-name")
    }

    if (roomCode.length === 4) {
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
          this.gameState.roomCode = roomCode
          this.gameState.playerName = playerName
          document.getElementById("start-btn").style.display = "block"
        } else {
          this.showInputError("room-code", data.error || "Room not available")
        }
      } catch (error) {
        console.error("❌ Room validation error:", error)
        this.showInputError("room-code", "Failed to validate room")
      }
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
    document.getElementById("room-code-display").textContent = data.roomCode
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
    document.getElementById("room-code-display").textContent = data.roomCode
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
    document.getElementById("question-display").textContent = data.question
    document.getElementById("phase-text").textContent = "Answer Phase"
    this.updateGamePlayersList()
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

    document.getElementById("phase-text").textContent = "Discussion Phase"
    document.getElementById("answer-section").style.display = "none"
    document.getElementById("chat-section").style.display = "block"

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
    // Update vote counter if you want to show it
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
    const answer = document.getElementById("answer-input").value.trim()
    if (!answer) return

    if (!this.connectionReady) {
      this.showError("Not connected to server")
      return
    }

    console.log("📝 Submitting answer:", answer)
    this.socket.emit("submitAnswer", { answer })
  }

  sendChatMessage() {
    const input = document.getElementById("chat-input")
    const message = input.value.trim()
    if (!message) return

    if (!this.connectionReady) {
      this.showError("Not connected to server")
      return
    }

    console.log("💬 Sending chat:", message)
    this.socket.emit("sendChatMessage", { message })
    input.value = ""
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
        <button class="game-btn primary vote-btn" onclick="game.castVote('${player.name}')">Vote ${player.name}</button>
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
    `
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 5000)
  }
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
      navigator.clipboard.writeText(this.gameState.roomCode).then(() => {
        const btn = document.getElementById("copy-code-btn")
        if (btn) {
          const originalText = btn.textContent
          btn.textContent = "✅"
          setTimeout(() => {
            btn.textContent = originalText
          }, 1000)
        }
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

    if (!roomCodeGroup || !joinBtn) return

    const isVisible = roomCodeGroup.style.display !== "none"

    if (isVisible) {
      roomCodeGroup.style.display = "none"
      joinBtn.textContent = "🎯 Join Room"
    } else {
      roomCodeGroup.style.display = "block"
      joinBtn.textContent = "❌ Cancel"
    }
  }
}

// Initialize the game when the page loads
let game
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initializing VL Imposter 2 Client...")
  game = new VLImposter2Client()
})

  
