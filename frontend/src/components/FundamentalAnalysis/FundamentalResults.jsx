import ReactMarkdown from 'react-markdown';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import './FundamentalResults.css';

// ── Formatters ────────────────────────────────────────────────────────────────

const isIndian = (sym) => sym?.endsWith('.NS') || sym?.endsWith('.BO');

const fmtCurrency = (val, sym) => {
  if (val == null) return '—';
  const ind = isIndian(sym);
  const abs = Math.abs(val);
  if (ind) {
    if (abs >= 1e11) return `₹${(val / 1e7).toFixed(0)} Cr`;
    if (abs >= 1e9)  return `₹${(val / 1e7).toFixed(1)} Cr`;
    if (abs >= 1e7)  return `₹${(val / 1e7).toFixed(2)} Cr`;
    return `₹${val.toFixed(0)}`;
  }
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toFixed(0)}`;
};

const fmtAxis = (val, sym) => {
  if (!val && val !== 0) return '0';
  const ind = isIndian(sym);
  if (ind) {
    if (Math.abs(val) >= 1e9) return `${(val / 1e7).toFixed(0)}Cr`;
    if (Math.abs(val) >= 1e7) return `${(val / 1e7).toFixed(1)}Cr`;
    return val.toFixed(0);
  }
  if (Math.abs(val) >= 1e9)  return `${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6)  return `${(val / 1e6).toFixed(1)}M`;
  return val.toFixed(0);
};

