import { useState, useEffect, useRef, useCallback } from 'react';
import './Comparison.css';
import { useSearchParams, Link } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  Tooltip as ReTooltip, Legend,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Search, Loader2, Sparkles, ArrowRightLeft, AlertCircle, Plus } from 'lucide-react';
import { compareStocks, searchStocks } from '../services/stockDetailApi';

const CACHE_KEY = 'cmp_state';

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCache(symbols, data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ symbols, data, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}

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

const CHIP_COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', '#facc15'];

const METRICS = [
  { key: 'price',          label: 'Price (₹)',        fmt: v => `₹${fmt(v)}`,   best: null },
  { key: 'market_cap_cr',  label: 'Market Cap',       fmt: fmtCr,               best: 'highest' },
  { key: 'pe',             label: 'P/E Ratio',        fmt: v => fmt(v),          best: 'lowest'  },
  { key: 'pb',             label: 'P/B Ratio',        fmt: v => fmt(v),          best: 'lowest'  },
  { key: 'roe',            label: 'ROE %',            fmt: v => `${fmt(v)}%`,    best: 'highest' },
  { key: 'roa',            label: 'ROA %',            fmt: v => `${fmt(v)}%`,    best: 'highest' },
  { key: 'debt_equity',    label: 'Debt / Equity',    fmt: v => fmt(v),          best: 'lowest'  },
  { key: 'net_margin',     label: 'Net Margin %',     fmt: v => `${fmt(v)}%`,    best: 'highest' },
  { key: 'revenue_growth', label: 'Revenue Growth %', fmt: v => `${fmt(v)}%`,    best: 'highest' },
  { key: 'dividend_yield', label: 'Dividend Yield %', fmt: v => `${fmt(v)}%`,    best: 'highest' },
  { key: 'week52_high',    label: '52W High (₹)',     fmt: v => `₹${fmt(v)}`,    best: null },
  { key: 'week52_low',     label: '52W Low (₹)',      fmt: v => `₹${fmt(v)}`,    best: null },
];

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

function getBestIndex(stocks, key, bestType) {
  if (!bestType || stocks.length < 2) return -1;
  const vals = stocks.map(s => parseFloat(s[key]));
  const validVals = vals.filter(v => !isNaN(v));
  if (validVals.length < 2) return -1;
  const target = bestType === 'lowest' ? Math.min(...validVals) : Math.max(...validVals);
  return vals.indexOf(target);
}

