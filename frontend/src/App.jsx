import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Expenses from './pages/Expenses.jsx';
import ShoppingList from './pages/ShoppingList.jsx';
import Calendar from './pages/Calendar.jsx';

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your LandTrack AI assistant. Ask me anything about your business data.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/clients', label: 'Clients', icon: '👥' },
    { path: '/expenses', label: 'Expenses', icon: '💸' },
    { path: '/shopping', label: 'Shopping List', icon: '🛒' },
    { path: '/calendar', label: 'Calendar', icon: '📅' },
  ];

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages
        }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that right now." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl">🌿</div>
              <div>
                <div className="font-bold text-2xl text-gray-900">LandTrack</div>
                <div className="text-xs text-gray-500 -mt-1">Business Manager</div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4">
            <div className="px-4 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Main</div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all ${isActive ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content + Right Chat Sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div className="font-semibold text-gray-700">Business Tracker</div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-medium transition-colors"
              >
                <span>💬</span>
                <span>{isChatOpen ? 'Close AI' : 'Ask AI'}</span>
              </button>

              <button className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-2xl transition-colors">
                Sign in
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/shopping" element={<ShoppingList />} />
                <Route path="/calendar" element={<Calendar />} />
              </Routes>
            </div>

            {/* Right Chat Sidebar */}
            {isChatOpen && (
              <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="font-semibold flex items-center gap-2">
                    <span>🤖</span> LandTrack AI
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-3xl text-sm ${msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white border border-gray-200 rounded-bl-none'
                        }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 px-4 py-3 rounded-3xl rounded-bl-none text-sm">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about revenue, clients, expenses..."
                      className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || isLoading}
                      className="px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-2xl font-medium text-sm transition-colors"
                    >
                      Send
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2 text-center">
                    Powered by Groq • Can access your business data
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