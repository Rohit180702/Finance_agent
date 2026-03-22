import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import { useTheme } from './hooks/useTheme';
import AIResearchPage from './pages/AIResearchPage';
import TechnicalPage from './pages/TechnicalPage';
import FundamentalPage from './pages/FundamentalPage';
import SentimentPage from './pages/SentimentPage';
import ScreenerPage from './pages/ScreenerPage';
import StockDetailPage from './pages/StockDetailPage';
import ComparisonPage from './pages/ComparisonPage';
import NewsPage from './pages/NewsPage';
import WatchlistPage from './pages/WatchlistPage';
import './App.css';
import './components/ui/ui.css';

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="app-content">
          <Routes>
            <Route path="/"              element={<AIResearchPage />} />
            <Route path="/screener"      element={<ScreenerPage />} />
            <Route path="/stock/:symbol" element={<StockDetailPage />} />
            <Route path="/compare"       element={<ComparisonPage />} />
            <Route path="/news"          element={<NewsPage />} />
            <Route path="/technical"     element={<TechnicalPage />} />
            <Route path="/fundamental"   element={<FundamentalPage />} />
            <Route path="/sentiment"     element={<SentimentPage />} />
            <Route path="/watchlist"     element={<WatchlistPage />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

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
