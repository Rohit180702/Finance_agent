import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as ReTooltip,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { X, Search, Loader2, Brain, ArrowLeft, GitCompare, AlertCircle, Plus } from 'lucide-react';
import { compareStocks, searchStocks } from '../services/stockDetailApi';

const QUICK_PICKS = [
  { symbol: 'RELIANCE.NS', label: 'Reliance' },
  { symbol: 'TCS.NS',      label: 'TCS' },
  { symbol: 'HDFCBANK.NS', label: 'HDFC Bank' },
  { symbol: 'INFY.NS',     label: 'Infosys' },
  { symbol: 'ICICIBANK.NS',label: 'ICICI Bank' },
  { symbol: 'WIPRO.NS',    label: 'Wipro' },
  { symbol: 'SBIN.NS',     label: 'SBI' },
  { symbol: 'BAJFINANCE.NS',label: 'Bajaj Finance' },
];

const fmt   = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L Cr`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

const CHIP_COLORS = ['#3b82f6', '#a855f7', '#f59e0b'];

// Metrics to show in comparison table
const METRICS = [
  { key: 'price',          label: 'Price (₹)',       fmt: v => `₹${fmt(v)}` },
  { key: 'market_cap_cr',  label: 'Market Cap',      fmt: fmtCr },
  { key: 'pe',             label: 'P/E Ratio',       fmt: v => fmt(v) },
  { key: 'pb',             label: 'P/B Ratio',       fmt: v => fmt(v) },
  { key: 'roe',            label: 'ROE %',           fmt: v => `${fmt(v)}%` },
  { key: 'roa',            label: 'ROA %',           fmt: v => `${fmt(v)}%` },
  { key: 'debt_equity',    label: 'Debt / Equity',   fmt: v => fmt(v) },
  { key: 'net_margin',     label: 'Net Margin %',    fmt: v => `${fmt(v)}%` },
  { key: 'revenue_growth', label: 'Revenue Growth %',fmt: v => `${fmt(v)}%` },
  { key: 'dividend_yield', label: 'Dividend Yield %',fmt: v => `${fmt(v)}%` },
  { key: 'week52_high',    label: '52W High (₹)',    fmt: v => `₹${fmt(v)}` },
  { key: 'week52_low',     label: '52W Low (₹)',     fmt: v => `₹${fmt(v)}` },
];

// Metrics used for radar chart (normalized 0-100)
const RADAR_KEYS = [
  { key: 'roe',            label: 'ROE',     invert: false },
  { key: 'net_margin',     label: 'Margin',  invert: false },
  { key: 'revenue_growth', label: 'Growth',  invert: false },
  { key: 'roa',            label: 'ROA',     invert: false },
  { key: 'debt_equity',    label: 'Debt↓',   invert: true  },
  { key: 'dividend_yield', label: 'Yield',   invert: false },
];

function normalize(stocks) {
  return RADAR_KEYS.map(({ key, label, invert }) => {
    const vals = stocks.map(s => parseFloat(s[key])).filter(v => !isNaN(v));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const entry = { metric: label };
    stocks.forEach((s, i) => {
      const v = parseFloat(s[key]);
      let score = isNaN(v) ? 0 : ((v - min) / range) * 100;
      if (invert) score = 100 - score;
      entry[`s${i}`] = Math.round(score);
    });
    return entry;
  });
}

// Stock search dropdown
function StockSearch({ onAdd, existing }) {
  const [query, setQuery]   = useState('');
  const [results, setRes]   = useState([]);
  const [open, setOpen]     = useState(false);
  const [busy, setBusy]     = useState(false);
  const timer = useRef(null);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setRes([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const d = await searchStocks(q);
        setRes((d.stocks || []).filter(s => !existing.includes(s.symbol)));
        setOpen(true);
      } catch { setRes([]); }
      finally { setBusy(false); }
    }, 300);
  };

  const pick = (s) => {
    onAdd(s.symbol);
    setQuery('');
    setRes([]);
    setOpen(false);
  };

  return (
    <div className="cmp-search-wrap">
      <div className="cmp-search-box">
        <Search size={14} className="cmp-search-icon" />
        <input
          className="cmp-search-input"
          placeholder="Search stock to add…"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {busy && <Loader2 size={12} className="spin" />}
      </div>
      {open && results.length > 0 && (
        <ul className="cmp-search-dropdown">
          {results.slice(0, 8).map(s => (
            <li key={s.symbol} className="cmp-search-item" onMouseDown={() => pick(s)}>
              <span className="cmp-search-sym">{s.symbol?.replace('.NS','')}</span>
              <span className="cmp-search-name">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const initial = (searchParams.get('symbols') || '').split(',').filter(Boolean).slice(0, 3);
  const [symbols,  setSymbols]  = useState(initial);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const addSymbol = (sym) => {
    if (symbols.length >= 3 || symbols.includes(sym)) return;
    setSymbols(prev => [...prev, sym]);
  };
  const removeSymbol = (sym) => setSymbols(prev => prev.filter(s => s !== sym));

  // Auto-compare when symbols change (≥ 2)
  useEffect(() => {
    if (symbols.length < 2) { setData(null); return; }
    setLoading(true);
    setError(null);
    compareStocks(symbols)
      .then(d => setData(d))
      .catch(() => setError('Comparison failed. Please try again.'))
      .finally(() => setLoading(false));
  }, [symbols]);

  const stocks     = data?.stocks || [];
  const radarData  = stocks.length >= 2 ? normalize(stocks) : [];

  return (
    <div className="cmp-page">

      {/* ── Header ── */}
      <div className="cmp-header">
        <div className="cmp-header-left">
          <button className="sdp-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="cmp-title-row">
            <GitCompare size={18} />
            <h1 className="cmp-title">Stock Comparison</h1>
          </div>
        </div>
      </div>

      {/* ── Stock chips + search ── */}
      <div className="cmp-chips-row">
        {symbols.map((sym, i) => (
          <Link
            key={sym}
            className="cmp-chip"
            style={{ borderColor: CHIP_COLORS[i] }}
            to={`/stock/${sym}`}
          >
            <span className="cmp-chip-dot" style={{ background: CHIP_COLORS[i] }} />
            {sym.replace('.NS', '').replace('.BO', '')}
            <button
              className="cmp-chip-remove"
              onClick={e => { e.preventDefault(); removeSymbol(sym); }}
            >
              <X size={10} />
            </button>
          </Link>
        ))}
        {symbols.length < 3 && (
          <div className="cmp-add-wrap">
            <StockSearch onAdd={addSymbol} existing={symbols} />
          </div>
        )}
      </div>

      {symbols.length < 2 && !loading && (
        <div className="cmp-empty-state">
          <GitCompare size={48} className="cmp-empty-icon" />
          <h2 className="cmp-empty-title">Compare stocks side by side</h2>
          <p className="cmp-empty-sub">
            Search for stocks above, or pick from popular ones below. Add 2–3 to compare fundamentals, radar charts, and get an AI summary.
          </p>
          <div className="cmp-quick-picks">
            {QUICK_PICKS.filter(q => !symbols.includes(q.symbol)).map(q => (
              <button
                key={q.symbol}
                className="cmp-quick-btn"
                onClick={() => addSymbol(q.symbol)}
              >
                <Plus size={11} /> {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {symbols.length === 1 && !loading && (
        <div className="cmp-one-more">
          <p>Good start! Add one more stock to begin comparing.</p>
          <div className="cmp-quick-picks">
            {QUICK_PICKS.filter(q => !symbols.includes(q.symbol)).slice(0, 5).map(q => (
              <button key={q.symbol} className="cmp-quick-btn" onClick={() => addSymbol(q.symbol)}>
                <Plus size={11} /> {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="cmp-loading">
          <Loader2 size={28} className="spin" />
          <p>Comparing stocks with AI…</p>
        </div>
      )}

      {error && <div className="cmp-error"><AlertCircle size={16} /> {error}</div>}

      {data && !loading && (
        <>
          {/* ── Metrics table ── */}
          <div className="cmp-table-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th className="cmp-th metric-col">Metric</th>
                  {stocks.map((s, i) => (
                    <th key={s.symbol} className="cmp-th" style={{ color: CHIP_COLORS[i] }}>
                      {s.symbol?.replace('.NS', '')}<br/>
                      <span className="cmp-th-name">{s.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map(({ key, label, fmt: fmtFn }) => (
                  <tr key={key} className="cmp-tr">
                    <td className="cmp-td metric-col">{label}</td>
                    {stocks.map(s => (
                      <td key={s.symbol} className="cmp-td">{fmtFn(s[key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Radar chart ── */}
          {radarData.length > 0 && (
            <div className="cmp-radar-card">
              <h3 className="cmp-section-title">Relative Strength Radar</h3>
              <p className="cmp-radar-note">Normalized 0–100 across selected stocks. Higher = better (Debt is inverted).</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  {stocks.map((_, i) => (
                    <Radar
                      key={i}
                      dataKey={`s${i}`}
                      stroke={CHIP_COLORS[i]}
                      fill={CHIP_COLORS[i]}
                      fillOpacity={0.12}
                      strokeWidth={1.5}
                    />
                  ))}
                  <ReTooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#9ca3af' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── AI comparison ── */}
          {data.ai_comparison && (
            <div className="cmp-ai-card">
              <h3 className="cmp-section-title">
                <Brain size={16} /> AI Comparison
              </h3>
              <div className="cmp-ai-body markdown-body">
                <ReactMarkdown>{data.ai_comparison}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* ── Links ── */}
          <div className="cmp-links-row">
            {stocks.map((s, i) => (
              <Link
                key={s.symbol}
                className="cmp-detail-link"
                to={`/stock/${s.symbol}`}
                style={{ borderColor: CHIP_COLORS[i] }}
              >
                View {s.symbol?.replace('.NS', '')} detail →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
