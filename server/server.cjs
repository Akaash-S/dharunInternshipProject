// websocket-server.js
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const ExcelJS = require("exceljs");
const exportRoutes = require("./datas/data.cjs");
const jwt = require('jsonwebtoken');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/chat" });

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supabase client setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Constants
const MESSAGE_TYPES = {
  JOIN: 'join',
  LEAVE: 'leave',
  MESSAGE: 'message',
  ERROR: 'error',
  ROOM_INFO: 'room_info',
  USER_LIST: 'user_list',
  TYPING: 'typing',
  PING: 'ping',
  PONG: 'pong',
  WELCOME: 'welcome'
};

const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, "uploads/avatars"),
  path.join(__dirname, "uploads/chat-files")
];

uploadDirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Multer configurations
const avatarUpload = multer({
  dest: path.join(__dirname, "uploads/avatars"),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

const chatFileUpload = multer({
  dest: path.join(__dirname, "uploads/chat-files"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed.'));
    }
  }
});

// Database Helper Functions
class DatabaseManager {
  static async initializeDatabase() {
    try {
      // Test connection
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        console.error('❌ Database connection failed:', error);
        return false;
      }
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      return false;
    }
  }

  static async saveMessage({ room, sender, content, fileUrl, fileName, fileSize, time, fileData, id }) {
    try {
      const { error } = await supabase.from('messages').insert([
        {
          id: id || uuidv4(),
          room_id: room,
          sender,
          content,
          file_url: fileUrl || null,
          file_name: fileName || null,
          file_size: fileSize || null,
          file_data: fileData || null,
          time: time || new Date().toISOString()
        }
      ]);
      
      if (error) {
        console.error('❌ Failed to save message:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Database save error:', error);
      throw error;
    }
  }

  static async getRoomMessages(roomId, limit = 100) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, sender, content, file_url as fileUrl, file_name as fileName, file_size as fileSize, time')
        .eq('room_id', roomId)
        .order('time', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return messages || [];
    } catch (error) {
      console.error('❌ Failed to fetch room messages:', error);
      return [];
    }
  }

  static async getRoomInfo(roomId) {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('id', roomId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Room not found
        }
        throw error;
      }
      
      return room;
    } catch (error) {
      console.error('❌ Failed to fetch room info:', error);
      return null;
    }
  }

  static async createRoom(id, name) {
    try {
      const { error } = await supabase.from('rooms').insert([
        { id, name }
      ]);
      
      if (error) {
        if (error.message && error.message.includes("duplicate key")) {
          throw new Error("Room already exists");
        }
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to create room:', error);
      throw error;
    }
  }

  static async getAllRooms() {
    try {
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('id, name')
        .order('id', { ascending: false });
      
      if (error) throw error;
      return rooms || [];
    } catch (error) {
      console.error('❌ Failed to fetch rooms:', error);
      return [];
    }
  }
}

// File Upload Helper
class FileUploadManager {
  static async uploadToSupabaseStorage(bucket, filePath, fileName, mimetype) {
    try {
      const buffer = fs.readFileSync(filePath);
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: mimetype,
          upsert: true,
        });
      
      // Clean up local file
      try { fs.unlinkSync(filePath); } catch {}
      
      if (error) {
        console.error('❌ Storage upload error:', error);
        throw new Error('Failed to upload to storage: ' + error.message);
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('❌ File upload error:', error);
      throw error;
    }
  }
}

// WebSocket Manager
class WebSocketManager {
  constructor() {
    this.rooms = new Map();
    this.userSessions = new Map();
    this.heartbeatInterval = 30000; // 30 seconds
    this.setupHeartbeat();
  }

