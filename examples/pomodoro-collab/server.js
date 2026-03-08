const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database ───
const db = new Database(path.join(__dirname, 'pomodoro.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
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
  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(userId);
  CREATE INDEX IF NOT EXISTS idx_pomodoros_user ON pomodoros(userId);
  CREATE INDEX IF NOT EXISTS idx_pomodoros_date ON pomodoros(completedAt);
`);

const VALID_MODES = ['focus', 'short', 'long'];

// ─── Prepared Statements ───
const stmt = {
  findUser: db.prepare('SELECT * FROM users WHERE username = ?'),
  createUser: db.prepare('INSERT INTO users (username, password) VALUES (?, ?)'),
  getTasks: db.prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY completed ASC, id DESC'),
  getTask: db.prepare('SELECT * FROM tasks WHERE id = ? AND userId = ?'),
  createTask: db.prepare('INSERT INTO tasks (userId, taskName, estimatedPomodoros) VALUES (?, ?, ?)'),
  updateTask: db.prepare('UPDATE tasks SET taskName = ?, completed = ?, completedPomodoros = ? WHERE id = ? AND userId = ?'),
  deleteTask: db.prepare('DELETE FROM tasks WHERE id = ? AND userId = ?'),
  incTaskPomodoro: db.prepare('UPDATE tasks SET completedPomodoros = completedPomodoros + 1 WHERE id = ? AND userId = ?'),
  createPomodoro: db.prepare('INSERT INTO pomodoros (userId, taskId, mode, duration) VALUES (?, ?, ?, ?)'),
  todayStats: db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(duration),0) as minutes FROM pomodoros
    WHERE userId = ? AND mode = 'focus' AND date(completedAt) = date('now')`),
  weekStats: db.prepare(`SELECT date(completedAt) as date, COUNT(*) as count FROM pomodoros
    WHERE userId = ? AND mode = 'focus' AND completedAt >= datetime('now', '-7 days')
    GROUP BY date(completedAt) ORDER BY date(completedAt)`),
  streak: db.prepare(`SELECT DISTINCT date(completedAt) as d FROM pomodoros
    WHERE userId = ? AND mode = 'focus' ORDER BY d DESC`),
};

// ─── Auth Middleware ───
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: '登录已过期' }); }
}

// ─── SSE Manager ─── DO NOT MODIFY
const sseClients = new Map();
function broadcastToUser(userId, event, data, excludeConnId) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [connId, c] of sseClients) {
    if (c.userId === userId && connId !== excludeConnId) c.res.write(msg);
  }
}
function broadcastOnlineCount() {
  const count = new Set([...sseClients.values()].map(c => c.userId)).size;
  const msg = `event: online-count\ndata: ${JSON.stringify({ count })}\n\n`;
  for (const c of sseClients.values()) c.res.write(msg);
}
setInterval(() => { for (const c of sseClients.values()) c.res.write(': heartbeat\n\n'); }, 30000);
// ─── END SSE Manager ───

// ─── Auth Routes ───
app.post('/api/auth/register', async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    if (username.length < 2 || username.length > 20 || !/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) {
      return res.status(400).json({ error: '用户名需2-20字符，仅支持字母数字下划线和中文' });
    }
    if (password.length < 6 || password.length > 50) {
      return res.status(400).json({ error: '密码需6-50字符' });
    }
    if (stmt.findUser.get(username)) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = stmt.createUser.run(username, hashed);
    const tokenVal = jwt.sign({ userId: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: tokenVal, username });
  } catch (err) {
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    const user = stmt.findUser.get(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const tokenVal = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: tokenVal, username });
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

