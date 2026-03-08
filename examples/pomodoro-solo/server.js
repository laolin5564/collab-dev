const express = require('express');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SALT_ROUNDS = 10;

// Database setup
const db = new Database(path.join(__dirname, 'pomodoro.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    taskName TEXT NOT NULL,
    estimatedPomodoros INTEGER NOT NULL DEFAULT 1,
    completedPomodoros INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS pomodoros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    taskId INTEGER,
    mode TEXT NOT NULL DEFAULT 'focus',
    duration INTEGER NOT NULL,
    completedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE SET NULL
  );
`);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SSE connections: Map<userId, Set<{id, res}>>
const sseClients = new Map();
let connectionIdCounter = 0;

function broadcastToUser(userId, event, data, excludeConnectionId) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.id !== excludeConnectionId) {
      client.res.write(payload);
    }
  }
}

function getOnlineUserCount() {
  return sseClients.size;
}

function broadcastOnlineCount() {
  const count = getOnlineUserCount();
  const payload = `event: onlineCount\ndata: ${JSON.stringify({ count })}\n\n`;
  for (const clients of sseClients.values()) {
    for (const client of clients) {
      client.res.write(payload);
    }
  }
}

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const trimmed = username.trim();
    if (trimmed.length < 1 || trimmed.length > 50) return res.status(400).json({ error: 'Username must be 1-50 characters' });
    if (password.length < 4 || password.length > 100) return res.status(400).json({ error: 'Password must be 4-100 characters' });

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmed);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.prepare('INSERT INTO users (username, passwordHash) VALUES (?, ?)').run(trimmed, passwordHash);
    const token = jwt.sign({ userId: result.lastInsertRowid, username: trimmed }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: trimmed });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const trimmed = username.trim();

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmed);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, username: trimmed }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: trimmed });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Tasks routes
app.get('/api/tasks', authenticate, (req, res) => {
  const tasks = db.prepare(`
    SELECT id, taskName, estimatedPomodoros, completedPomodoros, completed, createdAt
    FROM tasks WHERE userId = ? ORDER BY completed ASC, createdAt DESC
  `).all(req.userId);
  res.json(tasks);
});

app.post('/api/tasks', authenticate, (req, res) => {
  const { taskName, estimatedPomodoros } = req.body;
  if (!taskName || !taskName.trim()) return res.status(400).json({ error: 'Task name required' });
  const trimmedName = taskName.trim();
  if (trimmedName.length > 100) return res.status(400).json({ error: 'Task name max 100 characters' });

  const est = parseInt(estimatedPomodoros, 10);
  if (!Number.isInteger(est) || est < 1 || est > 20) return res.status(400).json({ error: 'Estimated pomodoros must be 1-20' });

  const result = db.prepare('INSERT INTO tasks (userId, taskName, estimatedPomodoros) VALUES (?, ?, ?)').run(req.userId, trimmedName, est);
  const task = db.prepare('SELECT id, taskName, estimatedPomodoros, completedPomodoros, completed, createdAt FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  const connId = req.headers['x-connection-id'];
  broadcastToUser(req.userId, 'tasksUpdated', {}, connId ? parseInt(connId, 10) : undefined);
  res.json(task);
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { completed, taskName } = req.body;
  if (taskName !== undefined) {
    const trimmed = taskName.trim();
    if (!trimmed || trimmed.length > 100) return res.status(400).json({ error: 'Invalid task name' });
    db.prepare('UPDATE tasks SET taskName = ? WHERE id = ?').run(trimmed, task.id);
  }
  if (completed !== undefined) {
    db.prepare('UPDATE tasks SET completed = ? WHERE id = ?').run(completed ? 1 : 0, task.id);
  }

  const updated = db.prepare('SELECT id, taskName, estimatedPomodoros, completedPomodoros, completed, createdAt FROM tasks WHERE id = ?').get(task.id);
  const connId = req.headers['x-connection-id'];
  broadcastToUser(req.userId, 'tasksUpdated', {}, connId ? parseInt(connId, 10) : undefined);
  res.json(updated);
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND userId = ?').get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  const connId = req.headers['x-connection-id'];
  broadcastToUser(req.userId, 'tasksUpdated', {}, connId ? parseInt(connId, 10) : undefined);
  res.json({ success: true });
});

// Pomodoros
app.post('/api/pomodoros', authenticate, (req, res) => {
  const { taskId, mode, duration } = req.body;
  const validModes = ['focus', 'shortBreak', 'longBreak'];
  if (!validModes.includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
  if (!Number.isInteger(duration) || duration < 1) return res.status(400).json({ error: 'Invalid duration' });

  if (taskId) {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND userId = ?').get(taskId, req.userId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
  }

  const result = db.prepare('INSERT INTO pomodoros (userId, taskId, mode, duration) VALUES (?, ?, ?, ?)').run(req.userId, taskId || null, mode, duration);

  // Increment completedPomodoros on the task if focus mode
  if (taskId && mode === 'focus') {
    db.prepare('UPDATE tasks SET completedPomodoros = completedPomodoros + 1 WHERE id = ?').run(taskId);
  }

  const pomodoro = db.prepare('SELECT id, completedAt FROM pomodoros WHERE id = ?').get(result.lastInsertRowid);
  const connId = req.headers['x-connection-id'];
  broadcastToUser(req.userId, 'pomodoroCompleted', {}, connId ? parseInt(connId, 10) : undefined);
  broadcastToUser(req.userId, 'tasksUpdated', {}, connId ? parseInt(connId, 10) : undefined);
  res.json(pomodoro);
});

// Stats
app.get('/api/stats', authenticate, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const todayStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as minutes
    FROM pomodoros WHERE userId = ? AND mode = 'focus' AND date(completedAt) = ?
  `).get(req.userId, today);

  // Last 7 days
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM pomodoros
      WHERE userId = ? AND mode = 'focus' AND date(completedAt) = ?
    `).get(req.userId, dateStr);
    week.push({ date: dateStr, count: row.count });
  }

  // Streak
  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM pomodoros
      WHERE userId = ? AND mode = 'focus' AND date(completedAt) = ?
    `).get(req.userId, dateStr);
    if (row.count > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  res.json({ today: { count: todayStats.count, minutes: todayStats.minutes }, week, streak });
});

// SSE
app.get('/api/stream', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token required' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = decoded.userId;
  const connId = ++connectionIdCounter;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ connected: true, connectionId: connId })}\n\n`);

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  const client = { id: connId, res };
  sseClients.get(userId).add(client);
  broadcastOnlineCount();

  req.on('close', () => {
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) sseClients.delete(userId);
    }
    broadcastOnlineCount();
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pomodoro server running on http://0.0.0.0:${PORT}`);
});
