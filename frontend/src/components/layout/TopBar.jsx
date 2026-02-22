import { useEffect, useState } from 'react';
import Button from '../ui/Button';

const titles = {
  chat: {
    title: 'AI Chat Desk',
    subtitle: 'Conversational analysis for equities and indicators.',
  },
  technical: {
    title: 'Technical Analysis',
    subtitle: 'Configure indicators and evaluate chart context.',
  },
  fundamental: {
    title: 'Fundamental Analysis',
    subtitle: 'Inspect company metrics and statement narratives.',
  },
  sentiment: {
    title: 'Sentiment Analysis',
    subtitle: 'Track narrative momentum across news and social tone.',
  },
};

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const TopBar = ({ activeTab, onMenuClick }) => {
  const content = titles[activeTab] || titles.chat;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        <Button variant="ghost" size="sm" className="menu-button" onClick={onMenuClick}>
          <MenuIcon />
        </Button>
        <div>
          <h2>{content.title}</h2>
          <p>{content.subtitle}</p>
        </div>
      </div>
      <div className="app-topbar-right">
        <span className="topbar-pill">NSE/BSE</span>
        <span className="topbar-pill">Live API</span>
        <span className="topbar-pill is-time">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </header>
  );
};

export default TopBar;
