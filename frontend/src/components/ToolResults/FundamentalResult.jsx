import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const fmt = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `₹${(n / 1e12).toFixed(1)}L Cr`;
  if (abs >= 1e10) return `₹${(n / 1e10).toFixed(1)}K Cr`;
  if (abs >= 1e7)  return `₹${(n / 1e7).toFixed(1)} Cr`;
  return `₹${n.toLocaleString('en-IN')}`;
};

function MetricCard({ label, value, sub, good }) {
  return (
    <div className={`tr-metric-card ${good === true ? 'positive' : good === false ? 'negative' : ''}`}>
      <span className="tr-metric-label">{label}</span>
      <span className="tr-metric-value">{value}</span>
      {sub && <span className="tr-metric-sub">{sub}</span>}
    </div>
  );
}

function MarginBar({ label, value }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  return (
    <div className="tr-margin-row">
      <div className="tr-margin-info">
        <span>{label}</span>
        <span className="tr-margin-pct">{value != null ? `${fmt(value, 1)}%` : '—'}</span>
      </div>
      <div className="tr-margin-bar-bg">
        <div className="tr-margin-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FundamentalResult({ data }) {
  if (!data?.success || !data?.data) return null;

  const { symbol } = data;
  const ratios = data.data.ratios;
  const income = data.data.income;
  const cashflow = data.data.cashflow;
  const bs = data.data.balance_sheet;

  const rd = ratios?.success ? ratios.data || {} : {};
  const val = rd.valuation_ratios || {};
  const prof = rd.profitability_ratios || {};
  const lev = rd.leverage_ratios || {};
  const liq = rd.liquidity_ratios || {};
  const growth = rd.growth_rates || {};
  const company = rd.company_info || {};
  const market = rd.market_metrics || {};
  const price = rd.price_metrics || {};

  const incStmt = income?.success ? income.income_statement || {} : {};
  const incHist = income?.success ? income.historical_data || {} : {};
  const cfStmt = cashflow?.success ? cashflow.cashflow || {} : {};
  const bsStmt = bs?.success ? bs.balance_sheet || {} : {};

  const revenueChartData = Object.entries(incHist).slice(-5).map(([period, d]) => ({
    period: period.substring(0, 4),
    revenue: d.total_revenue ? d.total_revenue / 1e10 : 0,
    net_income: d.net_income ? d.net_income / 1e10 : 0,
  }));

  const cleanSym = symbol?.replace('.NS', '').replace('.BO', '');

  return (
    <div className="tr-fundamental">
      <div className="tr-section-header">
        <BarChart2 size={16} />
        <span>Fundamental Analysis: {company.long_name || cleanSym}</span>
        {symbol && (
          <Link to={`/stock/${symbol}?tab=fundamental`} className="tr-view-link">
            View Dashboard →
          </Link>
        )}
      </div>

      {/* Key Metrics Row */}
      <div className="tr-metrics-row">
        <MetricCard label="Market Cap" value={fmtCr(market.market_cap)} />
        <MetricCard label="P/E (TTM)" value={val.trailing_pe ? `${fmt(val.trailing_pe)}x` : '—'}
          sub={val.forward_pe ? `Fwd: ${fmt(val.forward_pe)}x` : null}
          good={val.trailing_pe && val.trailing_pe < 25} />
        <MetricCard label="P/B" value={val.price_to_book ? `${fmt(val.price_to_book)}x` : '—'} />
        <MetricCard label="ROE" value={prof.return_on_equity ? `${fmt(prof.return_on_equity * 100, 1)}%` : '—'}
          good={prof.return_on_equity && prof.return_on_equity > 0.15} />
        <MetricCard label="D/E" value={fmt(lev.debt_to_equity)}
          good={lev.debt_to_equity != null ? lev.debt_to_equity < 1 : undefined} />
        <MetricCard label="Current Ratio" value={fmt(liq.current_ratio)}
          good={liq.current_ratio != null ? liq.current_ratio >= 1.5 : undefined} />
      </div>

      <div className="tr-two-col">
        {/* Revenue Chart */}
        {revenueChartData.length > 1 && (
          <div className="tr-card">
            <h4 className="tr-card-title">Revenue vs Net Income</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v.toFixed(0)}K Cr`} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`₹${v.toFixed(1)}K Cr`]} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Revenue" />
                <Bar dataKey="net_income" fill="#22c55e" radius={[3, 3, 0, 0]} name="Net Income" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Profitability Margins */}
        <div className="tr-card">
          <h4 className="tr-card-title">Profitability</h4>
          <div className="tr-margins">
            <MarginBar label="Gross Margin" value={prof.gross_margins ? prof.gross_margins * 100 : null} />
            <MarginBar label="Operating Margin" value={prof.operating_margins ? prof.operating_margins * 100 : null} />
            <MarginBar label="Net Margin" value={prof.profit_margins ? prof.profit_margins * 100 : null} />
          </div>
        </div>
      </div>

      {/* Cash Flow + Balance Sheet summary */}
      <div className="tr-two-col">
        {cashflow?.success && (
          <div className="tr-card">
            <h4 className="tr-card-title">Cash Flow</h4>
            <div className="tr-kv-list">
              <div className="tr-kv"><span>Operating CF</span><span>{fmtCr(cfStmt.operating_cash_flow)}</span></div>
              <div className="tr-kv"><span>Free Cash Flow</span><span>{fmtCr(cfStmt.free_cash_flow)}</span></div>
              <div className="tr-kv"><span>Capex</span><span>{fmtCr(cfStmt.capital_expenditure)}</span></div>
            </div>
          </div>
        )}
        {bs?.success && (
          <div className="tr-card">
            <h4 className="tr-card-title">Balance Sheet</h4>
            <div className="tr-kv-list">
              <div className="tr-kv"><span>Total Assets</span><span>{fmtCr(bsStmt.total_assets)}</span></div>
              <div className="tr-kv"><span>Total Debt</span><span>{fmtCr(bsStmt.total_debt)}</span></div>
              <div className="tr-kv"><span>Cash</span><span>{fmtCr(bsStmt.cash_and_cash_equivalents)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
