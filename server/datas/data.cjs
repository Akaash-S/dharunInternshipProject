const express = require('express');
const router = express.Router();
const ExcelJS = require("exceljs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "../chat.db"));

// Export messages as Excel
router.get("/api/export/messages", async (req, res) => {
    db.all("SELECT * FROM messages ORDER BY id ASC", async (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch messages" });
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
});

// Export users as Excel
router.get("/api/export/users", async (req, res) => {
    db.all("SELECT * FROM users ORDER BY id ASC", async (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch users" });
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
});

// Export rooms as Excel
router.get("/api/export/rooms", async (req, res) => {
    db.all("SELECT * FROM rooms ORDER BY id ASC", async (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch rooms" });
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
});

// Export all data as JSON
router.get("/api/export/all", async (req, res) => {
    const getAll = (table) => new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table}`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
    try {
        const [users, rooms, messages] = await Promise.all([
            getAll('users'),
            getAll('rooms'),
            getAll('messages'),
        ]);
        res.json({ users, rooms, messages });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch all data" });
    }
});

// Return users as JSON
router.get("/api/export/users/json", (req, res) => {
    db.all("SELECT * FROM users ORDER BY id ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch users" });
        res.json(rows);
    });
});

// Return rooms as JSON
router.get("/api/export/rooms/json", (req, res) => {
    db.all("SELECT * FROM rooms ORDER BY id ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch rooms" });
        res.json(rows);
    });
});

module.exports = router;

