import { useEffect, useState, useCallback, useMemo } from 'react';
import './StockDetail.css';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart2, Loader2, AlertCircle,
  LayoutDashboard, Building2, Activity, ChevronRight,
  LineChart, ExternalLink, Newspaper,
  ShieldAlert, Brain, RefreshCw, Sparkles,
} from 'lucide-react';
import {
  getStockMetrics, getStockHistory, getStockInfo,
  getStockSentiment, getStockFundamentals, getStockTechnicalSummary,
  getStockNews,
} from '../services/stockDetailApi';
import { useStockAnalysis } from '../hooks/useStockAnalysis';
import ToolResultRenderer from '../components/ToolResults';

// ── Constants ──
const PERIODS = [
  { label: '1D', value: '1d' }, { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' }, { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
];

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'fundamental', label: 'Fundamental', icon: BarChart2 },
  { id: 'technical',   label: 'Technical',   icon: LineChart },
  { id: 'sentiment',   label: 'Sentiment',   icon: Activity },
];

const VERDICT_COLORS = {
  Bullish:  { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)' },
  Bearish:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)' },
  Neutral:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
};

// ── Helpers ──
const fmt = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L Cr`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};
const fmtLargeINR = (v) => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `₹${(n / 1e12).toFixed(2)}L Cr`;
  if (abs >= 1e10) return `₹${(n / 1e10).toFixed(2)}K Cr`;
  if (abs >= 1e7)  return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5)  return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

// ── Chart Tooltip ──
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sdp-chart-tooltip">
      <p className="sdp-tt-date">{label}</p>
      <p className="sdp-tt-price">₹{payload[0]?.value?.toFixed(2)}</p>
    </div>
  );
};

// ── Price Chart (shared) ──
function PriceChart({ symbol, defaultPeriod = '6mo' }) {
  const [history, setHistory]       = useState([]);
  const [period, setPeriod]         = useState(defaultPeriod);
  const [interval, setIntervalVal]  = useState('1d');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    getStockHistory(symbol, period)
      .then(d => { setHistory(d.history || []); setIntervalVal(d.interval || '1d'); })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  const isIntraday = interval === '5m' || interval === '1h';
  const chartColor = history.length > 1 && history[history.length - 1]?.close >= history[0]?.close
    ? '#22c55e' : '#ef4444';

  const formatXAxis = (tick) => {
    const d = new Date(tick);
    if (isIntraday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="sdp-chart-card">
      <div className="sdp-chart-header">
        <span className="sdp-chart-title"><BarChart2 size={15} /> Price History</span>
        <div className="sdp-period-tabs">
          {PERIODS.map(p => (
            <button key={p.value} className={`sdp-period-tab${period === p.value ? ' active' : ''}`}
              onClick={() => setPeriod(p.value)}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="sdp-chart-body">
        {loading ? (
          <div className="sdp-chart-loading"><Loader2 size={20} className="spin" /></div>
        ) : history.length === 0 ? (
          <div className="sdp-chart-empty">No chart data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={history} margin={{ top: 12, right: 60, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={50} />
              <YAxis orientation="right" domain={['auto', 'auto']} tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false} tickLine={false} width={60} tickCount={6}
                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(1)}K` : `₹${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={2}
                fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ── Indicator Card (for Technical) ──
function IndicatorCard({ title, value, signal, subtitle, icon: Icon = Activity }) {
  const signalClass = signal === 'N/A' ? '' :
    ['Bullish', 'Bullish Crossover', 'Above', 'Oversold', 'Approaching Oversold'].includes(signal) ? 'positive' :
    ['Bearish', 'Bearish Crossover', 'Below', 'Overbought', 'Approaching Overbought'].includes(signal) ? 'negative' : '';

  return (
    <div className={`sdp-indicator-card ${signalClass}`}>
      <div className="sdp-ind-header">
        <Icon size={14} />
        <span className="sdp-ind-title">{title}</span>
      </div>
      <span className="sdp-ind-value">{value ?? '—'}</span>
      <span className={`sdp-ind-signal ${signalClass}`}>{signal}</span>
      {subtitle && <span className="sdp-ind-sub">{subtitle}</span>}
    </div>
  );
}

// ── Metric Row ──
function MetricRow({ label, value, assessment }) {
  const cls = assessment === 'good' ? 'positive' : assessment === 'warn' ? 'negative' : '';
  return (
    <div className="sdp-metric-row">
      <span className="sdp-mr-label">{label}</span>
      <span className={`sdp-mr-value ${cls}`}>{value}</span>
    </div>
  );
}

// ── AI Analysis Section (reused across tabs) ──
const TOOL_LABELS = {
  calculate_indicator:  'Running technical indicator…',
  analyze_fundamentals: 'Fetching fundamental data…',
  analyze_sentiment:    'Analyzing sentiment…',
  screen_stocks:        'Screening stocks…',
};

function AIAnalysisSection({ symbol, prompt, buttonLabel = 'Analyze with AI' }) {
  const { loading, toolResults, aiText, error, toolStatus, analyze, reset } = useStockAnalysis();
  const [hasRun, setHasRun] = useState(false);

  const handleAnalyze = () => {
    setHasRun(true);
    analyze(prompt);
  };

  if (!hasRun) {
    return (
      <div className="sdp-ai-cta">
        <button className="sdp-ai-analyze-btn" onClick={handleAnalyze}>
          <Sparkles size={14} /> {buttonLabel}
        </button>
        <span className="sdp-ai-cta-hint">Get AI-powered interpretation of this data</span>
      </div>
    );
  }

  return (
    <div className="sdp-ai-result">
      {loading && toolStatus?.phase === 'running' && (
        <div className="sdp-ai-tool-badge">
          <Loader2 size={14} className="spin" />
          {TOOL_LABELS[toolStatus.tool] ?? `Using ${toolStatus.tool}…`}
        </div>
      )}
      {loading && !toolStatus && (
        <div className="sdp-ai-tool-badge">
          <Loader2 size={14} className="spin" /> Thinking…
        </div>
      )}

      {toolResults.length > 0 && <ToolResultRenderer toolResults={toolResults} />}

      {aiText && (
        <div className="sdp-ai-text">
          <div className="sdp-ai-text-header"><Brain size={14} /> AI Interpretation</div>
          <div className="sdp-ai-text-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiText}</ReactMarkdown>
          </div>
        </div>
      )}

      {error && (
        <div className="sdp-tab-error"><AlertCircle size={14} /> {error}</div>
      )}

      {!loading && hasRun && (
        <button className="sdp-retry-btn" onClick={handleAnalyze}>
          <RefreshCw size={12} /> Re-analyze
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ symbol, metrics, profile }) {
  const [techData, setTechData] = useState(null);
  const [sentData, setSentData] = useState(null);
  const [news, setNews]         = useState([]);
  const [techLoading, setTechLoading] = useState(true);
  const [sentLoading, setSentLoading] = useState(true);

  useEffect(() => {
    setTechLoading(true);
    getStockTechnicalSummary(symbol)
      .then(setTechData)
      .catch(() => setTechData(null))
      .finally(() => setTechLoading(false));

    setSentLoading(true);
    getStockSentiment(symbol)
      .then(setSentData)
      .catch(() => setSentData(null))
      .finally(() => setSentLoading(false));

    getStockNews(symbol, 4).then(d => setNews(d.news || [])).catch(() => {});
  }, [symbol]);

  const m = metrics || {};
  const s = sentData?.sentiment || {};
  const vc = VERDICT_COLORS[s.verdict] || VERDICT_COLORS.Neutral;
  const ind = techData?.indicators || {};

  return (
    <div className="sdp-overview">
      {/* AI Thesis */}
      {s.verdict && (
        <div className="sdp-thesis-card" style={{ borderColor: vc.border, background: vc.bg }}>
          <div className="sdp-thesis-header">
            <Brain size={18} style={{ color: vc.color }} />
            <span className="sdp-thesis-title" style={{ color: vc.color }}>
              AI Investment Thesis: {s.verdict}
            </span>
            {s.score != null && (
              <span className="sdp-thesis-score" style={{ color: vc.color }}>{s.score}/100</span>
            )}
          </div>
          {s.summary && <p className="sdp-thesis-text">{s.summary.split('\n')[0]}</p>}
          {(s.drivers || s.risks) && (
            <div className="sdp-thesis-chips">
              {s.drivers?.slice(0, 2).map((d, i) => (
                <span key={i} className="sdp-thesis-chip positive">{d}</span>
              ))}
              {s.risks?.slice(0, 1).map((r, i) => (
                <span key={i} className="sdp-thesis-chip negative">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {sentLoading && !s.verdict && (
        <div className="sdp-thesis-card loading">
          <Loader2 size={16} className="spin" /> Loading AI thesis...
        </div>
      )}

      {/* Two column: Chart + Sentiment/Indicators */}
      <div className="sdp-overview-grid">
        <div className="sdp-overview-left">
          <PriceChart symbol={symbol} defaultPeriod="6mo" />

          {/* Technical Indicator Cards */}
          <div className="sdp-indicators-row">
            {techLoading ? (
              <div className="sdp-ind-loading"><Loader2 size={16} className="spin" /> Loading indicators...</div>
            ) : techData ? (
              <>
                <IndicatorCard title="RSI (14)" value={ind.rsi?.value} signal={ind.rsi?.signal} />
                <IndicatorCard title="MACD" value={ind.macd?.value?.macd_line} signal={ind.macd?.signal}
                  subtitle={ind.macd?.value ? `Signal: ${ind.macd.value.signal_line}` : null} />
                <IndicatorCard title="SMA 50" value={ind.sma_50?.value ? `₹${ind.sma_50.value}` : null} signal={ind.sma_50?.signal} />
                <IndicatorCard title="SMA 200" value={ind.sma_200?.value ? `₹${ind.sma_200.value}` : null} signal={ind.sma_200?.signal} />
              </>
            ) : null}
          </div>
        </div>

        <div className="sdp-overview-right">
          {/* Sentiment Score */}
          {s.score != null && (
            <div className="sdp-sent-ring-card">
              <h4 className="sdp-card-title"><Activity size={14} /> Market Sentiment</h4>
              <div className="sdp-ring-wrap">
                <svg viewBox="0 0 120 120" className="sdp-ring-svg">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={vc.color} strokeWidth="10"
                    strokeDasharray={`${s.score * 3.14} ${314 - s.score * 3.14}`}
                    strokeLinecap="round" transform="rotate(-90 60 60)" />
                </svg>
                <div className="sdp-ring-center">
                  <span className="sdp-ring-num" style={{ color: vc.color }}>{s.score}</span>
                  <span className="sdp-ring-label">{s.verdict}</span>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="sdp-card">
            <h4 className="sdp-card-title"><BarChart2 size={14} /> Key Metrics</h4>
            <div className="sdp-metrics-list">
              <MetricRow label="P/E (TTM)" value={fmt(m.pe)} assessment={parseFloat(m.pe) < 15 ? 'good' : parseFloat(m.pe) > 40 ? 'warn' : ''} />
              <MetricRow label="P/B" value={fmt(m.pb)} />
              <MetricRow label="ROE" value={`${fmt(m.roe)}%`} assessment={parseFloat(m.roe) > 20 ? 'good' : ''} />
              <MetricRow label="Debt/Equity" value={fmt(m.debt_equity)} assessment={parseFloat(m.debt_equity) > 1.5 ? 'warn' : ''} />
              <MetricRow label="Net Margin" value={`${fmt(m.net_margin)}%`} assessment={parseFloat(m.net_margin) > 20 ? 'good' : ''} />
              <MetricRow label="Rev Growth" value={`${fmt(m.revenue_growth)}%`} assessment={parseFloat(m.revenue_growth) > 15 ? 'good' : parseFloat(m.revenue_growth) < 0 ? 'warn' : ''} />
              <MetricRow label="52W High" value={`₹${fmt(m.week52_high)}`} />
              <MetricRow label="52W Low" value={`₹${fmt(m.week52_low)}`} />
            </div>
          </div>

          {/* Recent News */}
          {news.length > 0 && (
            <div className="sdp-card">
              <h4 className="sdp-card-title"><Newspaper size={14} /> Recent News</h4>
              <div className="sdp-news-mini">
                {news.map((item, i) => (
                  <a key={i} className="sdp-news-item" href={item.url} target="_blank" rel="noreferrer">
                    <span className="sdp-news-title">{item.title}</span>
                    <span className="sdp-news-meta">
                      {item.publisher && <span>{item.publisher}</span>}
                      <ExternalLink size={10} />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Profile */}
      {profile && profile.longBusinessSummary && (
        <div className="sdp-card">
          <h4 className="sdp-card-title"><Building2 size={14} /> About {profile.longName || metrics?.name}</h4>
          <p className="sdp-about-text">{profile.longBusinessSummary}</p>
          <div className="sdp-about-chips">
            {profile.industry && <span className="sdp-chip">{profile.industry}</span>}
            {profile.sector && <span className="sdp-chip">{profile.sector}</span>}
            {profile.country && <span className="sdp-chip">{profile.country}</span>}
            {profile.fullTimeEmployees && <span className="sdp-chip">{profile.fullTimeEmployees.toLocaleString('en-IN')} employees</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNDAMENTAL TAB
// ═══════════════════════════════════════════════════════════════════════════════
function FundamentalTab({ symbol }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    getStockFundamentals(symbol)
      .then(setData)
      .catch(() => setError('Failed to load fundamental data.'))
      .finally(() => setLoading(false));
  }, [symbol]);

  const incomeHist = data?.income_statement?.historical || {};
  const revenueChartData = useMemo(() => {
    return Object.entries(incomeHist).slice(-5).map(([period, d]) => ({
      period: period.substring(0, 4),
      revenue: d.total_revenue ? d.total_revenue / 1e10 : 0,
      net_income: d.net_income ? d.net_income / 1e10 : 0,
    }));
  }, [incomeHist]);

  if (loading) return <div className="sdp-tab-loading"><Loader2 size={24} className="spin" /> Loading fundamentals...</div>;
  if (error) return <div className="sdp-tab-error"><AlertCircle size={16} /> {error}</div>;
  if (!data) return null;

  const km = data.key_metrics || {};
  const company = data.company || {};
  const income = data.income_statement?.latest || {};
  const bs = data.balance_sheet?.latest || {};
  const cf = data.cash_flow?.latest || {};

  return (
    <div className="sdp-fundamental">
      {/* Key Metrics Cards */}
      <div className="sdp-key-metrics-row">
        <div className="sdp-km-card">
          <span className="sdp-km-label">Market Cap</span>
          <span className="sdp-km-value">{fmtLargeINR(km.market_cap)}</span>
        </div>
        <div className="sdp-km-card">
          <span className="sdp-km-label">P/E (TTM)</span>
          <span className="sdp-km-value">{km.pe_ttm != null ? `${km.pe_ttm}x` : '—'}</span>
          {km.pe_forward && <span className="sdp-km-sub">Fwd: {km.pe_forward}x</span>}
        </div>
        <div className="sdp-km-card">
          <span className="sdp-km-label">Revenue (TTM)</span>
          <span className="sdp-km-value">{fmtLargeINR(income.total_revenue)}</span>
          {km.revenue_growth != null && <span className={`sdp-km-sub ${km.revenue_growth >= 0 ? 'up' : 'dn'}`}>{km.revenue_growth >= 0 ? '+' : ''}{km.revenue_growth}% YoY</span>}
        </div>
        <div className="sdp-km-card">
          <span className="sdp-km-label">Free Cash Flow</span>
          <span className="sdp-km-value">{fmtLargeINR(cf.free_cash_flow)}</span>
        </div>
      </div>

      <div className="sdp-fund-grid">
        {/* Revenue Chart */}
        {revenueChartData.length > 1 && (
          <div className="sdp-card">
            <h4 className="sdp-card-title">Financial Performance</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v.toFixed(0)}K Cr`} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`₹${v.toFixed(1)}K Cr`]} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="net_income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Net Income" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Profitability */}
        <div className="sdp-card">
          <h4 className="sdp-card-title">Profitability</h4>
          <div className="sdp-margin-rows">
            {[
              { label: 'Gross Margin', value: km.gross_margin },
              { label: 'Operating Margin', value: km.operating_margin },
              { label: 'Net Margin', value: km.net_margin },
            ].map(({ label, value }) => (
              <div key={label} className="sdp-margin-row">
                <div className="sdp-margin-info">
                  <span>{label}</span>
                  <span className="sdp-margin-pct">{value != null ? `${value}%` : '—'}</span>
                </div>
                <div className="sdp-margin-bar-bg">
                  <div className="sdp-margin-bar" style={{ width: `${Math.min(Math.max(value || 0, 0), 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Balance Sheet + Valuation */}
      <div className="sdp-fund-grid">
        <div className="sdp-card">
          <h4 className="sdp-card-title">Balance Sheet Health</h4>
          <div className="sdp-metrics-list">
            <MetricRow label="Total Assets" value={fmtLargeINR(bs.total_assets)} />
            <MetricRow label="Total Debt" value={fmtLargeINR(bs.total_debt)} />
            <MetricRow label="Cash & Equivalents" value={fmtLargeINR(bs.cash_and_cash_equivalents)} />
            <MetricRow label="Current Ratio" value={fmt(km.current_ratio)} assessment={km.current_ratio >= 1.5 ? 'good' : km.current_ratio < 1 ? 'warn' : ''} />
            <MetricRow label="Debt to Equity" value={fmt(km.debt_to_equity)} assessment={km.debt_to_equity > 1.5 ? 'warn' : 'good'} />
          </div>
        </div>

        <div className="sdp-card">
          <h4 className="sdp-card-title">Valuation Multiples</h4>
          <div className="sdp-metrics-list">
            <MetricRow label="P/E (TTM)" value={km.pe_ttm != null ? `${km.pe_ttm}x` : '—'} />
            <MetricRow label="P/E (Forward)" value={km.pe_forward != null ? `${km.pe_forward}x` : '—'} />
            <MetricRow label="P/B" value={km.pb != null ? `${km.pb}x` : '—'} />
            <MetricRow label="P/S" value={km.ps != null ? `${km.ps}x` : '—'} />
            <MetricRow label="EV/EBITDA" value={km.ev_ebitda != null ? `${km.ev_ebitda}x` : '—'} />
            <MetricRow label="PEG" value={km.peg != null ? `${km.peg}x` : '—'} />
            <MetricRow label="EPS" value={km.eps != null ? `₹${km.eps}` : '—'} />
            <MetricRow label="Dividend Yield" value={km.dividend_yield != null ? `${km.dividend_yield}%` : '—'} />
          </div>
        </div>
      </div>

      <AIAnalysisSection symbol={symbol}
        prompt={`Perform fundamental analysis on ${symbol}`}
        buttonLabel="Get AI Fundamental Analysis" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICAL TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TechnicalTab({ symbol }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStockTechnicalSummary(symbol)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  const ind = data?.indicators || {};

  return (
    <div className="sdp-technical">
      <PriceChart symbol={symbol} defaultPeriod="1mo" />

      {loading ? (
        <div className="sdp-tab-loading"><Loader2 size={20} className="spin" /> Computing indicators...</div>
      ) : data ? (
        <>
          <div className="sdp-indicators-row">
            <IndicatorCard title="RSI (14)" value={ind.rsi?.value} signal={ind.rsi?.signal}
              subtitle={ind.rsi?.value != null ? `Period: ${ind.rsi.period} days` : null} />
            <IndicatorCard title="MACD" value={ind.macd?.value?.macd_line} signal={ind.macd?.signal}
              subtitle={ind.macd?.value ? `Signal: ${ind.macd.value.signal_line} | Hist: ${ind.macd.value.histogram}` : null} />
            <IndicatorCard title="SMA 20" value={ind.sma_20?.value ? `₹${ind.sma_20.value}` : null} signal={ind.sma_20?.signal} />
            <IndicatorCard title="SMA 50" value={ind.sma_50?.value ? `₹${ind.sma_50.value}` : null} signal={ind.sma_50?.signal} />
            <IndicatorCard title="SMA 200" value={ind.sma_200?.value ? `₹${ind.sma_200.value}` : null} signal={ind.sma_200?.signal} />
          </div>

          {/* Bollinger Bands */}
          {ind.bbands?.value && (
            <div className="sdp-card">
              <h4 className="sdp-card-title">Bollinger Bands (20, 2)</h4>
              <div className="sdp-metrics-list">
                {Object.entries(ind.bbands.value).map(([k, v]) => {
                  const label = k.includes('BBU') ? 'Upper Band' : k.includes('BBM') ? 'Middle Band' :
                    k.includes('BBL') ? 'Lower Band' : k.includes('BBB') ? 'Bandwidth %' : k.includes('BBP') ? '%B' : k;
                  return <MetricRow key={k} label={label} value={v != null ? (k.includes('BBB') || k.includes('BBP') ? fmt(v) : `₹${fmt(v)}`) : '—'} />;
                })}
              </div>
            </div>
          )}

          {/* Moving Average Summary */}
          <div className="sdp-card">
            <h4 className="sdp-card-title">Moving Average Summary</h4>
            <div className="sdp-ma-summary">
              {[
                { label: 'SMA 20', ...ind.sma_20 },
                { label: 'SMA 50', ...ind.sma_50 },
                { label: 'SMA 200', ...ind.sma_200 },
              ].map(ma => (
                <div key={ma.label} className="sdp-ma-row">
                  <span className="sdp-ma-label">{ma.label}</span>
                  <span className="sdp-ma-val">{ma.value != null ? `₹${ma.value}` : '—'}</span>
                  <span className={`sdp-ma-signal ${ma.signal === 'Above' ? 'positive' : ma.signal === 'Below' ? 'negative' : ''}`}>
                    {data.price && ma.value ? (ma.signal === 'Above' ? 'Price Above' : 'Price Below') : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="sdp-tab-error"><AlertCircle size={16} /> Could not load technical data.</div>
      )}

      <AIAnalysisSection symbol={symbol}
        prompt={`Calculate RSI, MACD, and SMA indicators for ${symbol} and interpret the signals`}
        buttonLabel="Get AI Technical Analysis" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SentimentTab({ symbol }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    getStockSentiment(symbol)
      .then(setData)
      .catch(e => setError(e.response?.data?.detail || 'Sentiment analysis failed.'))
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="sdp-tab-loading"><Loader2 size={24} className="spin" /> Analyzing sentiment (10-20s)...</div>
  );
  if (error) return (
    <div className="sdp-tab-error">
      <AlertCircle size={16} /> {error}
      <button className="sdp-retry-btn" onClick={load}><RefreshCw size={12} /> Retry</button>
    </div>
  );
  if (!data) return null;

  const s = data.sentiment || {};
  const raw = data.raw || {};
  const vc = VERDICT_COLORS[s.verdict] || VERDICT_COLORS.Neutral;

  return (
    <div className="sdp-sentiment">
      {/* Score + Verdict Header */}
      <div className="sdp-sent-header">
        <div className="sdp-sent-score-card" style={{ borderColor: vc.border, background: vc.bg }}>
          <span className="sdp-sent-label">AI Sentiment Index</span>
          <div className="sdp-sent-score-row">
            <span className="sdp-sent-big-score" style={{ color: vc.color }}>{s.score}</span>
            <span className="sdp-sent-max">/100</span>
            <span className="sdp-sent-badge" style={{ background: vc.color }}>{s.verdict}</span>
          </div>
          <div className="sdp-sent-bar-bg">
            <div className="sdp-sent-bar" style={{ width: `${s.score}%`, background: vc.color }} />
          </div>
        </div>

        <div className="sdp-sent-meta-grid">
          <div className="sdp-card compact">
            <span className="sdp-km-label">News Sentiment</span>
            <span className="sdp-km-value">{s.news_sentiment || '—'}</span>
          </div>
          <div className="sdp-card compact">
            <span className="sdp-km-label">Articles Analyzed</span>
            <span className="sdp-km-value">{raw.news_count ?? '—'}</span>
          </div>
          {raw.analyst?.target_mean && (
            <div className="sdp-card compact">
              <span className="sdp-km-label">Target Price</span>
              <span className="sdp-km-value">₹{raw.analyst.target_mean}</span>
            </div>
          )}
          {raw.analyst?.buy != null && (
            <div className="sdp-card compact">
              <span className="sdp-km-label">Analyst Ratings</span>
              <span className="sdp-km-value" style={{ fontSize: 13 }}>
                <span style={{ color: '#22c55e' }}>{(raw.analyst.strong_buy || 0) + (raw.analyst.buy || 0)} Buy</span>
                {' · '}{raw.analyst.hold || 0} Hold{' · '}
                <span style={{ color: '#ef4444' }}>{(raw.analyst.sell || 0) + (raw.analyst.strong_sell || 0)} Sell</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Drivers + Risks side by side */}
      <div className="sdp-fund-grid">
        {s.drivers?.length > 0 && (
          <div className="sdp-card">
            <h4 className="sdp-card-title"><TrendingUp size={14} /> Bullish Factors</h4>
            <ul className="sdp-factor-list positive">
              {s.drivers.map((d, i) => <li key={i}><ChevronRight size={12} />{d}</li>)}
            </ul>
          </div>
        )}
        {s.risks?.length > 0 && (
          <div className="sdp-card">
            <h4 className="sdp-card-title"><ShieldAlert size={14} /> Risk Factors</h4>
            <ul className="sdp-factor-list negative">
              {s.risks.map((r, i) => <li key={i}><ChevronRight size={12} />{r}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* AI Summary */}
      {s.summary && (
        <div className="sdp-card">
          <h4 className="sdp-card-title"><Brain size={14} /> AI Analyst Summary</h4>
          <p className="sdp-summary-text">{s.summary}</p>
        </div>
      )}

      {/* News Sources */}
      {raw.news_items?.length > 0 && (
        <div className="sdp-card">
          <h4 className="sdp-card-title"><Newspaper size={14} /> Influential Articles</h4>
          <div className="sdp-news-sources">
            {raw.news_items.map((item, i) => (
              <a key={i} className="sdp-source-item" href={item.url} target="_blank" rel="noreferrer">
                <div className="sdp-source-top">
                  {item.publisher && <span className="sdp-source-pub">{item.publisher}</span>}
                  <span className="sdp-source-date">{item.date}</span>
                </div>
                <p className="sdp-source-title">{item.title}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      <button className="sdp-retry-btn" onClick={load} disabled={loading}>
        <RefreshCw size={12} /> Re-analyze sentiment data
      </button>

      <AIAnalysisSection symbol={symbol}
        prompt={`Analyze the current market sentiment for ${symbol} including news, analyst consensus, and price action`}
        buttonLabel="Get AI Sentiment Analysis" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [metrics, setMetrics]     = useState(null);
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true); setError(null); setProfile(null);
    const tab = searchParams.get('tab');
    if (tab && TABS.some(t => t.id === tab)) setActiveTab(tab);
    else setActiveTab('overview');

    Promise.all([
      getStockMetrics(symbol).then(d => setMetrics(d.metrics)),
      getStockInfo(symbol).then(d => setProfile(d.profile)).catch(() => {}),
    ])
      .catch(() => setError('Could not load stock data.'))
      .finally(() => setLoading(false));
  }, [symbol]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  if (loading) return (
    <div className="sdp-loading"><Loader2 size={28} className="spin" /><p>Loading {symbol}...</p></div>
  );
  if (error) return (
    <div className="sdp-error">
      <AlertCircle size={28} /><p>{error}</p>
      <button className="sdp-back-btn" onClick={() => navigate(-1)}>Go back</button>
    </div>
  );

  const m = metrics || {};
  const isUp = (m.change_pct ?? 0) >= 0;
  const cleanSymbol = symbol?.replace('.NS', '').replace('.BO', '');

  return (
    <div className="sdp-page">
      <div className="sdp-topnav">
        <button className="sdp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Stock Header */}
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

      {/* Tab Bar */}
      <div className="sdp-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`sdp-tab${activeTab === id ? ' active' : ''}`}
            onClick={() => handleTabChange(id)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab symbol={symbol} metrics={metrics} profile={profile} />}
      {activeTab === 'fundamental' && <FundamentalTab symbol={symbol} />}
      {activeTab === 'technical' && <TechnicalTab symbol={symbol} />}
      {activeTab === 'sentiment' && <SentimentTab symbol={symbol} />}
    </div>
  );
}
