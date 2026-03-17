import { useEffect, useState, useCallback, useRef } from 'react';
import './StockDetail.css';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip as ReTooltip,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart2, GitCompare,
  Brain, Loader2, AlertCircle, LayoutDashboard, Search, X,
  Globe, Users, MapPin, Building2, Newspaper, ExternalLink,
  Activity, ShieldAlert, ChevronRight, Star,
} from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import WatchlistPopover from '../components/Watchlist/WatchlistPopover';
import { getStockMetrics, getStockHistory, compareStocks, searchStocks, getStockInfo, getStockNews, getStockSentiment } from '../services/stockDetailApi';
import { useFundamental } from '../hooks/useFundamental';
import FundamentalForm from '../components/FundamentalAnalysis/FundamentalForm';
import FundamentalResults from '../components/FundamentalAnalysis/FundamentalResults';
import ErrorState from '../components/ui/ErrorState';

// ── Constants ──────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '1D', value: '1d' }, { label: '5D', value: '5d' },
  { label: '1M', value: '1mo' }, { label: '6M', value: '6mo' },
  { label: 'YTD', value: 'ytd' }, { label: '1Y', value: '1y' },
  { label: 'ALL', value: 'max' },
];

const TABS = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'news',       label: 'News',        icon: Newspaper       },
  { id: 'sentiment',  label: 'Sentiment',   icon: Activity        },
  { id: 'compare',    label: 'Compare',     icon: GitCompare      },
  { id: 'analysis',   label: 'AI Analysis', icon: Brain           },
];

