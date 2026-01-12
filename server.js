const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// DATABASE CONFIGURATION
const dbDir = process.env.RENDER ? '/data' : '.';
if (process.env.RENDER && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'vende_ya.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Connection Error:", err.message);
    else console.log("Connected to database at:", dbPath);
});

// INITIALIZE TABLE
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        image_url TEXT,
        title TEXT,
        category TEXT,
        price TEXT,
        description TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// AUTO-DELETE (Runs every hour - deletes ads older than 3 days)
cron.schedule('0 * * * *', () => {
    db.run("DELETE FROM listings WHERE created_at <= datetime('now', '-3 days')");
});

// API: GET LISTINGS
app.get('/api/listings', (req, res) => {
    const { category } = req.query;
    let query = "SELECT * FROM listings ORDER BY id DESC";
    let params = [];

    if (category && category !== 'View All') {
        query = "SELECT * FROM listings WHERE category = ? ORDER BY id DESC";
        params = [category];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: POST NEW AD
app.post('/api/post', (req, res) => {
    const { title, price, category, description, phone, address, image_url } = req.body;
    const dateStr = new Date().toLocaleDateString();

    const sql = `INSERT INTO listings (date, image_url, title, category, price, description, phone, address) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [dateStr, image_url, title, category, price, description, phone, address];

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, status: "Success" });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server is live on port ${PORT}`));
