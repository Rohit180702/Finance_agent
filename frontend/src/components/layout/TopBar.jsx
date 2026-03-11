import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, MessageSquare } from 'lucide-react';
import { isMarketOpen } from '../../hooks/useMarketOverview';

const PAGE_META = {
  '/':            { title: 'Dashboard',            subtitle: 'Market overview and quick access' },
  '/technical':   { title: 'Technical Analysis',   subtitle: 'Indicators, chart patterns, and setups' },
  '/fundamental': { title: 'Fundamental Analysis', subtitle: 'Financial statements and key ratios' },
  '/sentiment':   { title: 'Sentiment Analysis',   subtitle: 'News momentum and market tone' },
  '/screener':    { title: 'Stock Screener',        subtitle: 'Filter NSE stocks by fundamentals and technicals' },
};

const TopBar = ({ onMenuClick, onChatToggle }) => {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] ?? PAGE_META['/'];
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        <button className="icon-btn menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={17} />
        </button>
        <div>
          <h2>{meta.title}</h2>
          <p>{meta.subtitle}</p>
        </div>
      </div>

      <div className="app-topbar-right">
        <span className="topbar-pill">NSE · BSE</span>
        <span className={`topbar-pill ${isMarketOpen() ? 'pill-open' : 'pill-closed'}`}>
          {isMarketOpen() ? '● Open' : '● Closed'}
        </span>
        <span className="topbar-pill">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="icon-btn chat-btn" onClick={onChatToggle} aria-label="Open AI chat">
          <MessageSquare size={15} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