const CHIP_COLORS   = ['#3b82f6', '#a855f7', '#f59e0b'];
const COMPARE_METRICS = [
  { key: 'price',          label: 'Price',         fmt: v => v != null ? `₹${parseFloat(v).toFixed(2)}` : '—' },
  { key: 'market_cap_cr',  label: 'Market Cap',    fmt: v => { const n=parseFloat(v); if(isNaN(n)) return '—'; return n>=1e5?`₹${(n/1e5).toFixed(1)}L Cr`:n>=1e3?`₹${(n/1e3).toFixed(1)}K Cr`:`₹${n.toFixed(0)} Cr`; }},
  { key: 'pe',             label: 'P/E',           fmt: v => v != null ? parseFloat(v).toFixed(2) : '—' },
  { key: 'pb',             label: 'P/B',           fmt: v => v != null ? parseFloat(v).toFixed(2) : '—' },
  { key: 'roe',            label: 'ROE %',         fmt: v => v != null ? `${parseFloat(v).toFixed(2)}%` : '—' },
  { key: 'roa',            label: 'ROA %',         fmt: v => v != null ? `${parseFloat(v).toFixed(2)}%` : '—' },
  { key: 'debt_equity',    label: 'D/E',           fmt: v => v != null ? parseFloat(v).toFixed(2) : '—' },
  { key: 'net_margin',     label: 'Net Margin %',  fmt: v => v != null ? `${parseFloat(v).toFixed(2)}%` : '—' },
  { key: 'revenue_growth', label: 'Rev Growth %',  fmt: v => v != null ? `${parseFloat(v).toFixed(2)}%` : '—' },
  { key: 'dividend_yield', label: 'Div Yield %',   fmt: v => v != null ? `${parseFloat(v).toFixed(2)}%` : '—' },
];
const RADAR_KEYS = [
  { key: 'roe', label: 'ROE', invert: false },
  { key: 'net_margin', label: 'Margin', invert: false },
  { key: 'revenue_growth', label: 'Growth', invert: false },
  { key: 'roa', label: 'ROA', invert: false },
  { key: 'debt_equity', label: 'Debt↓', invert: true },
  { key: 'dividend_yield', label: 'Yield', invert: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt   = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L Cr`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

function normalizeRadar(stocks) {
  return RADAR_KEYS.map(({ key, label, invert }) => {
    const vals  = stocks.map(s => parseFloat(s[key])).filter(v => !isNaN(v));
    const min   = Math.min(...vals);
    const max   = Math.max(...vals);
    const range = max - min || 1;
    const entry = { metric: label };
    stocks.forEach((s, i) => {
      let score = isNaN(parseFloat(s[key])) ? 0 : ((parseFloat(s[key]) - min) / range) * 100;
      if (invert) score = 100 - score;
      entry[`s${i}`] = Math.round(score);
    });
    return entry;
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, highlight }) => (
  <div className={`sdp-metric-card${highlight ? ` ${highlight}` : ''}`}>
    <span className="sdp-metric-label">{label}</span>
    <span className="sdp-metric-value">{value}</span>
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sdp-chart-tooltip">
      <p className="sdp-tt-date">{label}</p>
      <p className="sdp-tt-price">₹{payload[0]?.value?.toFixed(2)}</p>
    </div>
  );
};

// Stock search used inside Compare tab
function StockSearch({ onAdd, existing }) {
  const [query, setQuery] = useState('');
  const [res, setRes]     = useState([]);
  const [open, setOpen]   = useState(false);
  const timer = useRef(null);

  const handleInput = (e) => {
    const q = e.target.value; setQuery(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setRes([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try { const d = await searchStocks(q); setRes((d.stocks||[]).filter(s=>!existing.includes(s.symbol))); setOpen(true); }
      catch { setRes([]); }
    }, 300);
  };
  const pick = (s) => { onAdd(s.symbol); setQuery(''); setRes([]); setOpen(false); };

  return (
    <div className="cmp-search-wrap">
      <div className="cmp-search-box">
        <Search size={14} className="cmp-search-icon" />
        <input className="cmp-search-input" placeholder="Add stock to compare…"
          value={query} onChange={handleInput}
          onFocus={() => res.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)} />
      </div>
      {open && res.length > 0 && (
        <ul className="cmp-search-dropdown">
          {res.slice(0, 8).map(s => (
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

// ── Shared news card ───────────────────────────────────────────────────────────
function NewsCard({ item }) {
  const date = item.pub_date
    ? new Date(item.pub_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  return (
    <a className="news-card" href={item.url} target="_blank" rel="noreferrer">
      {item.thumbnail && <img className="news-thumb" src={item.thumbnail} alt="" loading="lazy" />}
      <div className="news-body">
        <p className="news-title">{item.title}</p>
        {item.summary && <p className="news-summary">{item.summary}</p>}
        <div className="news-meta">
          {item.publisher && <span className="news-publisher">{item.publisher}</span>}
          {date && <span className="news-date">{date}</span>}
          <ExternalLink size={11} className="news-ext-icon" />
        </div>
      </div>
    </a>
  );
}

// ── News Tab ───────────────────────────────────────────────────────────────────
function NewsTab({ symbol }) {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStockNews(symbol, 15)
      .then(d => setNews(d.news || []))
      .catch(() => setError('Could not load news.'))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return (
    <div className="news-loading"><Loader2 size={22} className="spin" /><p>Loading news…</p></div>
  );
  if (error) return (
    <div className="news-error"><AlertCircle size={16} /> {error}</div>
  );
  if (!news.length) return (
    <div className="news-empty"><Newspaper size={32} /><p>No recent news found for this stock.</p></div>
  );

  return (
    <div className="news-list">
      {news.map((item, i) => <NewsCard key={item.id || i} item={item} />)}
    </div>
  );
}

// ── Sentiment Tab ──────────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  Bullish:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  Bearish:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
  Neutral:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
};
const NEWS_SENTIMENT_COLOR = { Positive: '#22c55e', Negative: '#ef4444', Mixed: '#f59e0b', Neutral: '#9ca3af' };

function SentimentTab({ symbol }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [ran,     setRan]     = useState(false);

  const run = () => {
    setLoading(true); setError(null);
    getStockSentiment(symbol)
      .then(d => { setData(d); setRan(true); })
      .catch(e => setError(e.response?.data?.detail || 'Sentiment analysis failed.'))
      .finally(() => setLoading(false));
  };

  if (!ran && !loading) return (
    <div className="sent-idle">
      <Activity size={44} className="sent-idle-icon" />
      <h3 className="sent-idle-title">AI Sentiment Analysis</h3>
      <p className="sent-idle-sub">
        Analyses recent news, price trend, and analyst ratings using Claude to determine market sentiment.
      </p>
      <button className="sent-run-btn" onClick={run}>
        <Activity size={14} /> Run Sentiment Analysis
      </button>
    </div>
  );

  if (loading) return (
    <div className="sent-loading">
      <Loader2 size={28} className="spin" />
      <p>Analysing news, price trend, and analyst data…</p>
      <span>This takes 10–20 seconds</span>
    </div>
  );

  if (error) return (
    <div className="sent-error">
      <AlertCircle size={16} /> {error}
      <button className="sent-retry-btn" onClick={run}>Retry</button>
    </div>
  );

  const s   = data?.sentiment || {};
  const raw = data?.raw || {};
  const vc  = VERDICT_CONFIG[s.verdict] || VERDICT_CONFIG.Neutral;

  return (
    <div className="sent-result">

      {/* ── Score + Verdict ── */}
      <div className="sent-header-row">
        <div className="sent-verdict-card" style={{ background: vc.bg, borderColor: vc.border }}>
          <span className="sent-verdict-label" style={{ color: vc.color }}>{s.verdict}</span>
          <div className="sent-score-wrap">
            <span className="sent-score" style={{ color: vc.color }}>{s.score}</span>
            <span className="sent-score-max">/100</span>
          </div>
          <div className="sent-score-bar-wrap">
            <div className="sent-score-bar" style={{ width: `${s.score}%`, background: vc.color }} />
          </div>
        </div>

        <div className="sent-meta-cards">
          <div className="sent-meta-card">
            <span className="sent-meta-label">News Sentiment</span>
            <span className="sent-meta-value" style={{ color: NEWS_SENTIMENT_COLOR[s.news_sentiment] || '#9ca3af' }}>
              {s.news_sentiment || '—'}
            </span>
          </div>
          <div className="sent-meta-card">
            <span className="sent-meta-label">News Analysed</span>
            <span className="sent-meta-value">{raw.news_count ?? '—'} articles</span>
          </div>
          {raw.analyst?.target_mean && (
            <div className="sent-meta-card">
              <span className="sent-meta-label">Analyst Target</span>
              <span className="sent-meta-value">₹{raw.analyst.target_mean}</span>
            </div>
          )}
          {raw.analyst?.buy != null && (
            <div className="sent-meta-card">
              <span className="sent-meta-label">Analyst Ratings</span>
              <span className="sent-meta-value" style={{ color: '#22c55e' }}>
                {(raw.analyst.strong_buy || 0) + (raw.analyst.buy || 0)} Buy
                &nbsp;·&nbsp;
                <span style={{ color: '#9ca3af' }}>{raw.analyst.hold || 0} Hold</span>
                &nbsp;·&nbsp;
                <span style={{ color: '#ef4444' }}>{(raw.analyst.sell || 0) + (raw.analyst.strong_sell || 0)} Sell</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Drivers ── */}
      {s.drivers?.length > 0 && (
        <div className="sent-section">
          <h4 className="sent-section-title"><TrendingUp size={14} /> Key Drivers</h4>
          <ul className="sent-list sent-list--positive">
            {s.drivers.map((d, i) => (
              <li key={i}><ChevronRight size={12} />{d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Risks ── */}
      {s.risks?.length > 0 && (
        <div className="sent-section">
          <h4 className="sent-section-title"><ShieldAlert size={14} /> Risk Factors</h4>
          <ul className="sent-list sent-list--negative">
            {s.risks.map((r, i) => (
              <li key={i}><ChevronRight size={12} />{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── AI Summary ── */}
      {s.summary && (
        <div className="sent-section">
          <h4 className="sent-section-title"><Brain size={14} /> AI Summary</h4>
          <p className="sent-summary">{s.summary}</p>
        </div>
      )}

      {/* ── News Sources ── */}
      {raw.news_items?.length > 0 && (
        <div className="sent-section">
          <h4 className="sent-section-title"><Newspaper size={14} /> News Sources Used</h4>
          <div className="sent-sources-list">
            {raw.news_items.map((item, i) => (
              <a
                key={i}
                className="sent-source-card"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="sent-source-meta">
                  {item.publisher && <span className="sent-source-pub">{item.publisher}</span>}
                  <span className="sent-source-date">{item.date}</span>
                </div>
                <p className="sent-source-title">{item.title}</p>
                {item.summary && <p className="sent-source-summary">{item.summary}</p>}
                <ExternalLink size={11} className="sent-source-ext" />
              </a>
            ))}
          </div>
        </div>
      )}

      <button className="sent-rerun-btn" onClick={run} disabled={loading}>
        <Activity size={12} /> Re-analyse
      </button>
    </div>
  );
}

// ── Compare Tab ────────────────────────────────────────────────────────────────
function CompareTab({ initialSymbol }) {
  const [symbols, setSymbols]   = useState([initialSymbol]);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const addSymbol    = (sym) => { if (symbols.length >= 3 || symbols.includes(sym)) return; setSymbols(p => [...p, sym]); };
  const removeSymbol = (sym) => { if (sym === initialSymbol) return; setSymbols(p => p.filter(s => s !== sym)); };

  useEffect(() => {
    if (symbols.length < 2) { setData(null); return; }
    setLoading(true); setError(null);
    compareStocks(symbols)
      .then(setData)
      .catch(() => setError('Comparison failed. Try again.'))
      .finally(() => setLoading(false));
  }, [symbols]);

  const stocks    = data?.stocks || [];
  const radarData = stocks.length >= 2 ? normalizeRadar(stocks) : [];

  return (
    <div className="sdp-tab-content">
      {/* Chips */}
      <div className="cmp-chips-row">
        {symbols.map((sym, i) => (
          <span key={sym} className="cmp-chip" style={{ borderColor: CHIP_COLORS[i] }}>
            <span className="cmp-chip-dot" style={{ background: CHIP_COLORS[i] }} />
            {sym.replace('.NS','').replace('.BO','')}
            {sym !== initialSymbol && (
              <button className="cmp-chip-remove" onClick={() => removeSymbol(sym)}><X size={10} /></button>
            )}
          </span>
        ))}
        {symbols.length < 3 && <StockSearch onAdd={addSymbol} existing={symbols} />}
      </div>

      {symbols.length < 2 && (
        <div className="cmp-hint"><p>Add at least one more stock to compare.</p></div>
      )}

      {loading && <div className="cmp-loading"><Loader2 size={24} className="spin" /><p>Comparing with AI…</p></div>}
      {error   && <div className="cmp-error">{error}</div>}

      {data && !loading && (
        <>
          {/* Metrics table */}
          <div className="cmp-table-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th className="cmp-th metric-col">Metric</th>
                  {stocks.map((s, i) => (
                    <th key={s.symbol} className="cmp-th" style={{ color: CHIP_COLORS[i] }}>
                      <Link to={`/stock/${s.symbol}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {s.symbol?.replace('.NS','')}
                      </Link>
                      <br /><span className="cmp-th-name">{s.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_METRICS.map(({ key, label, fmt: fmtFn }) => (
                  <tr key={key} className="cmp-tr">
                    <td className="cmp-td metric-col">{label}</td>
                    {stocks.map(s => <td key={s.symbol} className="cmp-td">{fmtFn(s[key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Radar */}
          {radarData.length > 0 && (
            <div className="cmp-radar-card">
              <h3 className="cmp-section-title">Relative Strength Radar</h3>
              <p className="cmp-radar-note">Normalised 0–100. Higher = better (Debt inverted).</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  {stocks.map((_, i) => (
                    <Radar key={i} dataKey={`s${i}`} stroke={CHIP_COLORS[i]}
                      fill={CHIP_COLORS[i]} fillOpacity={0.12} strokeWidth={1.5} />
                  ))}
                  <ReTooltip contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8, fontSize:12 }}
                    labelStyle={{ color:'#e5e7eb' }} itemStyle={{ color:'#9ca3af' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI comparison */}
          {data.ai_comparison && (
            <div className="cmp-ai-card">
              <h3 className="cmp-section-title"><Brain size={16} /> AI Comparison</h3>
              <div className="cmp-ai-body markdown-body">
                <ReactMarkdown>{data.ai_comparison}</ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── AI Analysis Tab ────────────────────────────────────────────────────────────
function AnalysisTab({ symbol }) {
  const { loading, error, result, analyze, isCached } = useFundamental();
  const [analysisType, setAnalysisType] = useState('all');
  const [hasTriggered, setHasTriggered] = useState(false);

  // Auto-trigger on first render
  useEffect(() => {
    if (!hasTriggered) { analyze(symbol, 'all'); setHasTriggered(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (formData) => {
    await analyze(formData.symbol, analysisType);
  };

  return (
    <div className="sdp-tab-content">
      <div className="sdp-analysis-form-wrap">
        <FundamentalForm
          loading={loading}
          analysisType={analysisType}
          onAnalysisTypeChange={setAnalysisType}
          onSubmit={handleSubmit}
          isCached={isCached(symbol, analysisType)}
          defaultSymbol={symbol}
        />
      </div>
      {error && <ErrorState title="Analysis failed" message={error} />}
      <FundamentalResults result={result} loading={loading} analysisType={analysisType} />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate   = useNavigate();
  const { isWatchedInAny } = useWatchlist();
  const watched = isWatchedInAny(symbol);
  const [watchPopoverOpen, setWatchPopoverOpen] = useState(false);
  const watchBtnRef = useRef(null);

  const [activeTab,    setActiveTab]    = useState('overview');
  const [metrics,      setMetrics]      = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [history,      setHistory]      = useState([]);
  const [period,       setPeriod]       = useState('3mo');
  const [interval,     setIntervalType] = useState('1d');
  const [loading,      setLoading]      = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    setLoading(true); setError(null); setActiveTab('overview'); setProfile(null);
    getStockMetrics(symbol)
      .then(d => setMetrics(d.metrics))
      .catch(() => setError('Could not load stock data. Symbol may be invalid.'))
      .finally(() => setLoading(false));
    // fetch profile in parallel (non-blocking)
    getStockInfo(symbol)
      .then(d => setProfile(d.profile))
      .catch(() => {});
  }, [symbol]);

  const loadHistory = useCallback((p) => {
    setChartLoading(true);
    getStockHistory(symbol, p)
      .then(d => { setHistory(d.history || []); setIntervalType(d.interval || '1d'); })
      .catch(() => setHistory([]))
      .finally(() => setChartLoading(false));
  }, [symbol]);

  useEffect(() => { if (activeTab === 'overview') loadHistory(period); }, [period, loadHistory, activeTab]);

  if (loading) return (
    <div className="sdp-loading"><Loader2 size={32} className="spin" /><p>Loading {symbol}…</p></div>
  );
  if (error) return (
    <div className="sdp-error">
      <AlertCircle size={32} /><p>{error}</p>
      <button className="sdp-back-btn" onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );

  const m          = metrics || {};
  const isUp       = (m.change_pct ?? 0) >= 0;
  const chartColor = history.length > 1 && history[history.length-1]?.close >= history[0]?.close
    ? '#22c55e' : '#ef4444';
  const isIntraday = interval === '5m' || interval === '1h';
  const formatXAxis = (tick) => {
    const d = new Date(tick);
    if (isIntraday) return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false });
    if (period === 'max') return d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' });
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  };
  const cleanSymbol = symbol?.replace('.NS','').replace('.BO','');

  return (
    <div className="sdp-page">

      {/* ── Back ── */}
      <div className="sdp-topnav">
        <button className="sdp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* ── Stock header ── */}
      <div className="sdp-header">
        <div className="sdp-header-left">
          <div className="sdp-symbol-badge">{cleanSymbol}</div>
          <div>
            <h1 className="sdp-name">{m.name || symbol}</h1>
            <p className="sdp-meta">
              {m.sector && <span className="sector-tag">{m.sector}</span>}
              <span className="sdp-exchange">NSE</span>
            </p>
          </div>
        </div>
        <div className="sdp-header-right">
          <span className="sdp-price">₹{fmt(m.price)}</span>
          <span className={`sdp-change ${isUp ? 'up' : 'down'}`}>
            {isUp ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            {isUp?'+':''}{fmt(m.change)} ({isUp?'+':''}{fmt(m.change_pct)}%)
          </span>
          <span className="sdp-mcap">{fmtCr(m.market_cap_cr)}</span>
          <div style={{ position: 'relative' }}>
            <button
              ref={watchBtnRef}
              className={`sdp-watch-btn${watched ? ' watched' : ''}`}
              onClick={() => setWatchPopoverOpen((o) => !o)}
              title="Add to watchlist"
            >
              <Star size={14} fill={watched ? 'currentColor' : 'none'} />
              {watched ? 'Watching' : 'Watch'}
            </button>
            {watchPopoverOpen && (
              <WatchlistPopover
                symbol={symbol}
                anchorRef={watchBtnRef}
                onClose={() => setWatchPopoverOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="sdp-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sdp-tab${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <>
          <div className="sdp-metrics-grid">
            <MetricCard label="P/E Ratio"     value={fmt(m.pe)}                   highlight={parseFloat(m.pe)<15?'good':parseFloat(m.pe)>40?'warn':''} />
            <MetricCard label="P/B Ratio"     value={fmt(m.pb)}                   />
            <MetricCard label="ROE"           value={`${fmt(m.roe)}%`}            highlight={parseFloat(m.roe)>20?'good':''} />
            <MetricCard label="ROA"           value={`${fmt(m.roa)}%`}            />
            <MetricCard label="Debt / Equity" value={fmt(m.debt_equity)}          highlight={parseFloat(m.debt_equity)>1.5?'warn':''} />
            <MetricCard label="Net Margin"    value={`${fmt(m.net_margin)}%`}     highlight={parseFloat(m.net_margin)>20?'good':''} />
            <MetricCard label="Rev Growth"    value={`${fmt(m.revenue_growth)}%`} highlight={parseFloat(m.revenue_growth)>15?'good':parseFloat(m.revenue_growth)<0?'warn':''} />
            <MetricCard label="Div Yield"     value={`${fmt(m.dividend_yield)}%`} />
            <MetricCard label="52W High"      value={`₹${fmt(m.week52_high)}`}   />
            <MetricCard label="52W Low"       value={`₹${fmt(m.week52_low)}`}    />
          </div>

          <div className="sdp-chart-card">
            <div className="sdp-chart-header">
              <span className="sdp-chart-title"><BarChart2 size={15} /> Price History</span>
              <div className="sdp-period-tabs">
                {PERIODS.map(p => (
                  <button key={p.value} className={`sdp-period-tab${period===p.value?' active':''}`}
                    onClick={() => setPeriod(p.value)}>{p.label}</button>
                ))}
              </div>
            </div>
            <div className="sdp-chart-body">
              {chartLoading ? (
                <div className="sdp-chart-loading"><Loader2 size={20} className="spin" /></div>
              ) : history.length === 0 ? (
                <div className="sdp-chart-empty">No chart data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={500}>
                  <AreaChart data={history} margin={{ top:12, right:72, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fill:'#6b7280', fontSize:10 }}
                      axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
                    <YAxis orientation="right" domain={['auto','auto']} tick={{ fill:'#9ca3af', fontSize:11 }}
                      axisLine={false} tickLine={false} width={64} tickCount={6}
                      tickFormatter={v => v>=1000?`₹${(v/1000).toFixed(1)}K`:`₹${v}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={2}
                      fill="url(#priceGrad)" dot={false} activeDot={{ r:5, fill:chartColor, strokeWidth:0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── About / Company Profile ── */}
          {profile && (profile.longBusinessSummary || profile.website || profile.fullTimeEmployees || profile.city) && (
            <div className="sdp-about-card">
              <h3 className="sdp-about-title">About {profile.longName || m.name}</h3>

              {profile.longBusinessSummary && (
                <p className="sdp-about-desc">{profile.longBusinessSummary}</p>
              )}

              <div className="sdp-about-meta">
                {profile.industry && (
                  <span className="sdp-about-chip"><Building2 size={12} />{profile.industry}</span>
                )}
                {(profile.city || profile.country) && (
                  <span className="sdp-about-chip">
                    <MapPin size={12} />{[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {profile.fullTimeEmployees && (
                  <span className="sdp-about-chip">
                    <Users size={12} />{profile.fullTimeEmployees.toLocaleString('en-IN')} employees
                  </span>
                )}
                {profile.website && (
                  <a className="sdp-about-chip sdp-about-link" href={profile.website} target="_blank" rel="noreferrer">
                    <Globe size={12} />{profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── News tab ── */}
      {activeTab === 'news' && <NewsTab symbol={symbol} />}

      {/* ── Sentiment tab ── */}
      {activeTab === 'sentiment' && <SentimentTab symbol={symbol} />}

      {/* ── Compare tab ── */}
      {activeTab === 'compare' && <CompareTab initialSymbol={symbol} />}

      {/* ── AI Analysis tab ── */}
      {activeTab === 'analysis' && <AnalysisTab symbol={symbol} />}

    </div>
  );
}
