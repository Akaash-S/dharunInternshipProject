const express = require('express');
const router = express.Router();
const ExcelJS = require("exceljs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "../chat.db"));

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

module.exports = router;

