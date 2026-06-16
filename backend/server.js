import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// Database Layer
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
    console.log('✅ MySQL connection pool created');
  }
}

async function query(sql, params = []) {
  if (dbType === 'sqlite') {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT')) {
      if (upper.includes('COUNT(') || upper.includes('SUM(')) {
        return db.getAsync(sql, params);
      }
      return db.allAsync(sql, params);
    } else {
      return db.runAsync(sql, params);
    }
  } else {
    const [rows] = await db.query(sql, params);
    return rows;
  }
}

// ============================================
// Routes - Expenses & Revenue (unchanged)
// ============================================
app.post('/api/expenses', async (req, res) => {
  try {
    const { date, category, amount, description } = req.body;
    if (!date || !category || !amount) {
      return res.status(400).json({ error: 'Date, category and amount are required' });
    }
    if (dbType === 'sqlite') {
      await db.runAsync(`INSERT INTO expenses (date, category, amount, description) VALUES (?, ?, ?, ?)`,
        [date, category, parseFloat(amount), description || '']);
    } else {
      await db.query(`INSERT INTO expenses (date, category, amount, description) VALUES (?, ?, ?, ?)`,
        [date, category, amount, description]);
    }
    res.status(201).json({ message: 'Expense added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM expenses ORDER BY date DESC, created_at DESC';
    let params = [];
    if (category) {
      sql = 'SELECT * FROM expenses WHERE category = ? ORDER BY date DESC, created_at DESC';
      params = [category];
    }
    const expenses = await query(sql, params);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbType === 'sqlite') {
      await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
    } else {
      await db.query(`DELETE FROM expenses WHERE id = ?`, [id]);
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Revenue routes (same pattern as above)
app.post('/api/revenue', async (req, res) => { /* ... same as your previous code ... */ });
app.get('/api/revenue', async (req, res) => { /* ... */ });
app.delete('/api/revenue/:id', async (req, res) => { /* ... */ });

// Database Initialization
async function initDB() {
  try {
    if (dbType === 'sqlite') {
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
      // Add other tables if needed
    }
    console.log(`✅ Database tables initialized (${dbType.toUpperCase()})`);
  } catch (err) {
    console.error('❌ Database init error:', err.message);
  }
}

app.get('/api/health', async (req, res) => {
  res.json({ status: 'OK' });
});

// ============================================
// AI Chatbot
// ============================================
import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Tools
const tools = [
  { type: "function", function: { name: "get_overall_profit", description: "Get total profit (revenue - expenses)", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_total_revenue", description: "Get total revenue", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_total_expenses", description: "Get total expenses", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_expense_count", description: "Get number of expense records", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_total_clients", description: "Get total number of clients", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_recent_expenses", description: "Get 5 most recent expenses", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_recent_revenues", description: "Get 5 most recent revenues", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_expenses_for_period", description: "Get expenses for period: today, yesterday, this_week, last_week, this_month, last_month, last_7_days, last_30_days", parameters: { type: "object", properties: { period: { type: "string" } }, required: ["period"] } } },
  { type: "function", function: { name: "get_revenues_for_period", description: "Get revenue for period (same options as above)", parameters: { type: "object", properties: { period: { type: "string" } }, required: ["period"] } } },
  { type: "function", function: { name: "get_profit_for_period", description: "Get profit for period (same options)", parameters: { type: "object", properties: { period: { type: "string" } }, required: ["period"] } } },
  { type: "function", function: { name: "get_expenses_today", description: "Get expenses for today", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_revenue_today", description: "Get revenue for today", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_business_overview", description: "Get full business summary with totals and profit", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_current_date", description: "Get today's date", parameters: { type: "object", properties: {} } } },
];

// Helper
function getDateRangeForPeriod(period) {
  // Get today's date in Pacific Time
  const options = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const todayStr = formatter.format(new Date());

  // Parse it back into a Date object for calculations
  const [yyyy, mm, dd] = todayStr.split('-').map(Number);
  const today = new Date(yyyy, mm - 1, dd);

  let startDate;
  let endDate = todayStr;

  switch (period.toLowerCase()) {
    case 'today':
      startDate = todayStr;
      break;

    case 'yesterday':
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      startDate = endDate = yest.toISOString().split('T')[0];
      break;

    case 'this_week':
      // Start from Sunday of current week
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = todayStr; // ← Force end date to today
      break;

    case 'last_week':
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      startDate = lastWeekStart.toISOString().split('T')[0];
      endDate = lastWeekEnd.toISOString().split('T')[0];
      break;

    case 'this_month':
      startDate = `${yyyy}-${mm}-01`;
      endDate = todayStr;
      break;

    case 'last_month':
      const lastMonth = new Date(yyyy, today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(yyyy, today.getMonth(), 0);
      startDate = lastMonth.toISOString().split('T')[0];
      endDate = lastMonthEnd.toISOString().split('T')[0];
      break;

    case 'last_7_days':
      const seven = new Date(today);
      seven.setDate(today.getDate() - 6);
      startDate = seven.toISOString().split('T')[0];
      endDate = todayStr;
      break;

    case 'last_30_days':
      const thirty = new Date(today);
      thirty.setDate(today.getDate() - 29);
      startDate = thirty.toISOString().split('T')[0];
      endDate = todayStr;
      break;

    default:
      startDate = todayStr;
  }

  return { startDate, endDate };
}

// Tool Implementations
async function getOverallProfit() {
  const rev = await query('SELECT SUM(amount) as total FROM revenue');
  const exp = await query('SELECT SUM(amount) as total FROM expenses');
  const r = dbType === 'sqlite' ? (rev?.total || 0) : (rev[0]?.total || 0);
  const e = dbType === 'sqlite' ? (exp?.total || 0) : (exp[0]?.total || 0);
  return { profit: r - e, revenue: r, expenses: e };
}

async function getCurrentDate() {
  // Force Pacific Time (America/Los_Angeles)
  const options = {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD format
  const todayStr = formatter.format(new Date());

  return { current_date: todayStr };
}

async function getExpensesToday() {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE date = ?`, [today]);
  const row = dbType === 'sqlite' ? result : result[0];
  return { total_expenses_today: parseFloat(row.total || 0), expense_count_today: parseInt(row.count || 0), date: today };
}

async function getRevenueToday() {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM revenue WHERE date = ?`, [today]);
  const row = dbType === 'sqlite' ? result : result[0];
  return { total_revenue_today: parseFloat(row.total || 0), revenue_count_today: parseInt(row.count || 0), date: today };
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

async function getExpenseCount() {
  const result = await query('SELECT COUNT(*) as count FROM expenses');
  const count = dbType === 'sqlite' ? (result?.count || 0) : (result[0]?.count || 0);
  return { expense_count: parseInt(count) };
}

async function getTotalClients() {
  const result = await query('SELECT COUNT(*) as count FROM clients');
  const count = dbType === 'sqlite' ? (result?.count || 0) : (result[0]?.count || 0);
  return { total_clients: parseInt(count) };
}

async function getRecentExpenses() {
  const result = await query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT 5');
  return { recent_expenses: result };
}

async function getRecentRevenues() {
  const result = await query('SELECT * FROM revenue ORDER BY date DESC, created_at DESC LIMIT 5');
  return { recent_revenues: result };
}

async function getBusinessOverview() {
  const rev = await getTotalRevenue();
  const exp = await getTotalExpenses();
  const expCount = await getExpenseCount();
  const revCount = await query('SELECT COUNT(*) as count FROM revenue');
  const rCount = dbType === 'sqlite' ? (revCount?.count || 0) : (revCount[0]?.count || 0);

  return {
    total_revenue: rev.total_revenue,
    total_expenses: exp.total_expenses,
    profit: rev.total_revenue - exp.total_expenses,
    expense_count: expCount.expense_count,
    revenue_count: rCount,
    profit_margin: rev.total_revenue > 0 ? (((rev.total_revenue - exp.total_expenses) / rev.total_revenue) * 100).toFixed(1) + '%' : '0%'
  };
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
  return {
    profit: rev.total - exp.total,
    revenue: rev.total,
    expenses: exp.total,
    period,
    start_date: exp.start_date,
    end_date: exp.end_date
  };
}

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const systemPrompt = `You are LandTrack AI, a precise assistant for a landscaping business.

When answering time-based questions:
- Always use the start_date and end_date returned by the tool.
- Clearly state the date range in your answer (e.g. "June 9 - June 15, 2026").
- Never invent or adjust dates yourself.
- For "this week", the end date should always be today.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }],
      tools: tools,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 800,
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
      else if (functionName === "get_expense_count") toolResult = await getExpenseCount();
      else if (functionName === "get_total_clients") toolResult = await getTotalClients();
      else if (functionName === "get_recent_expenses") toolResult = await getRecentExpenses();
      else if (functionName === "get_recent_revenues") toolResult = await getRecentRevenues();
      else if (functionName === "get_expenses_today") toolResult = await getExpensesToday();
      else if (functionName === "get_revenue_today") toolResult = await getRevenueToday();
      else if (functionName === "get_business_overview") toolResult = await getBusinessOverview();
      else if (functionName === "get_current_date") toolResult = await getCurrentDate();
      else if (functionName === "get_expenses_for_period") toolResult = await getExpensesForPeriod(args.period);
      else if (functionName === "get_revenues_for_period") toolResult = await getRevenuesForPeriod(args.period);
      else if (functionName === "get_profit_for_period") toolResult = await getProfitForPeriod(args.period);
      else toolResult = { error: "Tool not found" };

      const finalCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: message },
          responseMessage,
          { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) }
        ],
        temperature: 0.2,
        max_tokens: 800,
      });

      return res.json({ reply: finalCompletion.choices[0].message.content });
    }

    res.json({ reply: responseMessage.content });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "AI service error" });
  }
});

// Production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

async function startServer() {
  await initDatabase();
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}

startServer();