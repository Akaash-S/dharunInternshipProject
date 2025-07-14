// server/app.cjs
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer setup for avatars and chat files
const avatarUpload = multer({ dest: path.join(__dirname, 'uploads/avatars'), limits: { fileSize: 2 * 1024 * 1024 } });
const chatFileUpload = multer({ dest: path.join(__dirname, 'uploads/chat-files'), limits: { fileSize: 10 * 1024 * 1024 } });

// JWT middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json({ error: 'No token provided' });
  }
}

// --- ROUTES ---

// Signup
app.post('/api/signup', avatarUpload.single('avatar'), async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const { data: existingUser, error: userError } = await supabase.from('users').select('id').eq('email', email).single();
    if (userError && userError.code !== 'PGRST116') throw userError;
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    let avatar_url = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.png';
      const newFilename = `${Date.now()}_${uuidv4()}${ext}`;
      const buffer = fs.readFileSync(req.file.path);
      const { error: uploadError } = await supabase.storage.from('avatars').upload(newFilename, buffer, { contentType: req.file.mimetype, upsert: true });
      fs.unlinkSync(req.file.path);
      if (uploadError) return res.status(500).json({ error: uploadError.message });
      avatar_url = supabase.storage.from('avatars').getPublicUrl(newFilename).data.publicUrl;
    }
    const { error } = await supabase.from('users').insert([{ email, password: hash, name: name || email.split('@')[0], avatar_url }]);
    if (error) return res.status(500).json({ error: 'Failed to create user' });
    res.status(201).json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const { data: user, error } = await supabase.from('users').select('id, email, password, name, avatar_url').eq('email', email).single();
    if (error) return res.status(400).json({ error: 'Invalid email or password' });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });
    const { password: _, ...userInfo } = user;
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: 'Login successful', user: userInfo, token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Room
app.post('/api/rooms', authenticateJWT, async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'Room id and name are required' });
    const { error } = await supabase.from('rooms').insert([{ id, name }]);
    if (error) return res.status(500).json({ error: 'Failed to create room' });
    res.status(201).json({ message: 'Room created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const { data: rooms, error } = await supabase.from('rooms').select('id, name').order('id', { ascending: false });
    if (error) return res.status(500).json({ error: 'Failed to fetch rooms' });
    res.json(rooms || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Messages for a Room
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, room_id, sender, content, file_url as fileUrl, file_name as fileName, file_size as fileSize, time')
      .eq('room_id', roomId)
      .order('time', { ascending: true });
    if (error) return res.status(500).json({ error: 'Failed to fetch messages' });
    res.json(messages || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Message
app.post('/api/rooms/:roomId/messages', authenticateJWT, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, fileUrl, fileName, fileSize } = req.body;
    if (!content && !fileUrl) return res.status(400).json({ error: 'Message content or file required' });
    const message = {
      id: uuidv4(),
      room_id: roomId,
      sender: req.user.name || req.user.email,
      content: content || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      time: new Date().toISOString()
    };
    const { error } = await supabase.from('messages').insert([message]);
    if (error) return res.status(500).json({ error: 'Failed to send message' });
    res.status(201).json({ message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// File Upload
app.post('/api/upload', authenticateJWT, chatFileUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname) || '';
    const newFilename = `${Date.now()}_${uuidv4()}${ext}`;
    const buffer = fs.readFileSync(req.file.path);
    const { error: uploadError } = await supabase.storage.from('chat-files').upload(newFilename, buffer, { contentType: req.file.mimetype, upsert: true });
    fs.unlinkSync(req.file.path);
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    const fileUrl = supabase.storage.from('chat-files').getPublicUrl(newFilename).data.publicUrl;
    res.status(200).json({ fileUrl, fileName: req.file.originalname, fileSize: req.file.size, storageName: newFilename });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ REST API available at http://localhost:${PORT}/api`);
}); 