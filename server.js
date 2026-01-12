const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// DATABASE CONFIGURATION
const dbDir = process.env.RENDER ? '/data' : '.';
const dbPath = path.join(dbDir, 'vende_ya.db');

let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("Disk Error, using local fallback...");
        db = new sqlite3.Database('./vende_ya.db');
    }
    console.log("Database initialized.");
    
    // FORCE TABLE CREATION IMMEDIATELY
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
    )`, (tableErr) => {
        if (tableErr) console.error("Table Error:", tableErr.message);
        else console.log("Table 'listings' is ready to go.");
    });
});

// HOME ROUTE (To avoid "Cannot GET /" error)
app.get('/', (req, res) => {
    res.send("<h1>Vende Ya Backend is Live!</h1><p>Database Path: " + dbPath + "</p>");
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
        res.json(rows || []);
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

// AUTO-DELETE (Every hour)
cron.schedule('0 * * * *', () => {
    db.run("DELETE FROM listings WHERE created_at <= datetime('now', '-3 days')");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
