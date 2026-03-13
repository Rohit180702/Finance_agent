import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import ChatPanel from './components/layout/ChatPanel';
import DashboardPage from './pages/DashboardPage';
import TechnicalPage from './pages/TechnicalPage';
import FundamentalPage from './pages/FundamentalPage';
import ScreenerPage from './pages/ScreenerPage';
import StockDetailPage from './pages/StockDetailPage';
import ComparisonPage from './pages/ComparisonPage';
import './App.css';

function AppShell() {
  const [chatOpen, setChatOpen]       = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onChatOpen={() => { setChatOpen(true); setSidebarOpen(false); }}
      />

      <div className="app-main">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onChatToggle={() => setChatOpen((o) => !o)}
        />
        <main className="app-content">
          <Routes>
            <Route path="/"              element={<DashboardPage />} />
            <Route path="/screener"      element={<ScreenerPage />} />
            <Route path="/stock/:symbol" element={<StockDetailPage />} />
            <Route path="/compare"       element={<ComparisonPage />} />
            <Route path="/technical"     element={<TechnicalPage />} />
            <Route path="/fundamental"   element={<FundamentalPage />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Sidebar overlay for mobile */}
      <button
        type="button"
        className={`app-overlay ${sidebarOpen ? 'is-open' : ''}`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
