import Button from '../ui/Button';

const navItems = [
  {
    key: 'chat',
    label: 'Chat',
    description: 'AI assistant',
  },
  {
    key: 'technical',
    label: 'Technical Analysis',
    description: 'Indicators & setups',
  },
  {
    key: 'fundamental',
    label: 'Fundamental Analysis',
    description: 'Financial statements',
  },
  {
    key: 'sentiment',
    label: 'Sentiment Analysis',
    description: 'News & market tone',
  },
];

const Sidebar = ({ activeTab, onTabChange, isOpen, onClose }) => {
  return (
    <>
      <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`.trim()}>
        <div className="app-brand">
          <div className="app-brand-mark">FA</div>
          <div>
            <h1>Finance Agent</h1>
            <p>Analytics Workspace</p>
          </div>
        </div>

        <nav className="app-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`app-nav-item ${activeTab === item.key ? 'is-active' : ''}`}
              onClick={() => {
                onTabChange(item.key);
                onClose();
              }}
            >
              <span className="app-nav-label">{item.label}</span>
              <span className="app-nav-description">{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <Button variant="ghost" size="sm" className="full-width" onClick={onClose}>
            Close Panel
          </Button>
        </div>
      </aside>
      <button
        type="button"
        className={`app-overlay ${isOpen ? 'is-open' : ''}`.trim()}
        aria-label="Close navigation"
        onClick={onClose}
      />
    </>
  );
};

export default Sidebar;
