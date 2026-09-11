
const { io } = require("socket.io-client");

// --- Configuration ---
const SERVER_URL = "http://localhost:3000";
const DOCUMENT_ID = "68bd4b58780220a1c785a59b"; // A unique ID for the document room

// --- Create a client socket ---
const socket = io(SERVER_URL);

// --- Event Listeners ---

// 1. Listen for connection errors
socket.on("connect_error", (err) => {
  console.error(`❌ Connection Error: ${err.message}`);
  console.error("   Please ensure the server is running on the correct URL and that there are no firewall or CORS issues.");
});

// 2. Fired upon a successful connection
socket.on("connect", () => {
  console.log(`✅ Connected to server with socket ID: ${socket.id}`);

  // Join the document room
  console.log(`Joining document room: ${DOCUMENT_ID}...`);
  socket.emit("join_document", DOCUMENT_ID);

  // Simulate sending a change after a delay
  setTimeout(() => {
    const changes = {
      newContent: "This is a test change from the client script!",
    };
    console.log("-> Sending changes to the server...");
    socket.emit("send_changes", { documentId: DOCUMENT_ID, changes });
  }, 2000); // Wait 2 seconds before sending
});

// 4. Fired when we receive changes from another client
socket.on("receive_changes", (changes) => {
  console.log("<- Received changes from another client:", changes);
});

// 5. Fired on disconnection
socket.on("disconnect", () => {
  console.log("🔌 Disconnected from server.");
});

// 6. Fired if the server sends an error
socket.on("error_applying_changes", (error) => {
    console.error("❌ Server reported an error:", error);
});


// --- Cleanly disconnect after a few seconds ---
setTimeout(() => {
  console.log("Disconnecting...");
  socket.disconnect();
}, 4000); // Disconnect after 4 seconds




