import { Link } from 'react-router-dom';
import {
  TrendingUp, BarChart3, Newspaper,
  ArrowUpRight, TrendingDown, RefreshCw,
} from 'lucide-react';
import { useMarketOverview } from '../hooks/useMarketOverview';
import Skeleton from '../components/ui/Skeleton';

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return null;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5)  return 'just now';
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

// ── Market index card ──────────────────────────────────────────────────────────
const MarketCard = ({ idx }) => {
  const up = idx.change_pct >= 0;
  return (
    <div className={`market-card${up ? ' is-up' : ' is-down'}`}>
      <span className="market-card-name">{idx.name}</span>
      {idx.price != null ? (
        <>
          <span className="market-card-price">
            {idx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          <span className={`market-card-change${up ? ' is-up' : ' is-down'}`}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {up ? '+' : ''}{idx.change?.toFixed(2)}&nbsp;
            ({up ? '+' : ''}{idx.change_pct?.toFixed(2)}%)
          </span>
        </>
      ) : (
        <span className="market-card-unavail">Unavailable</span>
      )}
    </div>
  );
};

// ── Quick-action cards ─────────────────────────────────────────────────────────
const ACTIONS = [
  {
    to: '/technical',
    icon: TrendingUp,
    label: 'Technical Analysis',
    desc: 'RSI, MACD, Bollinger Bands, EMA/SMA and more',
    color: 'cyan',
  },
  {
    to: '/fundamental',
    icon: BarChart3,
    label: 'Fundamental Analysis',
    desc: 'Ratios, balance sheet, cash flow, P&L deep-dive',
    color: 'blue',
  },
  {
    to: '/sentiment',
    icon: Newspaper,
    label: 'Sentiment Analysis',
    desc: 'News tone, social momentum, and market narrative',
    color: 'violet',
  },
];

// ── Dashboard page ─────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { indices, loading, refreshing, lastUpdated, marketOpen, refresh } = useMarketOverview();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="dashboard">
      {/* Hero */}
      <div className="dashboard-hero">
        <h2 className="dashboard-greeting">{greeting} 👋</h2>
        <p className="dashboard-date">{dateStr}</p>
      </div>

      {/* Market pulse */}
      <section className="dashboard-section">
        <div className="section-header">
          <h3 className="section-heading">Market Pulse</h3>

          <div className="market-meta">
            <span className={`market-status-pill${marketOpen ? ' is-open' : ' is-closed'}`}>
              {marketOpen ? '● Open' : '● Closed'}
            </span>
            {lastUpdated && (
              <span className="market-updated">
                Updated {timeAgo(lastUpdated)}
              </span>
            )}
            <button
              className={`refresh-btn${refreshing ? ' is-spinning' : ''}`}
              onClick={refresh}
              disabled={loading || refreshing}
              aria-label="Refresh market data"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div className="market-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="market-card">
                  <Skeleton className="h-16" />
                </div>
              ))
            : indices.map((idx) => <MarketCard key={idx.symbol} idx={idx} />)}
        </div>

        <p className="market-disclaimer">
          {marketOpen
            ? 'Prices via Yahoo Finance · refreshing every 5s · may lag ~15s behind live NSE'
            : 'Market closed · NSE/BSE open Mon–Fri 09:15–15:30 IST · showing last known prices'}
        </p>
      </section>

      {/* Quick analysis */}
      <section className="dashboard-section">
        <h3 className="section-heading">Quick Analysis</h3>
        <div className="quick-grid">
          {ACTIONS.map(({ to, icon: Icon, label, desc, color }) => (
            <Link key={to} to={to} className={`quick-card quick-card--${color}`}>
              <div className="quick-card-icon">
                <Icon size={20} />
              </div>
              <div className="quick-card-body">
                <span className="quick-card-label">{label}</span>
                <span className="quick-card-desc">{desc}</span>
              </div>
              <ArrowUpRight size={15} className="quick-card-arrow" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
