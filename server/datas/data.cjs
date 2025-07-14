const express = require('express');
const router = express.Router();
const ExcelJS = require("exceljs");
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require("path");

// Supabase client setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Export messages as Excel
router.get("/api/export/messages", async (req, res) => {
    const { data: rows, error } = await supabase.from('messages').select('id, room_id, sender, content, file_url as fileUrl, file_name as fileName, file_size as fileSize, time').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: "Failed to fetch messages" });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Messages");
    worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Room ID", key: "room_id", width: 20 },
        { header: "Sender", key: "sender", width: 30 },
        { header: "Content", key: "content", width: 40 },
        { header: "File Name", key: "file_name", width: 30 },
        { header: "File Size", key: "file_size", width: 15 },
        { header: "Time", key: "time", width: 20 },
    ];
    rows.forEach(row => worksheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=messages.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

// Export users as Excel
router.get("/api/export/users", async (req, res) => {
    const { data: rows, error } = await supabase.from('users').select('*').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: "Failed to fetch users" });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");
    worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Email", key: "email", width: 30 },
        { header: "Password (hashed)", key: "password", width: 40 },
        { header: "Avatar URL", key: "avatar_url", width: 40 },
    ];
    rows.forEach(row => worksheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

// Export rooms as Excel
router.get("/api/export/rooms", async (req, res) => {
    const { data: rows, error } = await supabase.from('rooms').select('*').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: "Failed to fetch rooms" });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rooms");
    worksheet.columns = [
        { header: "ID", key: "id", width: 20 },
        { header: "Name", key: "name", width: 30 },
    ];
    rows.forEach(row => worksheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=rooms.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

// Export all data as JSON
router.get("/api/export/all", async (req, res) => {
    try {
        const [{ data: users, error: usersErr }, { data: rooms, error: roomsErr }, { data: messages, error: messagesErr }] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('rooms').select('*'),
            supabase.from('messages').select('*'),
        ]);
        if (usersErr || roomsErr || messagesErr) throw new Error('Failed to fetch all data');
        res.json({ users, rooms, messages });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch all data" });
    }
});

// Return users as JSON
router.get("/api/export/users/json", async (req, res) => {
    const { data: rows, error } = await supabase.from('users').select('*').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: "Failed to fetch users" });
    res.json(rows);
});

// Return rooms as JSON
router.get("/api/export/rooms/json", async (req, res) => {
    const { data: rows, error } = await supabase.from('rooms').select('*').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: "Failed to fetch rooms" });
    res.json(rows);
});

module.exports = router;