function StockSearch({ onAdd, existing, disabled }) {
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
          placeholder={disabled ? 'Max 3 stocks' : 'Add a stock to compare…'}
          value={query}
          onChange={handleInput}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
        />
        {busy && <Loader2 size={14} className="spin" />}
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

  const urlSymbols = (searchParams.get('symbols') || '').split(',').filter(Boolean).slice(0, 3);
  const cached = loadCache();
  const initialSymbols = urlSymbols.length > 0 ? urlSymbols : (cached?.symbols || []);
  const initialData    = cached?.data || null;

  const [symbols,  setSymbols]  = useState(initialSymbols);
  const [data,     setData]     = useState(initialData);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const dataMatchesSymbols = data?.stocks?.length >= 2 &&
    symbols.length >= 2 &&
    symbols.every(sym => data.stocks.some(s => s.symbol === sym));

  const addSymbol = useCallback((sym) => {
    if (symbols.length >= 3 || symbols.includes(sym)) return;
    setSymbols(prev => [...prev, sym]);
  }, [symbols]);

  const removeSymbol = useCallback((sym) => {
    setSymbols(prev => prev.filter(s => s !== sym));
  }, []);

  const runComparison = useCallback(() => {
    if (symbols.length < 2) return;
    setLoading(true);
    setError(null);
    compareStocks(symbols)
      .then(d => {
        setData(d);
        saveCache(symbols, d);
      })
      .catch(() => setError('Comparison failed. Please try again.'))
      .finally(() => setLoading(false));
  }, [symbols]);

  useEffect(() => {
    if (symbols.length < 2) return;
    saveCache(symbols, data);
  }, [symbols]);

  const stocks     = data?.stocks || [];
  const radarData  = stocks.length >= 2 ? normalize(stocks) : [];

  return (
    <div className="cmp-page">

      {/* Header */}
      <div className="cmp-header">
        <div className="cmp-header-icon-wrap">
          <ArrowRightLeft size={18} />
        </div>
        <h1 className="cmp-title">Compare Stocks</h1>
        {stocks.length >= 2 && (
          <span className="cmp-badge">{stocks.length} stocks</span>
        )}
      </div>

      {/* Selection bar */}
      <div className="cmp-selection-bar">
        <div className="cmp-search-area">
          <StockSearch
            onAdd={addSymbol}
            existing={symbols}
            disabled={symbols.length >= 3}
          />
        </div>

        <div className="cmp-chips-row">
          {symbols.map((sym, i) => (
            <span
              key={sym}
              className="cmp-chip"
              style={{ '--chip-color': CHIP_COLORS[i] }}
            >
              <span className="cmp-chip-dot" style={{ background: CHIP_COLORS[i] }} />
              <Link className="cmp-chip-label" to={`/stock/${sym}`}>
                {sym.replace('.NS', '').replace('.BO', '')}
              </Link>
              <button
                className="cmp-chip-x"
                onClick={() => removeSymbol(sym)}
              >
                <X size={10} />
              </button>
            </span>
          ))}

          {symbols.length >= 2 && !loading && (
            <button className="cmp-compare-btn" onClick={runComparison}>
              <ArrowRightLeft size={13} />
              Compare{dataMatchesSymbols ? ' again' : ''}
            </button>
          )}

          {symbols.length < 2 && (
            <span className="cmp-hint-text">Select at least 2 stocks</span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {symbols.length === 0 && !loading && !dataMatchesSymbols && (
        <div className="cmp-empty">
          <div className="cmp-empty-glow">
            <ArrowRightLeft size={28} />
          </div>
          <h2 className="cmp-empty-title">Compare stocks side by side</h2>
          <p className="cmp-empty-sub">
            Search above or pick from popular stocks. Add 2–3 stocks, then hit
            Compare to see fundamentals, radar charts, and an AI-powered summary.
          </p>
          <div className="cmp-quick-row">
            {QUICK_PICKS.filter(q => !symbols.includes(q.symbol)).map(q => (
              <button key={q.symbol} className="cmp-quick" onClick={() => addSymbol(q.symbol)}>
                <Plus size={10} /> {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {symbols.length === 1 && !loading && (
        <div className="cmp-empty cmp-empty--compact">
          <p className="cmp-empty-sub" style={{ marginBottom: 4 }}>
            Good start! Add one more stock, then hit Compare.
          </p>
          <div className="cmp-quick-row">
            {QUICK_PICKS.filter(q => !symbols.includes(q.symbol)).slice(0, 5).map(q => (
              <button key={q.symbol} className="cmp-quick" onClick={() => addSymbol(q.symbol)}>
                <Plus size={10} /> {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt to compare after selecting ≥2 but no data yet */}
      {symbols.length >= 2 && !data && !loading && !error && (
        <div className="cmp-empty cmp-empty--compact">
          <ArrowRightLeft size={22} style={{ color: '#60a5fa', opacity: 0.6 }} />
          <p className="cmp-empty-sub">
            Ready to compare <strong style={{ color: 'var(--text-primary)' }}>
              {symbols.map(s => s.replace('.NS','').replace('.BO','')).join(', ')}
            </strong>. Hit the Compare button above.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="cmp-empty cmp-empty--compact">
          <Loader2 size={24} className="spin" style={{ color: '#60a5fa' }} />
          <p className="cmp-empty-sub">Comparing stocks with AI…</p>
        </div>
      )}

      {/* Error */}
      {error && <div className="cmp-error"><AlertCircle size={15} /> {error}</div>}

      {data && !loading && stocks.length >= 2 && (
        <>
          {/* Radar chart — first, like lovable */}
          {radarData.length > 0 && (
            <div className="cmp-card">
              <h3 className="cmp-card-hdr">Multi-Dimensional Comparison</h3>
              <p className="cmp-card-sub">
                Normalized 0–100 across selected stocks. Higher = better (Debt is inverted).
              </p>
              <div className="cmp-radar-wrap">
                <ResponsiveContainer width="100%" height={288}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(217, 20%, 20%)" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: 'hsl(215, 16%, 55%)', fontSize: 11 }}
                    />
                    {stocks.map((s, i) => (
                      <Radar
                        key={i}
                        name={s.symbol?.replace('.NS', '')}
                        dataKey={`s${i}`}
                        stroke={CHIP_COLORS[i]}
                        fill={CHIP_COLORS[i]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Metrics table */}
          <div className="cmp-card">
            <h3 className="cmp-card-hdr">Fundamentals Comparison</h3>
            <div className="cmp-table-scroll">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th className="cmp-th cmp-th--metric">Metric</th>
                    {stocks.map((s, i) => (
                      <th key={s.symbol} className="cmp-th" style={{ color: CHIP_COLORS[i] }}>
                        <span className="cmp-th-sym">{s.symbol?.replace('.NS', '')}</span>
                        <span className="cmp-th-name">{s.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(({ key, label, fmt: fmtFn, best }) => {
                    const bestIdx = getBestIndex(stocks, key, best);
                    return (
                      <tr key={key}>
                        <td className="cmp-td cmp-td--metric">{label}</td>
                        {stocks.map((s, i) => (
                          <td
                            key={s.symbol}
                            className={`cmp-td${i === bestIdx ? ' cmp-td--best' : ''}`}
                          >
                            {fmtFn(s[key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI comparison */}
          {data.ai_comparison && (
            <div className="cmp-card cmp-card--ai">
              <h3 className="cmp-card-hdr">
                <Sparkles size={15} className="cmp-sparkle" />
                AI Comparison Summary
              </h3>
              <div className="cmp-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.ai_comparison}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Detail links */}
          <div className="cmp-links">
            {stocks.map((s, i) => (
              <Link
                key={s.symbol}
                className="cmp-link-btn"
                to={`/stock/${s.symbol}`}
                style={{ '--link-color': CHIP_COLORS[i] }}
              >
                View {s.symbol?.replace('.NS', '')} →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
