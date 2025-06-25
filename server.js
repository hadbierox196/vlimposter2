// Local development server (not used in Vercel deployment)
const express = require("express")
const { createServer } = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
const httpServer = createServer(app)

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
)
app.use(express.json())

// Import API handlers
const socketHandler = require("./api/socket")
const roomsHandler = require("./api/rooms")
const healthHandler = require("./api/health")
const adminHandler = require("./api/admin")

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})

// Mock res.socket.server for local development
const mockRes = {
  socket: {
    server: httpServer,
  },
  setHeader: () => {},
  status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data), end: () => {} }),
  json: (data) => console.log("Response:", data),
  end: () => {},
}

// Initialize socket handler
httpServer.io = io
socketHandler({ method: "GET" }, mockRes)

// API routes
app.get("/api/health", (req, res) => {
  healthHandler(req, res)
})

app.all("/api/rooms", (req, res) => {
  roomsHandler(req, res)
})

app.all("/api/admin", (req, res) => {
  adminHandler(req, res)
})

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "VL Imposter 2 Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      rooms: "/api/rooms",
      admin: "/api/admin",
      socket: "/socket.io/",
    },
    documentation: "https://github.com/your-repo/vl-imposter-2",
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`🚀 VL Imposter 2 Backend running on port ${PORT}`)
  console.log(`📡 Socket.IO server ready`)
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🏠 Rooms API: http://localhost:${PORT}/api/rooms`)
  console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin`)
})

module.exports = app