const fmtPct  = (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%`;
const fmtPctD = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`;
const fmtX    = (v) => v == null ? '—' : `${Number(v).toFixed(1)}x`;
const fmtNum  = (v) => v == null ? '—' : Number(v).toFixed(2);
const fmtPrice = (v, sym) => {
  if (v == null) return '—';
  return isIndian(sym) ? `₹${Number(v).toFixed(2)}` : `$${Number(v).toFixed(2)}`;
};

// ── Section loading pills ────────────────────────────────────────────────────

const SECTION_LABELS = {
  ratios: '📊 Ratios', cashflow: '💰 Cash Flow',
  balance_sheet: '🏦 Balance Sheet', pnl: '📈 P&L',
};

const SectionPills = ({ sections }) => (
  <div className="section-pills">
    {Object.entries(SECTION_LABELS).map(([k, label]) => {
      const s = sections[k];
      return (
        <div key={k} className={`section-pill section-pill--${s}`}>
          <span className="section-pill-dot">{s === 'complete' ? '✓' : s === 'pending' ? '⟳' : '○'}</span>
          {label}
        </div>
      );
    })}
  </div>
);

// ── Company header ───────────────────────────────────────────────────────────

const CompanyHeader = ({ data, symbol }) => {
  if (!data) return null;
  const c = data.company  || {};
  const a = data.analyst  || {};
  const upside = (a.target_mean && a.current_price)
    ? (((a.target_mean - a.current_price) / a.current_price) * 100).toFixed(1)
    : null;

  return (
    <div className="company-header">
      <div className="company-header-main">
        <div>
          <h2 className="company-name">{c.name || symbol}</h2>
          <div className="company-tags">
            {c.sector   && <span className="company-tag">{c.sector}</span>}
            {c.industry && <span className="company-tag company-tag--sec">{c.industry}</span>}
            {c.country  && <span className="company-tag company-tag--ghost">{c.country}</span>}
          </div>
        </div>
        <div className="company-price-block">
          <span className="company-price">{fmtPrice(c.current_price, symbol)}</span>
          <div className="company-price-sub">
            <span>MCap: {fmtCurrency(c.market_cap, symbol)}</span>
            {c.week52_high && c.week52_low && (
              <span>52W: {fmtPrice(c.week52_low, symbol)} – {fmtPrice(c.week52_high, symbol)}</span>
            )}
            {upside !== null && (
              <span className={parseFloat(upside) >= 0 ? 'txt-green' : 'txt-red'}>
                {parseFloat(upside) >= 0 ? '▲' : '▼'} {Math.abs(upside)}% to analyst target
              </span>
            )}
          </div>
        </div>
      </div>
      {c.summary && <p className="company-summary">{c.summary}</p>}
      <div className="company-meta-row">
        {c.employees && <span>👥 {Number(c.employees).toLocaleString()} employees</span>}
        {c.beta      && <span>β {Number(c.beta).toFixed(2)}</span>}
        {c.website   && <a href={c.website} target="_blank" rel="noopener noreferrer">🌐 Website</a>}
      </div>
    </div>
  );
};

// ── Financial dashboard ───────────────────────────────────────────────────────
// Three columns of metrics in one card: Valuation | Profitability | Health

const peQ   = (v) => !v ? null : v < 15 ? 'good' : v < 30 ? 'neutral' : 'warn';
const roeQ  = (v) => !v ? null : v > 0.25 ? 'good' : v > 0.12 ? 'neutral' : 'warn';
const mgQ   = (v) => !v ? null : v > 0.18 ? 'good' : v > 0.10 ? 'neutral' : 'warn';
const crQ   = (v) => !v ? null : v > 2 ? 'good' : v > 1 ? 'neutral' : 'warn';
const deQ   = (v) => !v ? null : v < 50 ? 'good' : v < 150 ? 'neutral' : 'warn';
const ndQ   = (v) => v == null ? null : v < 0 ? 'good' : v === 0 ? 'neutral' : 'warn';

const MetricRow = ({ label, value, q }) => (
  <div className="dash-metric-row">
    <span className="dash-metric-label">{label}</span>
    <span className={`dash-metric-value ${q ? `q-${q}` : ''}`}>{value}</span>
  </div>
);

const FinancialDashboard = ({ ratios, bs, pnl, cf, symbol, loading }) => {
  if (loading && !ratios && !bs) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-card-header"><h3>Financial Dashboard</h3></div>
        <div className="dashboard-skeleton">
          {[1,2,3].map(i => (
            <div key={i} className="dashboard-col-skeleton">
              <Skeleton className="h-5" style={{ width: '60%', marginBottom: 8 }} />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!ratios && !bs && !pnl && !cf) return null;

  const v    = ratios?.valuation    || {};
  const prof = ratios?.profitability || {};
  const liq  = ratios?.liquidity    || {};
  const div  = ratios?.dividend     || {};
  const gr   = ratios?.growth       || {};

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header"><h3>Financial Dashboard</h3></div>
      <div className="dashboard-grid">

        {/* Valuation column */}
        <div className="dashboard-col">
          <div className="dashboard-col-title">Valuation</div>
          <MetricRow label="PE (TTM)"    value={fmtX(v.pe)}          q={peQ(v.pe)} />
          <MetricRow label="Forward PE"  value={fmtX(v.forward_pe)} />
          <MetricRow label="Price / Book" value={fmtX(v.pb)} />
          <MetricRow label="EV / EBITDA" value={fmtX(v.ev_ebitda)} />
          <MetricRow label="P / Sales"   value={fmtX(v.ps)} />
          <MetricRow label="PEG"         value={fmtNum(v.peg)} />
        </div>

        {/* Profitability column */}
        <div className="dashboard-col">
          <div className="dashboard-col-title">Profitability</div>
          <MetricRow label="ROE"          value={fmtPct(prof.roe)}        q={roeQ(prof.roe)} />
          <MetricRow label="ROA"          value={fmtPct(prof.roa)} />
          <MetricRow label="Net Margin"   value={fmtPct(prof.net_margin)} q={mgQ(prof.net_margin)} />
          <MetricRow label="Gross Margin" value={fmtPct(prof.gross_margin)} />
          <MetricRow label="EBITDA Margin" value={fmtPct(prof.ebitda_margin)} />
          <MetricRow label="Op Margin"    value={fmtPct(prof.op_margin)} />
        </div>

        {/* Financial health column */}
        <div className="dashboard-col">
          <div className="dashboard-col-title">Financial Health</div>
          <MetricRow label="Current Ratio" value={fmtNum(liq.current_ratio)}  q={crQ(liq.current_ratio)} />
          <MetricRow label="Debt / Equity" value={liq.debt_equity != null ? `${fmtNum(liq.debt_equity)}%` : '—'} q={deQ(liq.debt_equity)} />
          <MetricRow label="Net Debt"       value={fmtCurrency(bs?.net_debt, symbol)}         q={ndQ(bs?.net_debt)} />
          <MetricRow label="Div Yield"      value={div.yield != null ? fmtPct(div.yield) : '—'} />
          <MetricRow label="Rev Growth"     value={gr.revenue_growth != null ? fmtPct(gr.revenue_growth) : '—'} q={gr.revenue_growth > 0 ? 'good' : gr.revenue_growth < 0 ? 'warn' : null} />
          <MetricRow label="EPS Growth"     value={gr.earnings_growth != null ? fmtPct(gr.earnings_growth) : '—'} q={gr.earnings_growth > 0 ? 'good' : gr.earnings_growth < 0 ? 'warn' : null} />
        </div>
      </div>
    </div>
  );
};

// ── Historical charts (side by side) ────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e2538', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
  labelStyle: { color: '#e5e7eb' },
  itemStyle: { color: '#c3c9d5' },
};

const HistoricalCharts = ({ pnl, cf, symbol, loading }) => {
  const pnlData = (pnl?.historical || []).filter((d) => d.revenue != null);
  const cfData  = (cf?.historical  || []).filter((d) => d.ocf  != null);

  if (loading && !pnl && !cf) {
    return (
      <div className="charts-row">
        <div className="chart-card"><Skeleton className="h-48" /></div>
        <div className="chart-card"><Skeleton className="h-48" /></div>
      </div>
    );
  }

  if (!pnl && !cf) return null;

  return (
    <div className="charts-row">
      <div className="chart-card">
        <div className="chart-card-title">Revenue &amp; Net Income</div>
        {pnlData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pnlData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tickFormatter={(v) => fmtAxis(v, symbol)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={52} />
              <Tooltip formatter={(v, n) => [fmtCurrency(v, symbol), n]} {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              <Bar dataKey="revenue"    name="Revenue"    fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="net_income" name="Net Income" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">No historical data</div>}
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Operating &amp; Free Cash Flow</div>
        {cfData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cfData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tickFormatter={(v) => fmtAxis(v, symbol)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={52} />
              <Tooltip formatter={(v, n) => [fmtCurrency(v, symbol), n]} {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              <Bar dataKey="ocf" name="Operating CF" fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="fcf" name="Free CF"      fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">No historical data</div>}
      </div>
    </div>
  );
};

// ── Investment analysis card ──────────────────────────────────────────────────
// One card, streams 4 sections sequentially — reads like a research report

const ANALYSIS_SECTIONS = [
  { key: 'ratios',        icon: '📊', title: 'Valuation & Profitability' },
  { key: 'pnl',          icon: '📈', title: 'Revenue & Earnings' },
  { key: 'cashflow',     icon: '💰', title: 'Cash Flow Quality' },
  { key: 'balance_sheet',icon: '🏦', title: 'Balance Sheet' },
];

const InvestmentAnalysis = ({ commentary, activeSection, phase, loading }) => {
  const anyCommentary = Object.values(commentary).some(Boolean);
  const isAnalyzing   = loading && (phase === 'analyzing' || anyCommentary);

  if (!anyCommentary && !isAnalyzing) return null;

  return (
    <div className="analysis-card">
      <div className="analysis-card-header">
        <span className="analysis-header-icon">✦</span>
        <h3>Investment Analysis</h3>
        {isAnalyzing && !anyCommentary && <span className="analysis-status">Generating…</span>}
        {isAnalyzing && anyCommentary   && <span className="analysis-status">Streaming…</span>}
      </div>

      {/* Show skeleton only before first token arrives */}
      {!anyCommentary && isAnalyzing && (
        <div className="analysis-skeleton">
          <Skeleton className="h-5" style={{ width: '40%' }} />
          <Skeleton className="h-4" style={{ width: '80%' }} />
          <Skeleton className="h-4" style={{ width: '65%' }} />
          <Skeleton className="h-4" style={{ width: '72%' }} />
        </div>
      )}

      <div className="analysis-sections">
        {ANALYSIS_SECTIONS.map(({ key, icon, title }) => {
          const text = commentary[key] || '';
          const isThis = activeSection === key;
          if (!text && !isThis) return null;

          return (
            <div key={key} className={`analysis-section ${isThis ? 'analysis-section--active' : ''}`}>
              <div className="analysis-section-title">
                <span>{icon}</span> {title}
                {isThis && <span className="analysis-streaming-dot" />}
              </div>
              <div className="analysis-section-text">
                <ReactMarkdown>{text}</ReactMarkdown>
                {isThis && <span className="streaming-cursor" aria-hidden="true" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Analyst consensus card ───────────────────────────────────────────────────

const REC_STYLE = {
  'strong buy':   ['STRONG BUY',   'rec-strong-buy'],
  'buy':          ['BUY',          'rec-buy'],
  'hold':         ['HOLD',         'rec-hold'],
  'underperform': ['UNDERPERFORM', 'rec-sell'],
  'sell':         ['SELL',         'rec-sell'],
};

const AnalystCard = ({ data, symbol }) => {
  if (!data?.analyst?.recommendation) return null;
  const a = data.analyst;
  const [recLabel, recClass] = REC_STYLE[(a.recommendation || '').toLowerCase()] || [a.recommendation?.toUpperCase(), 'rec-hold'];
  const upside = (a.target_mean && a.current_price)
    ? (((a.target_mean - a.current_price) / a.current_price) * 100).toFixed(1) : null;

  return (
    <div className="analyst-card">
      <div className="analyst-card-header">
        <span>🎯</span>
        <h3>Analyst Consensus</h3>
        {a.num_analysts && <span className="analyst-count">{a.num_analysts} analysts</span>}
      </div>
      <div className="analyst-body">
        <span className={`analyst-rec ${recClass}`}>{recLabel}</span>
        <div className="analyst-targets">
          {[['Current', a.current_price], ['Avg Target', a.target_mean], ['High', a.target_high], ['Low', a.target_low]].map(([lbl, val]) =>
            val != null ? (
              <div key={lbl} className="analyst-target">
                <span className="analyst-target-label">{lbl}</span>
                <span className="analyst-target-value">{fmtPrice(val, symbol)}</span>
              </div>
            ) : null
          )}
          {upside !== null && (
            <div className="analyst-target">
              <span className="analyst-target-label">Upside</span>
              <span className={`analyst-target-value ${parseFloat(upside) >= 0 ? 'txt-green' : 'txt-red'}`}>
                {parseFloat(upside) >= 0 ? '+' : ''}{upside}%
              </span>
            </div>
          )}
        </div>
        {a.target_low != null && a.target_high != null && (
          <div className="analyst-range">
            <span className="range-label">{fmtPrice(a.target_low, symbol)}</span>
            <div className="range-track">
              {a.current_price && (
                <div className="range-dot" style={{
                  left: `${Math.max(0, Math.min(100,
                    ((a.current_price - a.target_low) / (a.target_high - a.target_low)) * 100
                  ))}%`,
                }} />
              )}
              <div className="range-mean" style={{
                left: `${Math.max(0, Math.min(100,
                  ((a.target_mean - a.target_low) / (a.target_high - a.target_low)) * 100
                ))}%`,
              }} />
            </div>
            <span className="range-label">{fmtPrice(a.target_high, symbol)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Component deep-dive (single streaming markdown) ──────────────────────────

const DEEP_DIVE_TITLES = {
  ratios: '📊 Key Ratios — Deep Dive', balance_sheet: '🏦 Balance Sheet — Deep Dive',
  cashflow: '💰 Cash Flow — Deep Dive', income: '📈 Income Statement — Deep Dive',
};

const ComponentDeepDive = ({ result, loading, streamingReport, analysisType }) => {
  const text = streamingReport || result?.consolidated_report || '';
  const isStreaming = loading && !!streamingReport;

  if (loading && !streamingReport) {
    return (
      <div className="analysis-card">
        <div className="analysis-card-header">
          <h3>{DEEP_DIVE_TITLES[analysisType] || 'Deep Dive'}</h3>
        </div>
        <div className="analysis-skeleton">
          <Skeleton className="h-6" style={{ width: '40%' }} />
          <Skeleton className="h-4" style={{ width: '70%' }} />
          <Skeleton className="h-4" style={{ width: '55%' }} />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className={`analysis-card ${isStreaming ? 'analysis-card--streaming' : ''}`}>
      <div className="analysis-card-header">
        <h3>{DEEP_DIVE_TITLES[analysisType] || 'Deep Dive'}</h3>
        {isStreaming && <span className="analysis-status">Streaming…</span>}
      </div>
      <div className="deep-dive-body">
        <ReactMarkdown>{text}</ReactMarkdown>
        {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const EMPTY_COMMENTARY = { ratios: '', cashflow: '', balance_sheet: '', pnl: '' };

const FundamentalResults = ({
  result,
  loading,
  analysisType = 'all',
  streamingReport = '',
  sections = { ratios: 'idle', cashflow: 'idle', balance_sheet: 'idle', pnl: 'idle' },
  sectionData = {},
  sectionCommentary = EMPTY_COMMENTARY,
  activeAnalysisSection = null,
  phase = 'idle',
  symbol = '',
}) => {
  const isFullAnalysis = !analysisType || analysisType === 'all';
  const hasStarted = loading || !!result || !!streamingReport;

  if (!hasStarted) {
    return (
      <EmptyState title="No analysis yet" description="Select a stock and analysis view, then click Run." />
    );
  }

  if (!isFullAnalysis) {
    return (
      <div className="fundamental-results">
        <ComponentDeepDive result={result} loading={loading} streamingReport={streamingReport} analysisType={analysisType} />
      </div>
    );
  }

  // Resolve data from live state or cached result
  const ratioData = sectionData.ratios        || result?.sectionData?.ratios;
  const pnlData   = sectionData.pnl           || result?.sectionData?.pnl;
  const cfData    = sectionData.cashflow       || result?.sectionData?.cashflow;
  const bsData    = sectionData.balance_sheet  || result?.sectionData?.balance_sheet;

  const commentary = {
    ratios:        sectionCommentary.ratios        || result?.commentary?.ratios        || '',
    pnl:           sectionCommentary.pnl           || result?.commentary?.pnl           || '',
    cashflow:      sectionCommentary.cashflow      || result?.commentary?.cashflow      || '',
    balance_sheet: sectionCommentary.balance_sheet || result?.commentary?.balance_sheet || '',
  };

  const anyDataLoaded = ratioData || pnlData || cfData || bsData;

  return (
    <div className="fundamental-results">
      {/* Fetch progress pills (disappear once analysis starts) */}
      {loading && phase === 'fetching' && <SectionPills sections={sections} />}

      {/* Zone 1: Company header */}
      {ratioData
        ? <CompanyHeader data={ratioData} symbol={symbol} />
        : loading && (
          <div className="header-skeleton">
            <Skeleton className="h-8" style={{ width: '45%' }} />
            <Skeleton className="h-4" style={{ width: '30%' }} />
            <Skeleton className="h-4" style={{ width: '60%' }} />
          </div>
        )
      }

      {/* Zone 2: Financial dashboard (metrics) */}
      {(anyDataLoaded || loading) && (
        <FinancialDashboard
          ratios={ratioData}
          bs={bsData}
          pnl={pnlData}
          cf={cfData}
          symbol={symbol}
          loading={loading}
        />
      )}

      {/* Zone 3: Historical charts */}
      {(pnlData || cfData || loading) && (
        <HistoricalCharts pnl={pnlData} cf={cfData} symbol={symbol} loading={loading} />
      )}

      {/* Zone 4: Investment analysis (one card, streams section-by-section) */}
      <InvestmentAnalysis
        commentary={commentary}
        activeSection={activeAnalysisSection}
        phase={phase}
        loading={loading}
      />

      {/* Zone 5: Analyst consensus */}
      {ratioData && <AnalystCard data={ratioData} symbol={symbol} />}
    </div>
  );
};

export default FundamentalResults;
