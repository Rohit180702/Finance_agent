import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart2, GitCompare,
  Brain, Loader2, AlertCircle,
} from 'lucide-react';
import { getStockMetrics, getStockHistory } from '../services/stockDetailApi';

const PERIODS = [
  { label: '1D',  value: '1d'  },
  { label: '5D',  value: '5d'  },
  { label: '1M',  value: '1mo' },
  { label: '6M',  value: '6mo' },
  { label: 'YTD', value: 'ytd' },
  { label: '1Y',  value: '1y'  },
  { label: 'ALL', value: 'max' },
];

const fmt  = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L Cr`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

const MetricCard = ({ label, value, highlight }) => (
  <div className={`sdp-metric-card${highlight ? ` ${highlight}` : ''}`}>
    <span className="sdp-metric-label">{label}</span>
    <span className="sdp-metric-value">{value}</span>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sdp-chart-tooltip">
      <p className="sdp-tt-date">{label}</p>
      <p className="sdp-tt-price">₹{payload[0]?.value?.toFixed(2)}</p>
    </div>
  );
};

export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate   = useNavigate();

  const [metrics,  setMetrics]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const [period,   setPeriod]   = useState('3mo');
  const [interval, setIntervalType] = useState('1d'); // track intraday vs daily
  const [loading,  setLoading]  = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error,    setError]    = useState(null);

  // Fetch metrics once
  useEffect(() => {
    setLoading(true);
    setError(null);
    getStockMetrics(symbol)
      .then(d => setMetrics(d.metrics))
      .catch(() => setError('Could not load stock data. Symbol may be invalid.'))
      .finally(() => setLoading(false));
  }, [symbol]);

  // Fetch chart history when period changes
  const loadHistory = useCallback((p) => {
    setChartLoading(true);
    getStockHistory(symbol, p)
      .then(d => { setHistory(d.history || []); setIntervalType(d.interval || '1d'); })
      .catch(() => setHistory([]))
      .finally(() => setChartLoading(false));
  }, [symbol]);

  useEffect(() => { loadHistory(period); }, [period, loadHistory]);

  if (loading) return (
    <div className="sdp-loading">
      <Loader2 size={32} className="spin" />
      <p>Loading {symbol}…</p>
    </div>
  );

  if (error) return (
    <div className="sdp-error">
      <AlertCircle size={32} />
      <p>{error}</p>
      <button className="sdp-back-btn" onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );

  const m          = metrics || {};
  const isUp       = (m.change_pct ?? 0) >= 0;
  const chartColor = history.length > 1 && history[history.length - 1]?.close >= history[0]?.close
    ? '#22c55e' : '#ef4444';

  // Chart X-axis: intraday shows time, daily shows date
  const isIntraday = interval === '5m' || interval === '1h';
  const formatXAxis = (tick) => {
    const d = new Date(tick);
    if (isIntraday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (period === 'max') return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const cleanSymbol = symbol?.replace('.NS', '').replace('.BO', '');

  return (
    <div className="sdp-page">

      {/* ── Top nav ── */}
      <div className="sdp-topnav">
        <button className="sdp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="sdp-topnav-actions">
          <Link
            className="sdp-action-btn sdp-compare-btn"
            to={`/compare?symbols=${symbol}`}
          >
            <GitCompare size={14} /> Compare
          </Link>
          <Link
            className="sdp-action-btn sdp-analyze-btn"
            to={`/fundamental?symbol=${symbol}`}
          >
            <Brain size={14} /> AI Analysis
          </Link>
        </div>
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
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isUp ? '+' : ''}{fmt(m.change)} ({isUp ? '+' : ''}{fmt(m.change_pct)}%)
          </span>
          <span className="sdp-mcap">{fmtCr(m.market_cap_cr)}</span>
        </div>
      </div>

      {/* ── Key metrics grid ── */}
      <div className="sdp-metrics-grid">
        <MetricCard label="P/E Ratio"    value={fmt(m.pe)}                  highlight={parseFloat(m.pe) < 15 ? 'good' : parseFloat(m.pe) > 40 ? 'warn' : ''} />
        <MetricCard label="P/B Ratio"    value={fmt(m.pb)}                  />
        <MetricCard label="ROE"          value={`${fmt(m.roe)}%`}           highlight={parseFloat(m.roe) > 20 ? 'good' : ''} />
        <MetricCard label="ROA"          value={`${fmt(m.roa)}%`}           />
        <MetricCard label="Debt / Equity" value={fmt(m.debt_equity)}        highlight={parseFloat(m.debt_equity) > 1.5 ? 'warn' : ''} />
        <MetricCard label="Net Margin"   value={`${fmt(m.net_margin)}%`}    highlight={parseFloat(m.net_margin) > 20 ? 'good' : ''} />
        <MetricCard label="Rev Growth"   value={`${fmt(m.revenue_growth)}%`} highlight={parseFloat(m.revenue_growth) > 15 ? 'good' : parseFloat(m.revenue_growth) < 0 ? 'warn' : ''} />
        <MetricCard label="Div Yield"    value={`${fmt(m.dividend_yield)}%`} />
        <MetricCard label="52W High"     value={`₹${fmt(m.week52_high)}`}  />
        <MetricCard label="52W Low"      value={`₹${fmt(m.week52_low)}`}   />
      </div>

      {/* ── Price chart ── */}
      <div className="sdp-chart-card">
        <div className="sdp-chart-header">
          <span className="sdp-chart-title">
            <BarChart2 size={15} /> Price History
          </span>
          <div className="sdp-period-tabs">
            {PERIODS.map(p => (
              <button
                key={p.value}
                className={`sdp-period-tab${period === p.value ? ' active' : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
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
              <AreaChart data={history} margin={{ top: 12, right: 72, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  orientation="right"
                  domain={['auto', 'auto']}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(1)}K` : `₹${v}`}
                  width={64}
                  tickCount={6}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: chartColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── CTA cards ── */}
      <div className="sdp-cta-row">
        <Link className="sdp-cta-card" to={`/fundamental?symbol=${symbol}`}>
          <Brain size={20} />
          <div>
            <p className="sdp-cta-title">AI Fundamental Analysis</p>
            <p className="sdp-cta-sub">Deep dive: balance sheet, cash flow, valuation</p>
          </div>
        </Link>
        <Link className="sdp-cta-card" to={`/compare?symbols=${symbol}`}>
          <GitCompare size={20} />
          <div>
            <p className="sdp-cta-title">Compare with Another Stock</p>
            <p className="sdp-cta-sub">Side-by-side metrics + AI verdict</p>
          </div>
        </Link>
      </div>

    </div>
  );
}
