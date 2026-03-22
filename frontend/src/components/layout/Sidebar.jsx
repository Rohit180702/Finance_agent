import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import {
  Sparkles, SlidersHorizontal, GitCompare, Star,
  X, Newspaper, MessageSquare,
} from 'lucide-react';

const RECENT_KEY = 'finance_agent_recent_chats';
const MAX_RECENT = 5;

export function getRecentChats() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

export function addRecentChat(query) {
  if (!query || query.trim().length < 3) return;
  const clean = query.replace(/^(fundamental analysis:|technical analysis:|sentiment analysis:)\s*/gi, '').trim();
  if (!clean) return;
  const prev = getRecentChats().filter(q => q !== clean);
  const next = [clean, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('recent-chats-updated'));
}

export function clearRecentChats() {
  localStorage.removeItem(RECENT_KEY);
  window.dispatchEvent(new Event('recent-chats-updated'));
}

const NAV_ITEMS = [
  { to: '/',          icon: Sparkles,          label: 'AI Research' },
  { to: '/screener',  icon: SlidersHorizontal, label: 'Screener' },
  { to: '/watchlist',  icon: Star,             label: 'Watchlist' },
  { to: '/compare',   icon: GitCompare,        label: 'Compare' },
  { to: '/news',      icon: Newspaper,         label: 'Market News' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const [recents, setRecents] = useState(getRecentChats);

  useEffect(() => {
    const refresh = () => setRecents(getRecentChats());
    window.addEventListener('recent-chats-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('recent-chats-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">FA</div>
        <span className="sidebar-brand-name">FinAgent</span>
        <button className="sidebar-x" onClick={onClose} aria-label="Close sidebar">
          <X size={15} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Primary navigation">
        <span className="sidebar-nav-label">Workspace</span>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' is-active' : ''}`
            }
            onClick={onClose}
          >
            <Icon size={15} />
            <span>{label}</span>
          </NavLink>
        ))}

        {recents.length > 0 && (
          <>
            <span className="sidebar-nav-label">Recent</span>
            {recents.map((query, i) => (
              <NavLink
                key={`${query}-${i}`}
                to="/"
                end
                className="sidebar-nav-item sidebar-recent-item"
                onClick={onClose}
              >
                <MessageSquare size={13} />
                <span className="sidebar-recent-text">{query}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
