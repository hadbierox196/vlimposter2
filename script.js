// Updated frontend JavaScript to properly integrate with the backend
class VLImposter2Client {
  constructor() {
    this.socket = null
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
    this.connectToServer()
    this.bindEvents()
    this.loadTheme()
  }

  connectToServer() {
    // Connect to the backend server on the same domain
    this.socket = io(window.location.origin, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
    })

    // Connection events
    this.socket.on("connect", () => {
      console.log("✅ Connected to server:", this.socket.id)
    })

    this.socket.on("disconnect", () => {
      console.log("❌ Disconnected from server")
      this.showError("Connection lost. Please refresh the page.")
    })

    // Room events
    this.socket.on("roomCreated", (data) => this.handleRoomCreated(data))
    this.socket.on("roomJoined", (data) => this.handleRoomJoined(data))
    this.socket.on("playerJoined", (data) => this.handlePlayerJoined(data))
    this.socket.on("playerLeft", (data) => this.handlePlayerLeft(data))
    this.socket.on("playerReadyChanged", (data) => this.handlePlayerReadyChanged(data))

    // Game events
    this.socket.on("gameStarted", (data) => this.handleGameStarted(data))
    this.socket.on("timerUpdate", (data) => this.handleTimerUpdate(data))
    this.socket.on("chatPhaseStarted", (data) => this.handleChatPhaseStarted(data))
    this.socket.on("chatMessage", (data) => this.handleChatMessage(data))
    this.socket.on("votingPhaseStarted", (data) => this.handleVotingPhaseStarted(data))
    this.socket.on("voteUpdate", (data) => this.handleVoteUpdate(data))
    this.socket.on("gameResults", (data) => this.handleGameResults(data))
    this.socket.on("gameReset", (data) => this.handleGameReset(data))

    // Success events
    this.socket.on("answerSubmitted", () => {
      document.getElementById("submit-answer-btn").disabled = true
      document.getElementById("answer-input").disabled = true
      this.showNotification("Answer submitted!")
    })

    this.socket.on("voteSubmitted", (data) => {
      this.showNotification(`Vote cast for ${data.votedFor}`)
    })

