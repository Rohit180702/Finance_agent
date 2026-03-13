import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Newspaper,
  SlidersHorizontal,
  MessageSquare,
  Layers,
  GitCompare,
  X,
} from 'lucide-react';

const NAV_WORKSPACE = [
  { to: '/',         icon: LayoutDashboard,  label: 'Dashboard' },
  { to: '/screener', icon: SlidersHorizontal, label: 'Screener' },
  { to: '/etf',      icon: Layers,            label: 'ETFs' },
  { to: '/compare',  icon: GitCompare,        label: 'Compare' },
];

const NAV_ANALYSIS = [
  { to: '/technical',   icon: TrendingUp, label: 'Technical' },
  { to: '/fundamental', icon: BarChart3,  label: 'Fundamental' },
  { to: '/sentiment',   icon: Newspaper,  label: 'Sentiment' },
];

const Sidebar = ({ isOpen, onClose, onChatOpen }) => (
  <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
    {/* Brand */}
    <div className="app-brand">
      <div className="app-brand-mark">FA</div>
      <div className="app-brand-text">
        <span className="app-brand-name">Finance Agent</span>
      </div>
      <button className="sidebar-x" onClick={onClose} aria-label="Close sidebar">
        <X size={15} />
      </button>
    </div>

    {/* Navigation */}
    <nav className="app-nav" aria-label="Primary navigation">
      <div className="nav-group">
        <span className="nav-group-label">Workspace</span>
        {NAV_WORKSPACE.map(({ to, icon: Icon, label, soon }) =>
          soon ? (
            <div key={to} className="app-nav-item is-disabled">
              <Icon size={15} />
              <span>{label}</span>
              <span className="nav-badge">Soon</span>
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `app-nav-item${isActive ? ' is-active' : ''}`
              }
              onClick={onClose}
            >
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          )
        )}
      </div>

      <div className="nav-group">
        <span className="nav-group-label">Analysis</span>
        {NAV_ANALYSIS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `app-nav-item${isActive ? ' is-active' : ''}`
            }
            onClick={onClose}
          >
            <Icon size={15} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>

    {/* Chat opener */}
    <div className="app-sidebar-footer">
      <button className="chat-open-btn" onClick={onChatOpen}>
        <MessageSquare size={15} />
        <span>AI Chat</span>
      </button>
    </div>
  </aside>
);

export default Sidebar;
