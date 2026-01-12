const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const app = express();

// 1. MIDDLEWARE
app.use(cors()); // Allows GitHub Pages to connect
app.use(express.json());

// 2. DATABASE PATH (Fix for Render Persistent Storage)
// This uses the /data folder on Render, or the local folder on your PC
const dbDir = process.env.RENDER ? '/data' : '.';
const dbPath = path.join(dbDir, 'vende_ya.db');
const db = new sqlite3.Database(dbPath);

// 3. INITIALIZE TABLE
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

// 4. AUTO-DELETE EXPIRED POSTS (Every hour)
cron.schedule('0 * * * *', () => {
  console.log('Running expiry check...');
  db.run("DELETE FROM listings WHERE created_at <= datetime('now', '-3 days')");
});

// 5. API: GET LISTINGS
app.get('/api/listings', (req, res) => {
  const { category } = req.query;
  let query = "SELECT * FROM listings ORDER BY id DESC"; // Newest first
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

// 6. API: POST NEW AD
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

// 7. START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is live on port ${PORT}`);
});