// ─── Task Routes ───
app.get('/api/tasks', authMiddleware, (req, res) => {
  res.json(stmt.getTasks.all(req.user.userId));
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const taskName = (req.body.taskName || '').trim();
  if (taskName.length < 1 || taskName.length > 100) {
    return res.status(400).json({ error: '任务名需1-100字符' });
  }
  const estimatedPomodoros = parseInt(req.body.estimatedPomodoros);
  if (!Number.isInteger(estimatedPomodoros) || estimatedPomodoros < 1 || estimatedPomodoros > 20) {
    return res.status(400).json({ error: '预估番茄数需1-20的正整数' });
  }
  const result = stmt.createTask.run(req.user.userId, taskName, estimatedPomodoros);
  const excludeConnId = req.headers['x-conn-id'];
  broadcastToUser(req.user.userId, 'task-changed', {}, excludeConnId);
  res.json({ id: result.lastInsertRowid, taskName, estimatedPomodoros, completedPomodoros: 0, completed: 0 });
});

app.put('/api/tasks/:id', authMiddleware, (req, res) => {
  const task = stmt.getTask.get(req.params.id, req.user.userId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  const taskName = req.body.taskName !== undefined ? (req.body.taskName || '').trim() : task.taskName;
  const completed = req.body.completed !== undefined ? (req.body.completed ? 1 : 0) : task.completed;
  const completedPomodoros = req.body.completedPomodoros !== undefined ? req.body.completedPomodoros : task.completedPomodoros;
  stmt.updateTask.run(taskName, completed, completedPomodoros, task.id, req.user.userId);
  const excludeConnId = req.headers['x-conn-id'];
  broadcastToUser(req.user.userId, 'task-changed', {}, excludeConnId);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  const task = stmt.getTask.get(req.params.id, req.user.userId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  stmt.deleteTask.run(task.id, req.user.userId);
  const excludeConnId = req.headers['x-conn-id'];
  broadcastToUser(req.user.userId, 'task-changed', {}, excludeConnId);
  res.json({ ok: true });
});

// ─── Pomodoro Routes ───
app.post('/api/pomodoros', authMiddleware, (req, res) => {
  const { mode, duration, taskId } = req.body;
  if (!VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: '无效的模式' });
  }
  const dur = parseInt(duration);
  if (!Number.isInteger(dur) || dur < 1 || dur > 60) {
    return res.status(400).json({ error: '时长需1-60分钟' });
  }
  if (taskId) {
    const task = stmt.getTask.get(taskId, req.user.userId);
    if (!task) return res.status(404).json({ error: '任务不存在' });
  }
  stmt.createPomodoro.run(req.user.userId, taskId || null, mode, dur);
  if (taskId && mode === 'focus') {
    stmt.incTaskPomodoro.run(taskId, req.user.userId);
  }
  const excludeConnId = req.headers['x-conn-id'];
  broadcastToUser(req.user.userId, 'pomodoro-completed', {}, excludeConnId);
  res.json({ ok: true });
});

app.get('/api/stats', authMiddleware, (req, res) => {
  const today = stmt.todayStats.get(req.user.userId);
  const week = stmt.weekStats.all(req.user.userId);
  const days = stmt.streak.all(req.user.userId);
  let streak = 0;
  if (days.length > 0) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    let expected = todayDate;
    for (const row of days) {
      const d = new Date(row.d + 'T00:00:00');
      const diff = Math.round((expected - d) / 86400000);
      if (diff === 0) {
        streak++;
        expected = new Date(d.getTime() - 86400000);
      } else if (diff === 1 && streak === 0) {
        // today has no pomodoro yet, start from yesterday
        streak = 1;
        expected = new Date(d.getTime() - 86400000);
      } else {
        break;
      }
    }
  }
  res.json({ today: { count: today.count, minutes: today.minutes }, week, streak });
});

// ─── SSE ───
app.get('/api/stream', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: '未登录' });
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: '过期' }); }
  const connId = crypto.randomUUID();
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(`event: connected\ndata: ${JSON.stringify({ connId })}\n\n`);
  sseClients.set(connId, { res, userId: decoded.userId });
  broadcastOnlineCount();
  req.on('close', () => { sseClients.delete(connId); broadcastOnlineCount(); });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Pomodoro running at http://localhost:${PORT}`));