  setupHeartbeat() {
    setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.readyState === WS_READY_STATE.OPEN) {
          if (ws.isAlive === false) {
            ws.terminate();
            this.handleUserDisconnect(ws);
            return;
          }
          ws.isAlive = false;
          ws.ping();
        }
      });
    }, this.heartbeatInterval);
  }

  async initializeRoom(roomId) {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    try {
      const roomInfo = await DatabaseManager.getRoomInfo(roomId);
      const messages = await DatabaseManager.getRoomMessages(roomId, 50);
      
      const room = {
        id: roomId,
        name: roomInfo?.name || roomId,
        users: new Set(),
        messages: messages,
        createdAt: roomInfo?.created_at || new Date().toISOString()
      };

      this.rooms.set(roomId, room);
      return room;
    } catch (error) {
      console.error('❌ Failed to initialize room:', error);
      
      // Fallback room
      const fallbackRoom = {
        id: roomId,
        name: roomId,
        users: new Set(),
        messages: [],
        createdAt: new Date().toISOString()
      };
      
      this.rooms.set(roomId, fallbackRoom);
      return fallbackRoom;
    }
  }

  async handleJoinRoom(ws, data) {
    const { room: roomId, user } = data;
    
    if (!roomId) {
      this.sendError(ws, 'Room ID is required');
      return;
    }

    try {
      // Leave previous room if exists
      if (ws.roomId && ws.roomId !== roomId) {
        await this.handleLeaveRoom(ws);
      }

      // Initialize room
      const room = await this.initializeRoom(roomId);
      
      // Set user properties
      ws.roomId = roomId;
      ws.userId = user?.id || uuidv4();
      ws.userName = user?.name || user?.email || 'Anonymous';
      ws.userEmail = user?.email;
      ws.isAlive = true;

      // Add user to room
      room.users.add(ws.userId);
      
      // Store user session
      this.userSessions.set(ws.userId, {
        ws,
        roomId,
        userName: ws.userName,
        userEmail: ws.userEmail,
        joinedAt: new Date().toISOString()
      });

      // Send room info to user
      this.sendMessage(ws, {
        type: MESSAGE_TYPES.ROOM_INFO,
        room: {
          id: roomId,
          name: room.name,
          userCount: room.users.size,
          messages: room.messages
        }
      });

      // Broadcast user list update
      this.broadcastToRoom(roomId, {
        type: MESSAGE_TYPES.USER_LIST,
        users: Array.from(room.users),
        userCount: room.users.size
      });

      console.log(`✅ User ${ws.userName} joined room: ${roomId}`);
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      this.sendError(ws, 'Failed to join room');
    }
  }

  async handleLeaveRoom(ws) {
    const roomId = ws.roomId;
    
    if (!roomId || !this.rooms.has(roomId)) {
      return;
    }

    try {
      const room = this.rooms.get(roomId);
      room.users.delete(ws.userId);
      
      // Remove user session
      this.userSessions.delete(ws.userId);

      // Broadcast user list update
      this.broadcastToRoom(roomId, {
        type: MESSAGE_TYPES.USER_LIST,
        users: Array.from(room.users),
        userCount: room.users.size
      });

      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🧹 Cleaned up empty room: ${roomId}`);
      }

      console.log(`👋 User ${ws.userName} left room: ${roomId}`);
    } catch (error) {
      console.error('❌ Failed to leave room:', error);
    }
  }

  async handleMessage(ws, data) {
    const { room: roomId, content, sender, time, fileUrl, fileName, fileSize, id, fileData } = data;

    // Validation
    if (!roomId || !content || !sender) {
      this.sendError(ws, 'Missing required message fields');
      return;
    }

    if (ws.roomId !== roomId) {
      this.sendError(ws, 'Not authorized to send messages to this room');
      return;
    }

    try {
      const messageId = id || uuidv4();
      const timestamp = time || new Date().toISOString();

      // Create message object
      const msgObj = {
        id: messageId,
        content,
        sender,
        time: timestamp,
        roomId
      };

      // Add file data if present
      if (fileUrl && fileName && fileSize) {
        msgObj.fileUrl = fileUrl;
        msgObj.fileName = fileName;
        msgObj.fileSize = fileSize;
      }

      // Save to database
      await DatabaseManager.saveMessage({
        room: roomId,
        sender,
        content,
        fileUrl,
        fileName,
        fileSize,
        time: timestamp,
        fileData,
        id: messageId
      });

      // Add to room memory
      const room = this.rooms.get(roomId);
      if (room) {
        room.messages.push(msgObj);
        
        // Keep only last 100 messages in memory
        if (room.messages.length > 100) {
          room.messages = room.messages.slice(-100);
        }
      }

      // Broadcast to room
      this.broadcastToRoom(roomId, {
        type: MESSAGE_TYPES.MESSAGE,
        message: msgObj
      });

      console.log(`📨 Message sent in room ${roomId} by ${sender}`);
    } catch (error) {
      console.error('❌ Failed to process message:', error);
      this.sendError(ws, 'Failed to send message');
    }
  }

  handleTyping(ws, data) {
    const { room: roomId, user, isTyping } = data;
    
    if (ws.roomId !== roomId) {
      return;
    }

    this.broadcastToRoom(roomId, {
      type: MESSAGE_TYPES.TYPING,
      user,
      isTyping
    }, ws);
  }

  handleUserDisconnect(ws) {
    if (ws.roomId) {
      this.handleLeaveRoom(ws);
    }
  }

  broadcastToRoom(roomId, message, excludeWs = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.forEach(userId => {
      const userSession = this.userSessions.get(userId);
      if (userSession && userSession.ws !== excludeWs) {
        this.sendMessage(userSession.ws, message);
      }
    });
  }

  sendMessage(ws, message) {
    if (ws.readyState === WS_READY_STATE.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    }
  }

  sendError(ws, errorMessage) {
    this.sendMessage(ws, {
      type: MESSAGE_TYPES.ERROR,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  async processMessage(ws, rawMessage) {
    try {
      const data = JSON.parse(rawMessage);
      
      switch (data.type) {
        case MESSAGE_TYPES.JOIN:
          await this.handleJoinRoom(ws, data);
          break;
          
        case MESSAGE_TYPES.LEAVE:
          await this.handleLeaveRoom(ws);
          break;
          
        case MESSAGE_TYPES.MESSAGE:
          await this.handleMessage(ws, data);
          break;
          
        case MESSAGE_TYPES.TYPING:
          this.handleTyping(ws, data);
          break;
          
        case MESSAGE_TYPES.PING:
          this.sendMessage(ws, { type: MESSAGE_TYPES.PONG });
          break;
          
        default:
          this.sendError(ws, `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to process message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }
}

