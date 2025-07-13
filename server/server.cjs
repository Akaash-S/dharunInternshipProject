// websocket-server.js
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const ExcelJS = require("exceljs");
const exportRoutes = require("./datas/data.cjs");
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/chat" });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// In-memory store for rooms
// Now structured as { [roomId]: { name, messages: [] } }
const rooms = {
  "room-3": {
    name: "General Chat",
    messages: [],
  },
};

// SQLite DB setup
const db = new sqlite3.Database(path.join(__dirname, "chat.db"));

// Multer setup for avatar uploads
const upload = multer({
  dest: path.join(__dirname, "uploads/avatars"),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

// Ensure uploads/avatars directory exists
fs.mkdirSync(path.join(__dirname, "uploads/avatars"), { recursive: true });

// Add file_data column if not present (manual migration may be needed)
// db.run(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_data BLOB`); // REMOVE THIS LINE: SQLite does not support IF NOT EXISTS for ADD COLUMN. Do schema changes manually if needed.

// Save chat message to SQLite
function saveMessageToDB({ room, sender, content, fileUrl, fileName, fileSize, time, fileData }) {
  db.run(
    `INSERT INTO messages (room_id, sender, content, file_url, file_name, file_size, file_data, time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [room, sender, content, fileUrl || null, fileName || null, fileSize || null, fileData || null, time],
    (err) => {
      if (err) console.error('Failed to save message to DB:', err);
    }
  );
}

// WebSocket connection
wss.on("connection", (ws) => {
  ws.roomId = "room-3"; // Default fallback room

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "join") {
        const { room } = data;
        if (!rooms[room]) {
          // Auto-create if not found
          rooms[room] = { name: room, messages: [] };
        }
        ws.roomId = room;

      } else if (data.type === "message") {
        const { room, content, sender, time, fileUrl, fileName, fileSize, id, fileData } = data;
        const msgObj = { content, sender, time };
        if (fileUrl && fileName && fileSize) {
          msgObj.fileUrl = fileUrl;
          msgObj.fileName = fileName;
          msgObj.fileSize = fileSize;
        }
        msgObj.id = id || uuidv4();
        // Save message to room history (in-memory)
        if (rooms[room]) {
          rooms[room].messages.push(msgObj);
        }
        // Save message to DB (now with fileData)
        saveMessageToDB({ room, sender, content, fileUrl, fileName, fileSize, time, fileData });
        // Broadcast to everyone in that room
        wss.clients.forEach((client) => {
          if (
            client.readyState === 1 &&
            client.roomId === room
          ) {
            client.send(JSON.stringify({ type: "message", message: msgObj }));
          }
        });
      }
    } catch (err) {
      console.error("❌ Failed to process message:", err);
    }
  });

  ws.on("close", () => {
    console.log("👋 Client disconnected");
  });
});

// REST: Create a new chat room (persisted in DB and in-memory)
app.post("/api/rooms", (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: "Room id and name are required" });
  }
  // Insert into SQLite
  db.run(
    "INSERT INTO rooms (id, name) VALUES (?, ?)",
    [id, name],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Room already exists" });
        }
        return res.status(500).json({ error: "Failed to create room" });
      }
      // Also update in-memory rooms
      if (!rooms[id]) {
        rooms[id] = { name, messages: [] };
      }
      return res.status(201).json({ message: "Room created successfully" });
    }
  );
});

// REST: Get all chat rooms (id + name only, from DB)
app.get("/api/rooms", (req, res) => {
  db.all("SELECT id, name FROM rooms ORDER BY id ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch rooms" });
    // Also update in-memory rooms for real-time
    rows.forEach((room) => {
      if (!rooms[room.id]) {
        rooms[room.id] = { name: room.name, messages: [] };
      }
    });
    res.json(rows);
  });
});

// REST: Get messages of a specific room (from DB)
app.get("/api/rooms/:roomId/messages", (req, res) => {
  const { roomId } = req.params;
  db.all(
    `SELECT sender, content, file_url as fileUrl, file_name as fileName, file_size as fileSize, time FROM messages WHERE room_id = ? ORDER BY id ASC`,
    [roomId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch messages" });
      res.json(rows);
    }
  );
});

// Signup endpoint
app.post("/api/signup", upload.single("avatar"), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    // Check if user already exists
    db.get("SELECT id FROM users WHERE email = ?", [email], async (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (row) return res.status(400).json({ error: "Email already registered" });
      // Hash password
      const hash = await bcrypt.hash(password, 10);
      // Handle avatar
      let avatar_url = null;
      if (req.file) {
        const ext = path.extname(req.file.originalname) || ".png";
        const newFilename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
        const newPath = path.join(req.file.destination, newFilename);
        fs.renameSync(req.file.path, newPath);
        avatar_url = `/uploads/avatars/${newFilename}`;
      }
      // Insert user
      db.run(
        "INSERT INTO users (email, password, avatar_url) VALUES (?, ?, ?)",
        [email, hash, avatar_url],
        function (err) {
          if (err) return res.status(500).json({ error: "Failed to create user" });
          return res.status(201).json({ message: "Signup successful" });
        }
      );
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    db.get("SELECT id, email, password, avatar_url FROM users WHERE email = ?", [email], async (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(400).json({ error: "Invalid email or password" });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ error: "Invalid email or password" });
      // Exclude password from response
      const { password: _, ...userInfo } = user;
      return res.status(200).json({ message: "Login successful", user: userInfo });
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});               

app.use(exportRoutes);


// Start the server
const PORT = 8000;
server.listen(PORT, () =>
  console.log(`✅ WebSocket server live at ws://localhost:${PORT}/ws/chat`)
);
