const express = require('express')
const path = require('path')
const session = require('express-session')
const bcrypt = require('bcrypt')
const Database = require('better-sqlite3')

const DB_FILE = process.env.DB_FILE || 'data.db'
const PORT = process.env.PORT || 3000
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me'

const db = new Database(DB_FILE)

// Initialize tables
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(author_id) REFERENCES users(id)
)`).run()

// Ensure demo user exists
const demo = db.prepare('SELECT id FROM users WHERE username = ?').get('demo')
if(!demo){
  const hash = bcrypt.hashSync('demo', 10)
  db.prepare('INSERT INTO users (username, password_hash, email, created_at) VALUES (?, ?, ?, ?)')
    .run('demo', hash, 'demo@example.com', new Date().toISOString())
  console.log('Created demo/demo account')
}

const app = express()
app.use(express.json())

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}))

// Serve static site (index.html is at repo root)
app.use(express.static(path.join(__dirname)))

// --- Auth API ---
app.post('/api/signup', async (req, res) => {
  const { username, password, email } = req.body || {}
  if(!username || !password) return res.status(400).json({ error: 'username and password required' })
  try{
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if(exists) return res.status(409).json({ error: 'username taken' })
    const hash = await bcrypt.hash(password, 10)
    const info = db.prepare('INSERT INTO users (username, password_hash, email, created_at) VALUES (?, ?, ?, ?)')
      .run(username, hash, email || null, new Date().toISOString())
    req.session.user = { id: info.lastInsertRowid, username }
    return res.json({ ok: true, user: { id: info.lastInsertRowid, username } })
  }catch(err){
    console.error(err)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {}
  if(!username || !password) return res.status(400).json({ error: 'username and password required' })
  try{
    const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username)
    if(!user) return res.status(401).json({ error: 'invalid credentials' })
    const ok = await bcrypt.compare(password, user.password_hash)
    if(!ok) return res.status(401).json({ error: 'invalid credentials' })
    req.session.user = { id: user.id, username }
    return res.json({ ok: true, user: { id: user.id, username } })
  }catch(err){
    console.error(err)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/logout', (req, res) => {
  req.session.destroy(()=>{})
  res.json({ ok: true })
})

app.get('/api/current', (req, res) => {
  if(req.session && req.session.user) return res.json({ user: req.session.user })
  return res.json({ user: null })
})

// --- Posts ---
app.get('/api/posts', (req, res) => {
  try{
    const rows = db.prepare(`SELECT p.id, p.title, p.body, p.created_at, u.username AS author
      FROM posts p JOIN users u ON p.author_id = u.id
      ORDER BY p.id DESC`).all()
    res.json({ posts: rows })
  }catch(err){ console.error(err); res.status(500).json({ error: 'server error' }) }
})

app.post('/api/posts', (req, res) => {
  if(!(req.session && req.session.user)) return res.status(401).json({ error: 'not authenticated' })
  const { title, body } = req.body || {}
  if(!title) return res.status(400).json({ error: 'title required' })
  try{
    const info = db.prepare('INSERT INTO posts (author_id, title, body, created_at) VALUES (?, ?, ?, ?)')
      .run(req.session.user.id, title, body || '', new Date().toISOString())
    const post = db.prepare('SELECT p.id, p.title, p.body, p.created_at, u.username AS author FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?').get(info.lastInsertRowid)
    res.json({ ok: true, post })
  }catch(err){ console.error(err); res.status(500).json({ error: 'server error' }) }
})

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))
