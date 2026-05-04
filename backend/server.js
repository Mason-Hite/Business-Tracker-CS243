import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MySQL Connection Pool (using your .env file)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'pass',
  database: process.env.DB_NAME || 'business_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test route
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as healthy');
    res.json({ status: 'OK', healthy: rows[0].healthy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize DB tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS revenue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_list (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item VARCHAR(255) NOT NULL,
        quantity INT DEFAULT 1,
        priority ENUM('low','medium','high') DEFAULT 'medium',
        bought BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME,
        client_id INT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ MySQL Database tables initialized successfully.');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

initDB();

// ==================== AI CHATBOT WITH REAL DATA ====================
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Tool definitions
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

// Tool implementations
async function getOverallProfit() {
  const [revenue] = await pool.query('SELECT SUM(amount) as total FROM revenue');
  const [expenses] = await pool.query('SELECT SUM(amount) as total FROM expenses');
  const profit = (revenue[0].total || 0) - (expenses[0].total || 0);
  return { profit, revenue: revenue[0].total || 0, expenses: expenses[0].total || 0 };
}

async function getTotalRevenue() {
  const [result] = await pool.query('SELECT SUM(amount) as total FROM revenue');
  return { total_revenue: result[0].total || 0 };
}

async function getTotalExpenses() {
  const [result] = await pool.query('SELECT SUM(amount) as total FROM expenses');
  return { total_expenses: result[0].total || 0 };
}

async function getTotalClients() {
  const [result] = await pool.query('SELECT COUNT(*) as count FROM clients');
  return { total_clients: result[0].count };
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

    // If Groq wants to call a tool
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;

      let toolResult;
      if (functionName === "get_overall_profit") toolResult = await getOverallProfit();
      else if (functionName === "get_total_revenue") toolResult = await getTotalRevenue();
      else if (functionName === "get_total_expenses") toolResult = await getTotalExpenses();
      else if (functionName === "get_total_clients") toolResult = await getTotalClients();
      else toolResult = { error: "Tool not found" };

      // Send tool result back to Groq for final answer
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

    // Normal response (no tool needed)
    res.json({ reply: responseMessage.content });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "AI service error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});