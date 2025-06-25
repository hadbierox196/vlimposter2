// Connection test utility - Add this to test Socket.IO connectivity
async function testConnection() {
  console.log("🧪 Testing connection to backend...")

  try {
    // Test REST API first
    const healthResponse = await fetch("/api/health")
    const healthData = await healthResponse.json()
    console.log("✅ REST API working:", healthData)

    // Test Socket.IO endpoint
    const socketResponse = await fetch("/api/socket")
    const socketData = await socketResponse.json()
    console.log("✅ Socket.IO endpoint working:", socketData)

    // Test actual Socket.IO connection
    const io = window.io // Declare the io variable
    const testSocket = io(window.location.origin, {
      path: "/api/socket",
      transports: ["polling"], // Start with polling only
      timeout: 10000,
      forceNew: true,
    })

    testSocket.on("connect", () => {
      console.log("✅ Socket.IO connection successful!")
      console.log("🚀 Transport:", testSocket.io.engine.transport.name)
      testSocket.disconnect()
    })

    testSocket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection failed:", error)
      testSocket.disconnect()
    })
  } catch (error) {
    console.error("❌ Connection test failed:", error)
  }
}

// Run test when page loads
if (typeof window !== "undefined") {
  window.testConnection = testConnection
}
