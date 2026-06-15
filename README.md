# Business-Tracker

A full-stack business management application for tracking expenses, revenue, clients, shopping lists, and calendar events — with an intelligent AI assistant that can answer questions using your real business data.

## Features
- **Expense & Revenue Tracking** — Log and categorize business transactions
- **Client Management** — Store contacts, addresses, and notes
- **Shopping List** — Prioritized purchasing list with status tracking
- **Calendar & Scheduling** — FullCalendar integration for events linked to clients
- **AI Business Assistant (LandTrack AI)** — Chat with a Groq-powered LLM that uses function calling to query live data (total profit, revenue, expenses, client count)
- Clean, responsive UI built with React + Tailwind CSS

## Tech Stack
- **Frontend**: Vite + React 18 + React Router DOM + Tailwind CSS + FullCalendar
- **Backend**: Node.js + Express (ESM) + CORS + express-rate-limit
- **Database**: MySQL (`mysql2`) with full SQLite (`sqlite3`) support for easy deployment
- **AI**: Groq SDK (`llama-3.3-70b-versatile`) with tool/function calling
- **Dev Tools**: npm workspaces, concurrently, nodemon, ESLint, Docker (optional MySQL)

## Project Structure

```
Business-Tracker/
├── frontend/                 # Vite + React application
├── backend/                  # Express server + database logic
│   ├── server.js
│   └── .env.example
├── docker-compose.yml        # Local MySQL development
├── package.json              # Root with workspaces config
└── README.md
```

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
git clone https://github.com/Mason-Hite/Business-Tracker.git
cd Business-Tracker
npm install
cp backend/.env.example backend/.env
# Edit backend/.env — set DB_TYPE=sqlite for easiest local testing
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

The backend automatically creates all required database tables on first run.

### Database Options
- **SQLite** (recommended for development & free hosting): Set `DB_TYPE=sqlite` in `.env`
- **MySQL** (for local Docker or full production MySQL): Use `docker-compose up -d` or provide full MySQL credentials

## Available Scripts

| Command                        | Description                                          |
| ------------------------------ | ---------------------------------------------------- |
| `npm run dev`                  | Run frontend + backend together (using concurrently) |
| `cd frontend && npm run build` | Production build of the React frontend               |
| `cd backend && npm start`      | Production start of the backend server               |

## Environment Variables

See `backend/.env.example` for the full list:
- `PORT`
- `DB_TYPE` (`sqlite` or `mysql`)
- `DB_PATH` (for SQLite)
- MySQL credentials (when using MySQL mode)
- `GROQ_API_KEY` (required for the AI assistant feature)

## Reflection & What Was Built

- Flexible database abstraction layer supporting both MySQL and SQLite
- Real AI integration using Groq + function calling to query live business data
- Monorepo setup with npm workspaces and concurrent dev servers
- Production static file serving from the backend for simple single-service hosting
- Security basics implemented (environment variables, rate limiting, proper `.gitignore`)

## Future Improvements
- Complete CRUD UI for all entities in the frontend
- User authentication
- Expanded AI capabilities and better error handling
- Automated tests + improved CI/CD

---

**Built as a full-stack project** demonstrating modern development practices, cloud deployment, security, and practical AI integration.