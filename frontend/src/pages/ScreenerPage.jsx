import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, RefreshCw, X, Database, GitCompare, Star } from 'lucide-react';
import { useScreener, PRESETS } from '../hooks/useScreener';
import { getCacheStatus } from '../services/screenerApi';
import { useWatchlist } from '../hooks/useWatchlist';
import WatchlistPopover from '../components/Watchlist/WatchlistPopover';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt  = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L Cr`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

// ── Sortable th ────────────────────────────────────────────────────────────────
const Th = ({ label, col, sortBy, sortDir, onSort }) => {
  const active = sortBy === col;
  const Icon   = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`stbl-th right${active ? ' sorted' : ''}`} onClick={() => onSort(col)}>
      {label} <Icon size={10} className="sort-icon" />
    </th>
  );
};

// ── Compact filter chip ────────────────────────────────────────────────────────
const FChip = ({ label, filterKey, filters, setFilter }) => (
  <label className="fbar-item">
    <span className="fbar-label">{label}</span>
    <input
      type="number"
      className="fbar-input"
      placeholder="—"
      value={filters[filterKey] ?? ''}
      onChange={e => setFilter(filterKey, e.target.value)}
    />
  </label>
);

// ─────────────────────────────────────────────────────────────────────────────
const ScreenerPage = () => {
  const navigate   = useNavigate();
  const sentinelRef = useRef(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const { isWatchedInAny } = useWatchlist();
  const [openPopover, setOpenPopover] = useState(null); // symbol string or null
  const starRefs = useRef({});

  const {
    stocks, total, loading, loadingMore, error, hasMore,
    filters, setFilter,
    sortBy, sortDir, toggleSort,
    activePreset, applyPreset, clearFilters, hasActiveFilters,
    loadMore,
  } = useScreener();

  // ── Cache status badge ─────────────────────────────────────────────────────
  useEffect(() => { getCacheStatus().then(setCacheStatus).catch(() => {}); }, []);

  // ── IntersectionObserver — trigger loadMore when sentinel enters viewport ──
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="screener-page">

      {/* ── Header ── */}
      <div className="screener-header">
        <div className="screener-header-left">
          <span className="screener-count">
            {loading
              ? <><Loader2 size={12} className="spin" /> Loading…</>
              : total === null
                ? 'No cache yet — run the background job first'
                : hasActiveFilters
                  ? `${stocks.length} of ${total?.toLocaleString()} stocks`
                  : `${total?.toLocaleString() ?? '—'} stocks`}
          </span>
        </div>

        <div className="screener-header-right">
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <button
              key={key}
              className={`preset-btn${activePreset === key ? ' is-active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
          {hasActiveFilters && (
            <button className="preset-btn preset-clear" onClick={clearFilters}>
              <X size={11} /> Clear filters
            </button>
          )}
          {cacheStatus?.cached && (
            <span className="cache-badge cache-warm">
              <Database size={10} />
              {cacheStatus.ok?.toLocaleString()} stocks · {cacheStatus.age_minutes}m ago
            </span>
          )}
          {!cacheStatus?.cached && (
            <span className="cache-badge cache-cold">
              <Database size={10} /> Cache warming up…
            </span>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="screener-fbar">
        <FChip label="PE ≤"       filterKey="pe_max"             filters={filters} setFilter={setFilter} />
        <FChip label="P/B ≤"      filterKey="pb_max"             filters={filters} setFilter={setFilter} />
        <FChip label="ROE ≥ %"    filterKey="roe_min"            filters={filters} setFilter={setFilter} />
        <FChip label="D/E ≤"      filterKey="debt_equity_max"    filters={filters} setFilter={setFilter} />
        <FChip label="Margin ≥ %" filterKey="net_margin_min"     filters={filters} setFilter={setFilter} />
        {showMore && <>
          <FChip label="PE ≥"        filterKey="pe_min"             filters={filters} setFilter={setFilter} />
          <FChip label="P/B ≥"       filterKey="pb_min"             filters={filters} setFilter={setFilter} />
          <FChip label="ROA ≥ %"     filterKey="roa_min"            filters={filters} setFilter={setFilter} />
          <FChip label="Rev Gr ≥ %"  filterKey="revenue_growth_min" filters={filters} setFilter={setFilter} />
          <FChip label="Div Yld ≥ %" filterKey="dividend_yield_min" filters={filters} setFilter={setFilter} />
          <FChip label="Mkt Cap ≥"   filterKey="market_cap_min"     filters={filters} setFilter={setFilter} />
          <FChip label="Mkt Cap ≤"   filterKey="market_cap_max"     filters={filters} setFilter={setFilter} />
        </>}
        <button className="fbar-toggle" onClick={() => setShowMore(p => !p)}>
          {showMore ? 'Less ▲' : 'More filters ▼'}
        </button>
      </div>

      {error && <div className="screener-error">⚠ {error}</div>}

      {/* ── Table ── */}
      <div className="stbl-wrap">
        {loading && stocks.length === 0 ? (
          <div className="screener-loading">
            <Loader2 size={24} className="spin" />
            <p>Loading stocks…</p>
            <span>
              {cacheStatus?.cached
                ? 'Reading from cache…'
                : 'Cache is cold — run the background job or wait for startup refresh.'}
            </span>
          </div>
        ) : (
          <table className="stbl">
            <thead>
              <tr>
                <th className="stbl-th idx-th">#</th>
                <th className="stbl-th">Symbol</th>
                <th className="stbl-th">Name</th>
                <th className="stbl-th">Sector</th>
                <Th label="Price"     col="price"          sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Mkt Cap"   col="market_cap_cr"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="PE"        col="pe"             sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="P/B"       col="pb"             sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="ROE %"     col="roe"            sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="D/E"       col="debt_equity"    sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Margin %"  col="net_margin"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Rev Gr %"  col="revenue_growth" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Div Yld %" col="dividend_yield" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <th className="stbl-th"></th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 && !loading ? (
                <tr><td colSpan={14} className="stbl-empty">No stocks match the current filters.</td></tr>
              ) : stocks.map((s, i) => (
                <tr key={s.symbol} className="stbl-row">
                  <td className="stbl-td idx-cell">{i + 1}</td>
                  <td className="stbl-td sym-cell">
                    <Link className="stbl-sym-link" to={`/stock/${s.symbol}`}>
                      {s.symbol?.replace('.NS', '')}
                    </Link>
                  </td>
                  <td className="stbl-td name-cell" title={s.name}>
                    <Link className="stbl-name-link" to={`/stock/${s.symbol}`}>{s.name}</Link>
                  </td>
                  <td className="stbl-td">
                    {s.sector ? <span className="sector-tag">{s.sector}</span> : '—'}
                  </td>
                  <td className="stbl-td right">₹{fmt(s.price)}</td>
                  <td className="stbl-td right">{fmtCr(s.market_cap_cr)}</td>
                  <td className="stbl-td right">{fmt(s.pe)}</td>
                  <td className="stbl-td right">{fmt(s.pb)}</td>
                  <td className={`stbl-td right${parseFloat(s.roe) > 20 ? ' good' : ''}`}>{fmt(s.roe)}%</td>
                  <td className={`stbl-td right${parseFloat(s.debt_equity) > 1.5 ? ' warn' : ''}`}>{fmt(s.debt_equity)}</td>
                  <td className="stbl-td right">{fmt(s.net_margin)}%</td>
                  <td className={`stbl-td right${parseFloat(s.revenue_growth) > 15 ? ' good' : parseFloat(s.revenue_growth) < 0 ? ' warn' : ''}`}>{fmt(s.revenue_growth)}%</td>
                  <td className="stbl-td right">{fmt(s.dividend_yield)}%</td>
                  <td className="stbl-td stbl-actions" style={{ position: 'relative' }}>
                    <button
                      ref={(el) => { starRefs.current[s.symbol] = el; }}
                      className={`watch-btn${isWatchedInAny(s.symbol) ? ' watched' : ''}`}
                      onClick={() => setOpenPopover((p) => p === s.symbol ? null : s.symbol)}
                      title="Add to watchlist"
                    >
                      <Star size={13} fill={isWatchedInAny(s.symbol) ? 'currentColor' : 'none'} />
                    </button>
                    {openPopover === s.symbol && (
                      <WatchlistPopover
                        symbol={s.symbol}
                        anchorRef={{ current: starRefs.current[s.symbol] }}
                        onClose={() => setOpenPopover(null)}
                      />
                    )}
                    <button className="analyze-btn" onClick={() => navigate(`/fundamental?symbol=${s.symbol}`)}>
                      Analyse
                    </button>
                    <Link className="compare-btn-sm" to={`/compare?symbols=${s.symbol}`} title="Compare">
                      <GitCompare size={12} />
                    </Link>
                  </td>
                </tr>
              ))}

              {/* Sentinel row — IntersectionObserver watches this */}
              <tr ref={sentinelRef}>
                <td colSpan={14} className="stbl-sentinel">
                  {loadingMore && (
                    <span className="stbl-loading-more">
                      <Loader2 size={14} className="spin" /> Loading more…
                    </span>
                  )}
                  {!hasMore && stocks.length > 0 && (
                    <span className="stbl-end">— {stocks.length} stocks —</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ScreenerPage;
