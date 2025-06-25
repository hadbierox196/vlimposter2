class VLImposter2 {
  constructor() {
    this.currentPage = "entry"
    this.gameState = {
      playerName: "",
      roomCode: "",
      isHost: false,
      players: [],
      currentPlayer: null,
      gamePhase: "entry", // entry, lobby, answer, chat, voting, results
      timer: 0,
      timerInterval: null,
      question: "",
      answer: "",
      answers: {},
      votes: {},
      isImposter: false,
      imposterQuestion: "",
    }

    this.questions = [
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
    ]

    this.init()
  }

  init() {
    this.bindEvents()
    this.loadTheme()
    this.simulateOtherPlayers()
  }

  bindEvents() {
    // Entry page events
    document.getElementById("create-room-btn").addEventListener("click", () => this.createRoom())
    document.getElementById("join-room-btn").addEventListener("click", () => this.toggleJoinRoom())
    document.getElementById("start-btn").addEventListener("click", () => this.enterLobby())

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

    // Elimination events
    document.getElementById("new-game-btn").addEventListener("click", () => this.newGame())

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

    this.gameState.roomCode = this.generateRoomCode()
    this.gameState.playerName = playerName
    this.gameState.isHost = true
    this.gameState.currentPlayer = { name: playerName, ready: false, isHost: true }
    this.gameState.players = [this.gameState.currentPlayer]

    this.showInputSuccess("player-name")
    document.getElementById("start-btn").style.display = "block"
    document.getElementById("create-room-btn").disabled = true
    document.getElementById("join-room-btn").disabled = true
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

  validateInputs() {
    const playerName = document.getElementById("player-name").value.trim()
    const roomCode = document.getElementById("room-code").value.trim().toUpperCase()

    if (playerName.length >= 2) {
      this.showInputSuccess("player-name")
    }

    if (roomCode.length === 4) {
      // Simulate room validation
      if (Math.random() > 0.3) {
        // 70% success rate
        this.showInputSuccess("room-code")
        this.gameState.roomCode = roomCode
        this.gameState.playerName = playerName
        this.gameState.isHost = false
        document.getElementById("start-btn").style.display = "block"
      } else {
        this.showInputError("room-code", "Room not found")
      }
    }
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
    // You could show the error message in a tooltip or below the input
  }

  generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let result = ""
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  enterLobby() {
    this.switchPage("lobby")
    document.getElementById("room-code-display").textContent = this.gameState.roomCode
    this.updatePlayerList()

    if (!this.gameState.isHost) {
      // Add current player to existing room
      this.gameState.currentPlayer = { name: this.gameState.playerName, ready: false, isHost: false }
      this.gameState.players.push(this.gameState.currentPlayer)
    }

    this.updateLobbyStatus()
  }

  simulateOtherPlayers() {
    // Simulate other players joining over time
    const botNames = ["Alice", "Bob", "Charlie", "Diana", "Eve"]
    const joinDelay = 2000

    setTimeout(() => {
      if (this.currentPage === "lobby" && this.gameState.players.length < 4) {
        const botName = botNames[Math.floor(Math.random() * botNames.length)]
        if (!this.gameState.players.find((p) => p.name === botName)) {
          this.gameState.players.push({ name: botName, ready: false, isHost: false })
          this.updatePlayerList()
          this.updateLobbyStatus()
        }
      }
    }, joinDelay)

    // Simulate bots getting ready
    setTimeout(() => {
      if (this.currentPage === "lobby") {
        this.gameState.players.forEach((player) => {
          if (!player.isHost && Math.random() > 0.5) {
            player.ready = true
          }
        })
        this.updatePlayerList()
        this.updateLobbyStatus()
      }
    }, joinDelay + 3000)
  }

  updatePlayerList() {
    const container = document.getElementById("players-container")
    container.innerHTML = ""

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

  toggleReady() {
    this.gameState.currentPlayer.ready = !this.gameState.currentPlayer.ready
    const btn = document.getElementById("ready-btn")
    btn.textContent = this.gameState.currentPlayer.ready ? "Not Ready" : "Ready"
    btn.className = this.gameState.currentPlayer.ready ? "game-btn primary" : "game-btn secondary"

    this.updatePlayerList()
    this.updateLobbyStatus()
  }

  startGame() {
    this.switchPage("game")
    this.assignRoles()
    this.startAnswerPhase()
  }

  assignRoles() {
    // Randomly assign imposter
    const randomIndex = Math.floor(Math.random() * this.gameState.players.length)
    const questionSet = this.questions[Math.floor(Math.random() * this.questions.length)]

    this.gameState.isImposter = this.gameState.players[randomIndex] === this.gameState.currentPlayer
    this.gameState.question = this.gameState.isImposter ? questionSet.imposter : questionSet.normal
    this.gameState.imposterQuestion = questionSet.imposter

    // Update game players list
    this.updateGamePlayersList()
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

  startAnswerPhase() {
    this.gameState.gamePhase = "answer"
    this.gameState.timer = 10
    document.getElementById("question-display").textContent = this.gameState.question
    document.getElementById("phase-text").textContent = "Answer Phase"

    this.startTimer(() => {
      this.startChatPhase()
    })
  }

  startTimer(callback) {
    const timerText = document.getElementById("timer-text")
    const timerCircle = document.querySelector(".timer-circle")

    this.gameState.timerInterval = setInterval(() => {
      timerText.textContent = this.gameState.timer

      if (this.gameState.timer <= 3) {
        timerCircle.classList.add("warning")
        this.playBeep()
      }

      if (this.gameState.timer <= 0) {
        clearInterval(this.gameState.timerInterval)
        timerCircle.classList.remove("warning")
        callback()
        return
      }

      this.gameState.timer--
    }, 1000)
  }

  submitAnswer() {
    const answer = document.getElementById("answer-input").value.trim()
    if (!answer) return

    this.gameState.answer = answer
    this.gameState.answers[this.gameState.playerName] = answer

    document.getElementById("submit-answer-btn").disabled = true
    document.getElementById("answer-input").disabled = true

    // Simulate other players' answers
    this.simulateOtherAnswers()
  }

  simulateOtherAnswers() {
    const sampleAnswers = {
      normal: ["Blue", "Red", "Green", "Purple", "Yellow"],
      imposter: ["Dog", "Cat", "Bird", "Fish", "Rabbit"],
    }

    this.gameState.players.forEach((player) => {
      if (player !== this.gameState.currentPlayer) {
        const isPlayerImposter = Math.random() < 0.25 // 25% chance
        const answers = isPlayerImposter ? sampleAnswers.imposter : sampleAnswers.normal
        this.gameState.answers[player.name] = answers[Math.floor(Math.random() * answers.length)]
      }
    })
  }

  startChatPhase() {
    this.gameState.gamePhase = "chat"
    this.gameState.timer = 120
    document.getElementById("phase-text").textContent = "Discussion Phase"
    document.getElementById("answer-section").style.display = "none"
    document.getElementById("chat-section").style.display = "block"

    this.displayAnswers()
    this.startTimer(() => {
      this.startVotingPhase()
    })

    this.simulateChat()
  }

  displayAnswers() {
    const container = document.getElementById("answers-list")
    container.innerHTML = ""

    Object.entries(this.gameState.answers).forEach(([playerName, answer]) => {
      const answerDiv = document.createElement("div")
      answerDiv.className = "answer-item"
      answerDiv.innerHTML = `
                <strong>${playerName}:</strong>
                <span>${answer}</span>
            `
      container.appendChild(answerDiv)
    })
  }

  sendChatMessage() {
    const input = document.getElementById("chat-input")
    const message = input.value.trim()
    if (!message) return

    this.addChatMessage(this.gameState.playerName, message)
    input.value = ""
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

  simulateChat() {
    const chatMessages = [
      "Hmm, some of these answers seem suspicious...",
      "I think someone got a different question!",
      "My answer makes perfect sense for the question I got",
      "Wait, why would someone answer that?",
      "I'm getting imposter vibes from someone...",
    ]

    let messageIndex = 0
    const chatInterval = setInterval(() => {
      if (this.gameState.gamePhase !== "chat" || messageIndex >= chatMessages.length) {
        clearInterval(chatInterval)
        return
      }

      const randomPlayer = this.gameState.players[Math.floor(Math.random() * this.gameState.players.length)]
      if (randomPlayer !== this.gameState.currentPlayer) {
        this.addChatMessage(randomPlayer.name, chatMessages[messageIndex])
        messageIndex++
      }
    }, 8000)
  }

  startVotingPhase() {
    this.switchPage("elimination")
    this.setupVoting()
  }

  setupVoting() {
    const container = document.getElementById("voting-container")
    container.innerHTML = ""

    this.gameState.players.forEach((player) => {
      if (player === this.gameState.currentPlayer) return

      const voteCard = document.createElement("div")
      voteCard.className = "vote-card"
      voteCard.innerHTML = `
                <h4>${player.name}</h4>
                <div class="answer">"${this.gameState.answers[player.name]}"</div>
                <button class="game-btn primary vote-btn" data-player="${player.name}">Vote ${player.name}</button>
            `
      container.appendChild(voteCard)
    })

    // Add vote event listeners
    document.querySelectorAll(".vote-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.castVote(e.target.dataset.player))
    })

    this.simulateVoting()
  }

  castVote(playerName) {
    this.gameState.votes[this.gameState.playerName] = playerName

    // Update UI
    document.querySelectorAll(".vote-card").forEach((card) => {
      card.classList.remove("voted")
    })

    const votedCard = document.querySelector(`[data-player="${playerName}"]`).closest(".vote-card")
    votedCard.classList.add("voted")

    // Disable all vote buttons
    document.querySelectorAll(".vote-btn").forEach((btn) => {
      btn.disabled = true
    })

    setTimeout(() => {
      this.showVotingResults()
    }, 2000)
  }

  simulateVoting() {
    // Simulate other players voting
    setTimeout(() => {
      this.gameState.players.forEach((player) => {
        if (player !== this.gameState.currentPlayer) {
          const targets = this.gameState.players.filter((p) => p !== player)
          const target = targets[Math.floor(Math.random() * targets.length)]
          this.gameState.votes[player.name] = target.name
        }
      })
    }, 3000)
  }

  showVotingResults() {
    document.getElementById("voting-container").style.display = "none"
    document.getElementById("voting-results").style.display = "block"

    // Count votes
    const voteCounts = {}
    Object.values(this.gameState.votes).forEach((vote) => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1
    })

    // Find player with most votes
    const eliminatedPlayer = Object.keys(voteCounts).reduce((a, b) => (voteCounts[a] > voteCounts[b] ? a : b))

    // Display results
    const resultsList = document.getElementById("results-list")
    resultsList.innerHTML = ""

    Object.entries(this.gameState.votes).forEach(([voter, voted]) => {
      const resultDiv = document.createElement("div")
      resultDiv.className = "result-item"
      resultDiv.textContent = `${voter} voted for ${voted}`
      resultsList.appendChild(resultDiv)
    })

    // Determine game outcome
    const wasImposterEliminated = this.checkIfImposterEliminated(eliminatedPlayer)
    const gameResult = document.getElementById("game-result")

    if (wasImposterEliminated) {
      gameResult.textContent = `${eliminatedPlayer} was the Imposter! Crew wins! 🎉`
      gameResult.className = "imposter-caught"
    } else {
      gameResult.textContent = `${eliminatedPlayer} was not the Imposter! Imposter wins! 😈`
      gameResult.className = "imposter-survived"
    }
  }

  checkIfImposterEliminated(eliminatedPlayer) {
    // In a real game, you'd track who the actual imposter is
    // For demo purposes, we'll make it random
    return Math.random() > 0.5
  }

  newGame() {
    this.gameState = {
      playerName: "",
      roomCode: "",
      isHost: false,
      players: [],
      currentPlayer: null,
      gamePhase: "entry",
      timer: 0,
      timerInterval: null,
      question: "",
      answer: "",
      answers: {},
      votes: {},
      isImposter: false,
      imposterQuestion: "",
    }

    this.switchPage("entry")
    this.resetForms()
  }

  resetForms() {
    document.getElementById("player-name").value = ""
    document.getElementById("room-code").value = ""
    document.getElementById("room-code-group").style.display = "none"
    document.getElementById("start-btn").style.display = "none"
    document.getElementById("create-room-btn").disabled = false
    document.getElementById("join-room-btn").disabled = false
    document.getElementById("join-room-btn").textContent = "🎯 Join Room"

    // Reset input styles
    document.querySelectorAll("input").forEach((input) => {
      input.classList.remove("success", "error")
    })
  }

  switchPage(pageId) {
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active")
    })
    document.getElementById(`${pageId}-page`).classList.add("active")
    this.currentPage = pageId
  }

  playBeep() {
    // Create a simple beep sound
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
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new VLImposter2()
})