// Initialize WebSocket Manager
const wsManager = new WebSocketManager();

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection established');
  
  // Initialize connection properties
  ws.isAlive = true;
  ws.roomId = null;
  ws.userId = null;
  ws.userName = null;
  ws.userEmail = null;

  // Handle incoming messages
  ws.on('message', (message) => {
    wsManager.processMessage(ws, message);
  });

  // Handle pong responses
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  // Handle disconnection
  ws.on('close', (code, reason) => {
    console.log(`👋 Client disconnected - Code: ${code}, Reason: ${reason}`);
    wsManager.handleUserDisconnect(ws);
  });

  // Send welcome message
  wsManager.sendMessage(ws, {
    type: MESSAGE_TYPES.WELCOME,
    message: 'Connected to WebSocket server',
    timestamp: new Date().toISOString()
  });
});

// REST API Routes

// JWT middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json({ error: 'No token provided' });
  }
}

// Create a new chat room
app.post("/api/rooms", authenticateJWT, async (req, res) => {
  try {
    const { id, name } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ error: "Room id and name are required" });
    }

    await DatabaseManager.createRoom(id, name);
    
    // Initialize room in memory
    await wsManager.initializeRoom(id);
    
    res.status(201).json({ message: "Room created successfully" });
  } catch (error) {
    if (error.message === "Room already exists") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Get all chat rooms
app.get("/api/rooms", async (req, res) => {
  try {
    const rooms = await DatabaseManager.getAllRooms();
    res.json(rooms || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// Get messages of a specific room
app.get("/api/rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await DatabaseManager.getRoomMessages(roomId, 100);
    res.json(messages || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Export data from specific table
app.get("/api/data/export", async (req, res) => {
  try {
    const allowedTables = ["users", "rooms", "messages"];
    const table = req.query.table;
    
    if (!table || !allowedTables.includes(table)) {
      return res.status(400).json({ error: "Invalid or missing table name" });
    }
    
    const { data: rows, error } = await supabase.from(table).select('*');
    if (error) throw error;
    
    res.json(rows || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to export data" });
  }
});

// Chat file upload endpoint
app.post("/api/upload", authenticateJWT, chatFileUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname) || "";
    const newFilename = `${Date.now()}_${uuidv4()}${ext}`;
    
    const fileUrl = await FileUploadManager.uploadToSupabaseStorage(
      'chat-files',
      req.file.path,
      newFilename,
      req.file.mimetype
    );

    res.status(200).json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      storageName: newFilename
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// User signup endpoint
app.post("/api/signup", avatarUpload.single("avatar"), async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Handle avatar upload
    let avatarUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".png";
      const newFilename = `${Date.now()}_${uuidv4()}${ext}`;
      avatarUrl = await FileUploadManager.uploadToSupabaseStorage(
        'avatars',
        req.file.path,
        newFilename,
        req.file.mimetype
      );
    }

    // Create user
    const { error } = await supabase.from('users').insert([
      {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        avatar_url: avatarUrl,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) throw error;

    res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// User login endpoint (issue JWT)
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, name, avatar_url')
      .eq('email', email)
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(400).json({ error: "Invalid email or password" });
      }
      throw error;
    }
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    // Exclude password from response
    const { password: _, ...userInfo } = user;
    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: "Login successful", user: userInfo, token });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    connections: wss.clients.size,
    rooms: wsManager.rooms.size
  });
});

// Mount export routes
app.use(exportRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database and start server
async function startServer() {
  try {
    const isDbConnected = await DatabaseManager.initializeDatabase();
    if (!isDbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`✅ WebSocket server live at ws://localhost:${PORT}/ws/chat`);
      console.log(`🌐 REST API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();