    // Error handlers
    this.socket.on("error", (data) => this.showError(data.message))
  }

  bindEvents() {
    // Entry page events
    document.getElementById("create-room-btn").addEventListener("click", () => this.createRoom())
    document.getElementById("join-room-btn").addEventListener("click", () => this.toggleJoinRoom())
    document.getElementById("start-btn").addEventListener("click", () => this.joinRoom())

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
    const playerName = document.getElementById("player-name").value.trim()
    if (!playerName) {
      this.showInputError("player-name", "Please enter your name")
      return
    }

    console.log("🏠 Creating room for:", playerName)
    this.gameState.playerName = playerName
    this.socket.emit("createRoom", { playerName })
  }

  async validateInputs() {
    const playerName = document.getElementById("player-name").value.trim()
    const roomCode = document.getElementById("room-code").value.trim().toUpperCase()

    if (playerName.length >= 2) {
      this.showInputSuccess("player-name")
    }

    if (roomCode.length === 4) {
      try {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomCode }),
        })

        const data = await response.json()

        if (response.ok && data.exists && !data.full) {
          this.showInputSuccess("room-code")
          this.gameState.roomCode = roomCode
          this.gameState.playerName = playerName
          document.getElementById("start-btn").style.display = "block"
        } else {
          this.showInputError("room-code", data.error || "Room not available")
        }
      } catch (error) {
        this.showInputError("room-code", "Failed to validate room")
      }
    }
  }

  joinRoom() {
    if (!this.gameState.roomCode || !this.gameState.playerName) {
      this.showError("Please enter room code and player name")
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
    console.log("🎉 Room created:", data)
    this.gameState.roomCode = data.roomCode
    this.gameState.isHost = data.isHost
    this.gameState.players = data.players

    this.switchPage("lobby")
    document.getElementById("room-code-display").textContent = data.roomCode
    this.updatePlayerList()
    this.updateLobbyStatus()
  }

  handleRoomJoined(data) {
    console.log("🎉 Room joined:", data)
    this.gameState.roomCode = data.roomCode
    this.gameState.isHost = data.isHost
    this.gameState.players = data.players

    this.switchPage("lobby")
    document.getElementById("room-code-display").textContent = data.roomCode
    this.updatePlayerList()
    this.updateLobbyStatus()
  }

  handlePlayerJoined(data) {
    console.log("👤 Player joined:", data)
    this.gameState.players = data.players
    this.updatePlayerList()
    this.updateLobbyStatus()
    this.showNotification(`${data.newPlayer} joined the room`)
  }

  handlePlayerLeft(data) {
    console.log("👋 Player left:", data)
    this.gameState.players = data.players
    this.updatePlayerList()
    this.updateLobbyStatus()
    this.showNotification(`${data.playerName} left the room`)
  }

  handlePlayerReadyChanged(data) {
    console.log("✅ Player ready changed:", data)
    this.gameState.players = data.players
    this.updatePlayerList()
    this.updateLobbyStatus()
  }

  handleGameStarted(data) {
    console.log("🎮 Game started:", data)
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

    timerText.textContent = data.timer

    if (data.timer <= 3) {
      timerCircle.classList.add("warning")
      this.playBeep()
    } else {
      timerCircle.classList.remove("warning")
    }
  }

  handleChatPhaseStarted(data) {
    console.log("💬 Chat phase started:", data)
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
    console.log("🗳️ Voting phase started:", data)
    this.switchPage("elimination")
    this.setupVoting(data.players)
  }

  handleVoteUpdate(data) {
    console.log("📊 Vote update:", data)
    // Update vote counter if you want to show it
  }

  handleGameResults(data) {
    console.log("🏆 Game results:", data)
    this.showGameResults(data)
  }

  handleGameReset(data) {
    console.log("🔄 Game reset:", data)
    this.switchPage("lobby")
    this.resetGameUI()
    this.showNotification(data.message)
  }

  // UI Methods
  toggleReady() {
    console.log("🔄 Toggling ready status")
    this.socket.emit("toggleReady")
  }

  startGame() {
    console.log("🚀 Starting game")
    this.socket.emit("startGame")
  }

  submitAnswer() {
    const answer = document.getElementById("answer-input").value.trim()
    if (!answer) return

    console.log("📝 Submitting answer:", answer)
    this.socket.emit("submitAnswer", { answer })
  }

  sendChatMessage() {
    const input = document.getElementById("chat-input")
    const message = input.value.trim()
    if (!message) return

    console.log("💬 Sending chat:", message)
    this.socket.emit("sendChatMessage", { message })
    input.value = ""
  }

  castVote(playerName) {
    console.log("🗳️ Casting vote for:", playerName)
    this.socket.emit("castVote", { votedFor: playerName })

    // Disable all vote buttons
    document.querySelectorAll(".vote-btn").forEach((btn) => {
      btn.disabled = true
    })
  }

  updatePlayerList() {
    const container = document.getElementById("players-container")
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

    document.getElementById("player-count").textContent = this.gameState.players.length
  }

  updateLobbyStatus() {
    const message = document.getElementById("lobby-message")
    const startBtn = document.getElementById("start-game-btn")
    const readyBtn = document.getElementById("ready-btn")

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
    document.getElementById("voting-container").style.display = "none"
    document.getElementById("voting-results").style.display = "block"

    // Display voting details
    const resultsList = document.getElementById("results-list")
    resultsList.innerHTML = ""

    Object.entries(data.voteDetails).forEach(([voter, voted]) => {
      const resultDiv = document.createElement("div")
      resultDiv.className = "result-item"
      resultDiv.textContent = `${voter} voted for ${voted}`
      resultsList.appendChild(resultDiv)
    })

    // Display game outcome
    const gameResult = document.getElementById("game-result")
    if (data.imposterCaught) {
      gameResult.textContent = `${data.eliminatedPlayer} was the Imposter! Crew wins! 🎉`
      gameResult.className = "imposter-caught"
    } else {
      gameResult.textContent = `${data.eliminatedPlayer} was not the Imposter! ${data.imposterName} (Imposter) wins! 😈`
      gameResult.className = "imposter-survived"
    }
  }

  // Utility methods
  showError(message) {
    console.error("❌ Error:", message)
    alert(`Error: ${message}`)
  }

  showNotification(message) {
    console.log("📢 Notification:", message)
    // You could implement a toast notification here
  }

  showInputSuccess(inputId) {
    const input = document.getElementById(inputId)
    input.classList.remove("error")
    input.classList.add("success")
  }

  showInputError(inputId, message) {
    const input = document.getElementById(inputId)
    input.classList.remove("success")
    input.classList.add("error")
  }

  switchPage(pageId) {
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active")
    })
    document.getElementById(`${pageId}-page`).classList.add("active")
    this.currentPage = pageId
  }

  copyRoomCode() {
    navigator.clipboard.writeText(this.gameState.roomCode).then(() => {
      const btn = document.getElementById("copy-code-btn")
      const originalText = btn.textContent
      btn.textContent = "✅"
      setTimeout(() => {
        btn.textContent = originalText
      }, 1000)
    })
  }

  resetGameUI() {
    // Reset game UI elements
    document.getElementById("answer-section").style.display = "block"
    document.getElementById("chat-section").style.display = "none"
    document.getElementById("submit-answer-btn").disabled = false
    document.getElementById("answer-input").disabled = false
    document.getElementById("answer-input").value = ""
    document.getElementById("chat-input").value = ""
    document.getElementById("chat-messages").innerHTML = ""
    document.getElementById("voting-container").style.display = "block"
    document.getElementById("voting-results").style.display = "none"
  }

  addChatMessage(sender, message) {
    const container = document.getElementById("chat-messages")
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
    themeToggle.textContent = newTheme === "dark" ? "☀️" : "🌙"
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)

    const themeToggle = document.getElementById("theme-toggle")
    themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙"
  }

  toggleJoinRoom() {
    const roomCodeGroup = document.getElementById("room-code-group")
    const isVisible = roomCodeGroup.style.display !== "none"

    if (isVisible) {
      roomCodeGroup.style.display = "none"
      document.getElementById("join-room-btn").textContent = "🎯 Join Room"
    } else {
      roomCodeGroup.style.display = "block"
      document.getElementById("join-room-btn").textContent = "❌ Cancel"
    }
  }
}

// Initialize the game when the page loads
let game
document.addEventListener("DOMContentLoaded", () => {
  game = new VLImposter2Client()
})
                                             
