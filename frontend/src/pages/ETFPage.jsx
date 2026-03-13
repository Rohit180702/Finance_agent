import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, Loader2, ExternalLink } from 'lucide-react';
import axios from 'axios';

const ETF_CATEGORIES = [
  { label: 'Equity',    keywords: ['nifty', 'sensex', 'equity', 'index', 'it', 'bank', 'infra', 'mid', 'small', 'large', 'next50', '500', 'bse'] },
  { label: 'Gold',      keywords: ['gold', 'goldbees', 'sgb'] },
  { label: 'Debt/Gilt', keywords: ['gilt', 'gsec', 'g-sec', 'bond', 'debt', 'liquid'] },
  { label: 'Silver',    keywords: ['silver'] },
  { label: 'Other',     keywords: [] },
];

function getCategory(name = '') {
  const lower = name.toLowerCase();
  for (const cat of ETF_CATEGORIES) {
    if (cat.keywords.length && cat.keywords.some(k => lower.includes(k))) return cat.label;
  }
  return 'Other';
}

const CATEGORY_COLORS = {
  'Equity':    '#3b82f6',
  'Gold':      '#f59e0b',
  'Debt/Gilt': '#8b5cf6',
  'Silver':    '#6b7280',
  'Other':     '#10b981',
};

export default function ETFPage() {
  const [etfs,     setEtfs]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query,    setQuery]    = useState('');
  const [category, setCategory] = useState('All');
  const [loading,  setLoading]  = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    axios.get('/api/v1/stocks/etfs')
      .then(r => { setEtfs(r.data.etfs || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = etfs;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(e => e.symbol.toLowerCase().includes(q) || e.name.toLowerCase().includes(q));
    }
    if (category !== 'All') {
      list = list.filter(e => getCategory(e.name) === category);
    }
    setFiltered(list);
  }, [etfs, query, category]);

  const categories = ['All', ...ETF_CATEGORIES.map(c => c.label)];

  // Count per category
  const counts = {};
  etfs.forEach(e => {
    const cat = getCategory(e.name);
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return (
    <div className="etf-page">

      {/* Header */}
      <div className="etf-header">
        <div>
          <h1 className="etf-title">
            <TrendingUp size={20} /> ETFs
          </h1>
          <p className="etf-subtitle">
            {loading ? 'Loading…' : `${etfs.length} NSE-listed Exchange Traded Funds`}
          </p>
        </div>
        <div className="etf-search-box">
          <Search size={14} className="etf-search-icon" />
          <input
            ref={inputRef}
            className="etf-search-input"
            placeholder="Search ETF name or symbol…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="etf-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`etf-tab${category === cat ? ' active' : ''}`}
            style={category === cat && cat !== 'All' ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] } : {}}
            onClick={() => setCategory(cat)}
          >
            {cat}
            <span className="etf-tab-count">
              {cat === 'All' ? etfs.length : (counts[cat] || 0)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="etf-loading"><Loader2 size={24} className="spin" /><p>Loading ETFs…</p></div>
      ) : filtered.length === 0 ? (
        <div className="etf-empty">No ETFs found{query ? ` for "${query}"` : ''}.</div>
      ) : (
        <div className="etf-grid">
          {filtered.map(etf => {
            const cat      = getCategory(etf.name);
            const catColor = CATEGORY_COLORS[cat] || '#6b7280';
            const cleanSym = etf.symbol?.replace('.NS', '').replace('.BO', '');
            return (
              <Link
                key={etf.symbol}
                className="etf-card"
                to={`/stock/${etf.symbol}`}
              >
                <div className="etf-card-top">
                  <div className="etf-sym-badge" style={{ background: `${catColor}18`, color: catColor }}>
                    {cleanSym}
                  </div>
                  <span
                    className="etf-cat-tag"
                    style={{ background: `${catColor}18`, color: catColor }}
                  >
                    {cat}
                  </span>
                </div>
                <p className="etf-card-name">{etf.name}</p>
                <div className="etf-card-footer">
                  <span className="etf-isin">{etf.isin || '—'}</span>
                  <ExternalLink size={12} className="etf-arrow" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="etf-showing">
          Showing {filtered.length} of {etfs.length} ETFs
          {category !== 'All' ? ` · ${category}` : ''}
          {query ? ` · "${query}"` : ''}
        </p>
      )}
    </div>
  );
}
