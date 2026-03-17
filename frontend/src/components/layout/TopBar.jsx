import { useEffect, useRef, useState, useCallback } from 'react';
import './TopBar.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, MessageSquare, Search, X } from 'lucide-react';
import { isMarketOpen } from '../../hooks/useMarketOverview';
import { searchStocks } from '../../services/stockDetailApi';

const PAGE_META = {
  '/':            { title: 'Dashboard',            subtitle: 'Market overview and quick access' },
  '/technical':   { title: 'Technical Analysis',   subtitle: 'Indicators, chart patterns, and setups' },
  '/fundamental': { title: 'Fundamental Analysis', subtitle: 'Financial statements and key ratios' },
  '/sentiment':   { title: 'Sentiment Analysis',   subtitle: 'News momentum and market tone' },
  '/screener':    { title: 'Stock Screener',        subtitle: 'Filter NSE stocks by fundamentals and technicals' },
  '/compare':     { title: 'Compare Stocks',        subtitle: 'Side-by-side AI comparison' },
  '/etf':         { title: 'ETFs',                  subtitle: '307 NSE-listed Exchange Traded Funds' },
};

// ── Global stock search ────────────────────────────────────────────────────────
function GlobalSearch() {
  const navigate    = useNavigate();
  const inputRef    = useRef(null);
  const timerRef    = useRef(null);
  const [query,     setQuery]   = useState('');
  const [results,   setResults] = useState([]);
  const [open,      setOpen]    = useState(false);
  const [active,    setActive]  = useState(-1); // keyboard cursor index

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setActive(-1);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const d = await searchStocks(q);
        setResults(d.stocks || []);
        setOpen(true);
      } catch { setResults([]); }
    }, 250);
  };

  const pick = useCallback((stock) => {
    navigate(`/stock/${stock.symbol}`);
    setQuery('');
    setResults([]);
    close();
    inputRef.current?.blur();
  }, [navigate, close]);

  const handleKey = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { if (active >= 0) pick(results[active]); else if (results[0]) pick(results[0]); }
    if (e.key === 'Escape')    { close(); inputRef.current?.blur(); }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.gsearch-wrap')) close(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [close]);

  return (
    <div className="gsearch-wrap">
      <div className={`gsearch-box${open && results.length ? ' open' : ''}`}>
        <Search size={14} className="gsearch-icon" />
        <input
          ref={inputRef}
          className="gsearch-input"
          placeholder="Search stocks… (e.g. Reliance, INFY)"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKey}
          onFocus={() => results.length && setOpen(true)}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button className="gsearch-clear" onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}>
            <X size={12} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="gsearch-dropdown">
          {results.slice(0, 8).map((s, i) => (
            <li
              key={s.symbol}
              className={`gsearch-item${active === i ? ' active' : ''}`}
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="gsearch-sym">{s.symbol?.replace('.NS', '').replace('.BO', '')}</span>
              <span className="gsearch-name">{s.name}</span>
              {s.sector && <span className="gsearch-sector">{s.sector}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────────
const TopBar = ({ onMenuClick, onChatToggle }) => {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] ?? { title: location.pathname.replace('/', ''), subtitle: '' };
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
        <div className="topbar-title-wrap">
          <h2>{meta.title}</h2>
          {meta.subtitle && <p>{meta.subtitle}</p>}
        </div>
      </div>

      <div className="app-topbar-center">
        <GlobalSearch />
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
