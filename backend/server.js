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

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());

// Basic rate limiting on API routes (package was already installed)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// ============================================
// Database Layer (MySQL or SQLite)
// ============================================
let db;
let dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();

async function initDatabase() {
  if (dbType === 'sqlite') {
    // ==================== SQLITE ====================
    const sqlite3 = (await import('sqlite3')).default;
    const dbPath = process.env.DB_PATH || './data/business_tracker.db';

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ SQLite connection error:', err);
      } else {
        console.log(`✅ SQLite connected at ${dbPath}`);
      }
    });

    // Promisify helpers
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
    // ==================== MYSQL (default) ====================
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

// Unified query helper (works for both DBs)
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
    // MySQL
    const [rows] = await db.query(sql, params);
    return rows;
  }
}

// ============================================
// Initialize Database Tables
// ============================================
async function initDB() {
  try {
    if (dbType === 'sqlite') {
      // SQLite syntax
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
      )`);

    } else {
      // MySQL syntax (your original)
      await query(`CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS revenue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS shopping_list (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item VARCHAR(255) NOT NULL,
        quantity INT DEFAULT 1,
        priority ENUM('low','medium','high') DEFAULT 'medium',
        bought BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await query(`CREATE TABLE IF NOT EXISTS calendar_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME,
        client_id INT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
      )`);
    }

    console.log(`✅ Database tables initialized successfully (${dbType.toUpperCase()})`);
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

// ============================================
// Health Check
// ============================================
app.get('/api/health', async (req, res) => {
  try {
    if (dbType === 'sqlite') {
      await db.getAsync('SELECT 1 as healthy');
    } else {
      await query('SELECT 1 as healthy');
    }
    res.json({ status: 'OK', healthy: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// AI Chatbot with Real Business Data (Groq + Function Calling)
// ============================================
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const tools = [
  {
    type: "function",
    function: {
      name: "get_overall_profit",
      description: "Get the total profit (revenue - expenses) for the entire business",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_total_revenue",
      description: "Get the total revenue earned so far",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_total_expenses",
      description: "Get the total expenses spent so far",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_total_clients",
      description: "Get the total number of clients",
      parameters: { type: "object", properties: {} }
    }
  }
];

// Tool implementations (now work with both DBs)
async function getOverallProfit() {
  const rev = await query('SELECT SUM(amount) as total FROM revenue');
  const exp = await query('SELECT SUM(amount) as total FROM expenses');
  const revenueTotal = dbType === 'sqlite' ? (rev?.total || 0) : (rev[0]?.total || 0);
  const expensesTotal = dbType === 'sqlite' ? (exp?.total || 0) : (exp[0]?.total || 0);
  return {
    profit: revenueTotal - expensesTotal,
    revenue: revenueTotal,
    expenses: expensesTotal
  };
}

async function getTotalRevenue() {
  const result = await query('SELECT SUM(amount) as total FROM revenue');
  const total = dbType === 'sqlite' ? (result?.total || 0) : (result[0]?.total || 0);
  return { total_revenue: total };
}

async function getTotalExpenses() {
  const result = await query('SELECT SUM(amount) as total FROM expenses');
  const total = dbType === 'sqlite' ? (result?.total || 0) : (result[0]?.total || 0);
  return { total_expenses: total };
}

async function getTotalClients() {
  const result = await query('SELECT COUNT(*) as count FROM clients');
  const count = dbType === 'sqlite' ? (result?.count || 0) : (result[0]?.count || 0);
  return { total_clients: count };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const systemPrompt = `You are LandTrack AI, a professional assistant for a landscaping business.
You have access to real business data through tools.
RULES:
- ONLY use data from the tools. Never make up numbers.
- If you don't have the data or the tool doesn't exist, honestly say "I don't have that information yet."
- Be concise and professional.
- Always show the actual numbers from the tools.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message }
      ],
      tools: tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 600,
    });

    const responseMessage = completion.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;

      let toolResult;
      if (functionName === "get_overall_profit") toolResult = await getOverallProfit();
      else if (functionName === "get_total_revenue") toolResult = await getTotalRevenue();
      else if (functionName === "get_total_expenses") toolResult = await getTotalExpenses();
      else if (functionName === "get_total_clients") toolResult = await getTotalClients();
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
        temperature: 0.3,
        max_tokens: 600,
      });

      return res.json({ reply: finalCompletion.choices[0].message.content });
    }

    res.json({ reply: responseMessage.content });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "AI service error" });
  }
});

// ============================================
// Serve Frontend in Production (for single-service deploy on Render)
// ============================================
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// ============================================
// Start Server
// ============================================
async function startServer() {
  await initDatabase();
  await initDB();

  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`   Database mode: ${dbType.toUpperCase()}`);
    if (process.env.NODE_ENV === 'production') {
      console.log('   Serving frontend from /frontend/dist');
    }
  });
}

startServer();