import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Revenue from './pages/Revenue.jsx';
import ShoppingList from './pages/ShoppingList.jsx';
import Calendar from './pages/Calendar.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your LandTrack AI assistant." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/expenses', label: 'Expenses', icon: '💸' },
    { path: '/revenue', label: 'Revenue', icon: '💰' },
    { path: '/shopping', label: 'Shopping List', icon: '🛒' },
    { path: '/calendar', label: 'Calendar', icon: '📅' },
  ];

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsChatOpen(false);
  };

  // Dynamic API URL (works for both local and Railway)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const sendMessage = async () => {
    if (!input.trim() || !token) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: input, history: messages }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || "Sorry, something went wrong."
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Connection error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show Login page if not logged in
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r flex flex-col">
          <div className="p-8 border-b">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl">🌿</div>
              <div>
                <div className="font-bold text-2xl">LandTrack</div>
                <div className="text-xs text-gray-500 -mt-1">Business Manager</div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl text-sm font-medium transition-colors"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-white border-b flex items-center justify-between px-8">
            <div className="font-semibold text-lg">Business Tracker</div>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm transition-colors"
            >
              {isChatOpen ? 'Close AI' : 'Ask LandTrack AI'}
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Page Content */}
            <div className="flex-1 overflow-auto p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/revenue" element={<Revenue />} />
                <Route path="/shopping" element={<ShoppingList />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            {/* AI Chat Sidebar */}
            {isChatOpen && (
              <div className="w-96 border-l bg-white flex flex-col">
                <div className="p-4 border-b font-semibold flex items-center justify-between">
                  <span>LandTrack AI</span>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      <div className={`px-4 py-3 rounded-3xl text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border'
                        }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex">
                      <div className="px-4 py-3 rounded-3xl text-sm bg-white border">Thinking...</div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                      placeholder="Ask about your business..."
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !input.trim()}
                      className="px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Router>
  );
}