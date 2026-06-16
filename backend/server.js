import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// ==================== DATABASE ====================
let db;
let dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();

async function initDatabase() {
  if (dbType === 'sqlite') {
    const sqlite3 = (await import('sqlite3')).default;
    const dbPath = process.env.DB_PATH || './data/business_tracker.db';

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('❌ SQLite connection error:', err);
      else console.log(`✅ SQLite connected at ${dbPath}`);
    });

    db.getAsync = (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });
    db.allAsync = (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    db.runAsync = (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  } else {
    const mysql = (await import('mysql2/promise')).default;
    db = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'pass',
      database: process.env.DB_NAME || 'business_tracker',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
}

async function query(sql, params = []) {
  if (dbType === 'sqlite') {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT')) {
      if (upper.includes('COUNT(') || upper.includes('SUM(')) return db.getAsync(sql, params);
      return db.allAsync(sql, params);
    } else {
      return db.runAsync(sql, params);
    }
  } else {
    const [rows] = await db.query(sql, params);
    return rows;
  }
}

// ==================== INIT DB ====================
async function initDB() {
  try {
    if (dbType === 'sqlite') {
      await query(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS revenue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        client_name TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS shopping_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        priority TEXT DEFAULT 'medium',
        bought INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        client_id INTEGER,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    }

    console.log(`✅ Database initialized (${dbType.toUpperCase()})`);
  } catch (err) {
    console.error('❌ Database init error:', err.message);
  }
}

// ==================== AUTH ====================
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key';

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (dbType === 'sqlite' ? existing : existing[0]) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hash = await bcrypt.hash(password, 10);
  await query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash]);
  res.status(201).json({ message: 'Registered successfully' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    const user = dbType === 'sqlite' ? users : users[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const users = await query('SELECT id, email FROM users WHERE id = ?', [req.user.id]);
  res.json(dbType === 'sqlite' ? users : users[0]);
});

// ==================== PROTECTED ROUTES ====================
app.post('/api/expenses', authenticateToken, async (req, res) => {
  const { date, category, amount, description } = req.body;
  if (!date || !category || !amount) return res.status(400).json({ error: 'Missing fields' });

  await query(
    `INSERT INTO expenses (date, category, amount, description) VALUES (?, ?, ?, ?)`,
    [date, category, parseFloat(amount), description || '']
  );
  res.status(201).json({ message: 'Expense added' });
});

app.get('/api/expenses', authenticateToken, async (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM expenses ORDER BY date DESC, created_at DESC';
  let params = [];
  if (category) {
    sql = 'SELECT * FROM expenses WHERE category = ? ORDER BY date DESC, created_at DESC';
    params = [category];
  }
  const expenses = await query(sql, params);
  res.json(expenses);
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  await query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// Revenue
app.post('/api/revenue', authenticateToken, async (req, res) => {
  const { date, client_name, amount, description } = req.body;
  if (!date || !client_name || !amount) return res.status(400).json({ error: 'Missing fields' });

  await query(
    `INSERT INTO revenue (date, client_name, amount, description) VALUES (?, ?, ?, ?)`,
    [date, client_name, parseFloat(amount), description || '']
  );
  res.status(201).json({ message: 'Revenue added' });
});

app.get('/api/revenue', authenticateToken, async (req, res) => {
  const { client_name } = req.query;
  let sql = 'SELECT * FROM revenue ORDER BY date DESC, created_at DESC';
  let params = [];
  if (client_name) {
    sql = 'SELECT * FROM revenue WHERE client_name = ? ORDER BY date DESC, created_at DESC';
    params = [client_name];
  }
  res.json(await query(sql, params));
});

app.delete('/api/revenue/:id', authenticateToken, async (req, res) => {
  await query('DELETE FROM revenue WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ==================== AI TOOLS ====================
const tools = [
  { type: "function", function: { name: "get_overall_profit", description: "Get total profit", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_total_revenue", description: "Get total revenue", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_total_expenses", description: "Get total expenses", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_expenses_for_period", description: "Get expenses for period (today, yesterday, this_week, last_week, this_month, last_month)", parameters: { type: "object", properties: { period: { type: "string" } }, required: ["period"] } } },
  { type: "function", function: { name: "get_revenues_for_period", description: "Get revenue for period", parameters: { type: "object", properties: { period: { type: "string" } }, required: ["period"] } } },
  { type: "function", function: { name: "get_profit_for_period", description: "Get profit for period", parameters: { type: "object", properties: { period: { type: "string" } }, required: ["period"] } } },
  { type: "function", function: { name: "get_business_overview", description: "Get business overview", parameters: { type: "object", properties: {} } } },
];

function getDateRangeForPeriod(period) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let startDate, endDate = todayStr;

  switch (period.toLowerCase()) {
    case 'today': startDate = todayStr; break;
    case 'yesterday':
      const y = new Date(today); y.setDate(y.getDate() - 1);
      startDate = endDate = y.toISOString().split('T')[0]; break;
    case 'this_week':
      const sw = new Date(today); sw.setDate(today.getDate() - today.getDay());
      startDate = sw.toISOString().split('T')[0]; endDate = todayStr; break;
    case 'last_week':
      const lwEnd = new Date(today); lwEnd.setDate(today.getDate() - today.getDay() - 1);
      const lwStart = new Date(lwEnd); lwStart.setDate(lwEnd.getDate() - 6);
      startDate = lwStart.toISOString().split('T')[0]; endDate = lwEnd.toISOString().split('T')[0]; break;
    case 'this_month': startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`; endDate = todayStr; break;
    case 'last_month':
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lmEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      startDate = lm.toISOString().split('T')[0]; endDate = lmEnd.toISOString().split('T')[0]; break;
    default: startDate = todayStr;
  }
  return { startDate, endDate };
}

async function getOverallProfit() {
  const rev = await query('SELECT SUM(amount) as total FROM revenue');
  const exp = await query('SELECT SUM(amount) as total FROM expenses');
  const r = dbType === 'sqlite' ? (rev?.total || 0) : (rev[0]?.total || 0);
  const e = dbType === 'sqlite' ? (exp?.total || 0) : (exp[0]?.total || 0);
  return { profit: r - e, revenue: r, expenses: e };
}

async function getTotalRevenue() {
  const result = await query('SELECT SUM(amount) as total FROM revenue');
  const total = dbType === 'sqlite' ? (result?.total || 0) : (result[0]?.total || 0);
  return { total_revenue: parseFloat(total) };
}

async function getTotalExpenses() {
  const result = await query('SELECT SUM(amount) as total FROM expenses');
  const total = dbType === 'sqlite' ? (result?.total || 0) : (result[0]?.total || 0);
  return { total_expenses: parseFloat(total) };
}

async function getExpensesForPeriod(period) {
  const { startDate, endDate } = getDateRangeForPeriod(period);
  const result = await query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE date >= ? AND date <= ?`, [startDate, endDate]);
  const row = dbType === 'sqlite' ? result : result[0];
  return { total: parseFloat(row.total || 0), count: parseInt(row.count || 0), period, start_date: startDate, end_date: endDate };
}

async function getRevenuesForPeriod(period) {
  const { startDate, endDate } = getDateRangeForPeriod(period);
  const result = await query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM revenue WHERE date >= ? AND date <= ?`, [startDate, endDate]);
  const row = dbType === 'sqlite' ? result : result[0];
  return { total: parseFloat(row.total || 0), count: parseInt(row.count || 0), period, start_date: startDate, end_date: endDate };
}

async function getProfitForPeriod(period) {
  const exp = await getExpensesForPeriod(period);
  const rev = await getRevenuesForPeriod(period);
  return { profit: rev.total - exp.total, revenue: rev.total, expenses: exp.total, period };
}

async function getBusinessOverview() {
  const rev = await getTotalRevenue();
  const exp = await getTotalExpenses();
  return {
    total_revenue: rev.total_revenue,
    total_expenses: exp.total_expenses,
    profit: rev.total_revenue - exp.total_expenses,
    profit_margin: rev.total_revenue > 0 ? (((rev.total_revenue - exp.total_expenses) / rev.total_revenue) * 100).toFixed(1) + '%' : '0%'
  };
}

// ==================== AI CHAT ====================
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const systemPrompt = `You are LandTrack AI. Use the tools to answer questions about expenses, revenue, and profit. Always mention the time period when relevant.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }],
      tools,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 700,
    });

    const responseMessage = completion.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};

      let toolResult;
      if (functionName === "get_overall_profit") toolResult = await getOverallProfit();
      else if (functionName === "get_total_revenue") toolResult = await getTotalRevenue();
      else if (functionName === "get_total_expenses") toolResult = await getTotalExpenses();
      else if (functionName === "get_expenses_for_period") toolResult = await getExpensesForPeriod(args.period);
      else if (functionName === "get_revenues_for_period") toolResult = await getRevenuesForPeriod(args.period);
      else if (functionName === "get_profit_for_period") toolResult = await getProfitForPeriod(args.period);
      else if (functionName === "get_business_overview") toolResult = await getBusinessOverview();
      else toolResult = { error: "Tool not found" };

      const final = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: message },
          responseMessage,
          { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) }
        ],
        temperature: 0.2,
        max_tokens: 700,
      });

      return res.json({ reply: final.choices[0].message.content });
    }

    res.json({ reply: responseMessage.content });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "AI error" });
  }
});

// ==================== START ====================
async function startServer() {
  await initDatabase();
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();