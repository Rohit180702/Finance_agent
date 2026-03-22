import { useEffect, useRef, useState } from 'react';
import './ScreenerPage.css';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Loader2, X,
  Database, GitCompare, Star, Search, SlidersHorizontal,
} from 'lucide-react';
import { useScreener, PRESETS } from '../hooks/useScreener';
import { getCacheStatus } from '../services/screenerApi';
import { useWatchlist } from '../hooks/useWatchlist';
import WatchlistPopover from '../components/Watchlist/WatchlistPopover';

const fmt  = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L Cr`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

const COLUMNS = [
  ['price',          'Price'],
  ['market_cap_cr',  'Mkt Cap'],
  ['pe',             'P/E'],
  ['pb',             'P/B'],
  ['roe',            'ROE %'],
  ['debt_equity',    'D/E'],
  ['net_margin',     'Margin %'],
  ['dividend_yield', 'Div Yld %'],
];

const SortTh = ({ label, col, sortBy, sortDir, onSort }) => {
  const active = sortBy === col;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`sc-th right${active ? ' sorted' : ''}`} onClick={() => onSort(col)}>
      <span className="sc-th-inner">
        {label} <Icon size={10} className={active ? 'sc-th-sort' : ''} />
      </span>
    </th>
  );
};

const FilterInput = ({ label, filterKey, filters, setFilter, placeholder }) => (
  <div className="sc-filter-item">
    <div className="sc-filter-label">
      <span>{label}</span>
      {filters[filterKey] && <span className="sc-filter-value">{filters[filterKey]}</span>}
    </div>
    <input
      type="number"
      className="sc-filter-input"
      placeholder={placeholder || '—'}
      value={filters[filterKey] ?? ''}
      onChange={e => setFilter(filterKey, e.target.value)}
    />
  </div>
);

const ScreenerPage = () => {
  const navigate    = useNavigate();
  const sentinelRef = useRef(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [showMore, setShowMore]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchLocal, setSearchLocal] = useState('');
  const { isWatchedInAny } = useWatchlist();
  const [openPopover, setOpenPopover] = useState(null);
  const starRefs = useRef({});

  const {
    stocks, total, loading, loadingMore, error, hasMore,
    filters, setFilter,
    sortBy, sortDir, toggleSort,
    activePreset, applyPreset, clearFilters, hasActiveFilters,
    loadMore,
  } = useScreener();

  useEffect(() => { getCacheStatus().then(setCacheStatus).catch(() => {}); }, []);

  useEffect(() => {
    if (!sentinelRef.current || searchLocal) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore, searchLocal]);

  const displayedStocks = searchLocal
    ? stocks.filter(s =>
        s.symbol?.toLowerCase().includes(searchLocal.toLowerCase()) ||
        s.name?.toLowerCase().includes(searchLocal.toLowerCase()))
    : stocks;

  const sidebar = (
    <>
      <div className="sc-sidebar-title">
        <SlidersHorizontal size={14} /> Filters
      </div>

      {/* Presets */}
      <div>
        <div className="sc-presets-label">Presets</div>
        <div className="sc-presets">
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <button
              key={key}
              className={`sc-preset-btn${activePreset === key ? ' is-active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button className="sc-reset-btn" onClick={clearFilters}>
            Reset all filters
          </button>
        )}
      </div>

      {/* Primary filters */}
      <div className="sc-filter-group">
        <div className="sc-filter-item">
          <div className="sc-filter-label"><span>P/E Ratio</span></div>
          <div className="sc-filter-row">
            <input type="number" className="sc-filter-input" placeholder="Min"
              value={filters.pe_min ?? ''} onChange={e => setFilter('pe_min', e.target.value)} />
            <input type="number" className="sc-filter-input" placeholder="Max"
              value={filters.pe_max ?? ''} onChange={e => setFilter('pe_max', e.target.value)} />
          </div>
        </div>

        <div className="sc-filter-item">
          <div className="sc-filter-label"><span>P/B Ratio</span></div>
          <div className="sc-filter-row">
            <input type="number" className="sc-filter-input" placeholder="Min"
              value={filters.pb_min ?? ''} onChange={e => setFilter('pb_min', e.target.value)} />
            <input type="number" className="sc-filter-input" placeholder="Max"
              value={filters.pb_max ?? ''} onChange={e => setFilter('pb_max', e.target.value)} />
          </div>
        </div>

        <FilterInput label="ROE ≥ %"    filterKey="roe_min"         filters={filters} setFilter={setFilter} placeholder="e.g. 15" />
        <FilterInput label="D/E ≤"      filterKey="debt_equity_max" filters={filters} setFilter={setFilter} placeholder="e.g. 1.0" />
        <FilterInput label="Margin ≥ %" filterKey="net_margin_min"  filters={filters} setFilter={setFilter} placeholder="e.g. 10" />
      </div>

      {/* Expandable secondary filters */}
      <div>
        <button className="sc-more-toggle" onClick={() => setShowMore(p => !p)}>
          {showMore ? '▲ Fewer filters' : '▼ More filters'}
        </button>

        {showMore && (
          <div className="sc-filter-group" style={{ marginTop: 10 }}>
            <FilterInput label="ROA ≥ %"        filterKey="roa_min"            filters={filters} setFilter={setFilter} placeholder="e.g. 10" />
            <FilterInput label="Rev Growth ≥ %" filterKey="revenue_growth_min" filters={filters} setFilter={setFilter} placeholder="e.g. 15" />
            <FilterInput label="Div Yield ≥ %"  filterKey="dividend_yield_min" filters={filters} setFilter={setFilter} placeholder="e.g. 2" />
            <div className="sc-filter-item">
              <div className="sc-filter-label"><span>Market Cap (Cr)</span></div>
              <div className="sc-filter-row">
                <input type="number" className="sc-filter-input" placeholder="Min"
                  value={filters.market_cap_min ?? ''} onChange={e => setFilter('market_cap_min', e.target.value)} />
                <input type="number" className="sc-filter-input" placeholder="Max"
                  value={filters.market_cap_max ?? ''} onChange={e => setFilter('market_cap_max', e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cache status */}
      {cacheStatus?.cached ? (
        <div className="sc-cache sc-cache-warm">
          <Database size={10} />
          {cacheStatus.ok?.toLocaleString()} stocks · {cacheStatus.age_minutes}m ago
        </div>
      ) : (
        <div className="sc-cache sc-cache-cold">
          <Database size={10} /> Cache warming…
        </div>
      )}
    </>
  );

  return (
    <div className="screener-page">
      {/* Mobile overlay */}
      <div
        className={`sc-sidebar-overlay${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sc-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="sc-main">
        {/* Top bar */}
        <div className="sc-topbar">
          <button className="sc-filter-toggle" onClick={() => setMobileOpen(true)}>
            <SlidersHorizontal size={16} />
          </button>

          <div className="sc-search-wrap">
            <Search size={14} className="sc-search-icon" />
            <input
              type="text"
              className="sc-search"
              placeholder="Search by name or symbol…"
              value={searchLocal}
              onChange={e => setSearchLocal(e.target.value)}
            />
          </div>

          <span className="sc-count">
            {loading
              ? 'Loading…'
              : total === null
                ? 'No cache'
                : hasActiveFilters
                  ? `${stocks.length} of ${total?.toLocaleString()} stocks`
                  : `${total?.toLocaleString() ?? '—'} stocks`}
          </span>
        </div>

        {error && <div className="sc-error">⚠ {error}</div>}

        {/* Table */}
        <div className="sc-table-wrap">
          {loading && stocks.length === 0 ? (
            <div className="sc-loading">
              <Loader2 size={24} className="spin" />
              <p>Loading stocks…</p>
              <span>
                {cacheStatus?.cached
                  ? 'Reading from cache…'
                  : 'Cache is cold — run the background job or wait for startup refresh.'}
              </span>
            </div>
          ) : (
            <table className="sc-table">
              <thead className="sc-thead">
                <tr>
                  <th className="sc-th">Name</th>
                  {COLUMNS.map(([col, label]) => (
                    <SortTh key={col} label={label} col={col}
                      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  ))}
                  <th className="sc-th" style={{ width: 100 }} />
                </tr>
              </thead>
              <tbody>
                {displayedStocks.length === 0 && !loading ? (
                  <tr><td colSpan={COLUMNS.length + 2} className="sc-empty">
                    No stocks match the current filters.
                  </td></tr>
                ) : displayedStocks.map((s) => (
                  <tr key={s.symbol} className="sc-row">
                    {/* Name cell */}
                    <td className="sc-td">
                      <Link className="sc-name-link" to={`/stock/${s.symbol}`}>
                        <span className="sc-symbol">{s.symbol?.replace('.NS', '')}</span>
                        <span className="sc-company">{s.name}</span>
                      </Link>
                    </td>

                    <td className="sc-td right">₹{fmt(s.price)}</td>
                    <td className="sc-td right">{fmtCr(s.market_cap_cr)}</td>
                    <td className="sc-td right">{fmt(s.pe)}</td>
                    <td className="sc-td right">{fmt(s.pb)}</td>
                    <td className={`sc-td right${parseFloat(s.roe) > 20 ? ' positive' : ''}`}>{fmt(s.roe)}%</td>
                    <td className={`sc-td right${parseFloat(s.debt_equity) > 1.5 ? ' negative' : ''}`}>{fmt(s.debt_equity)}</td>
                    <td className="sc-td right">{fmt(s.net_margin)}%</td>
                    <td className="sc-td right">{fmt(s.dividend_yield)}%</td>

                    {/* Actions */}
                    <td className="sc-td" style={{ position: 'relative' }}>
                      <div className="sc-actions">
                        <button
                          ref={el => { starRefs.current[s.symbol] = el; }}
                          className={`sc-action-btn${isWatchedInAny(s.symbol) ? ' watched' : ''}`}
                          onClick={() => setOpenPopover(p => p === s.symbol ? null : s.symbol)}
                          title="Watchlist"
                        >
                          <Star size={13} fill={isWatchedInAny(s.symbol) ? 'currentColor' : 'none'} />
                        </button>
                        <Link className="sc-action-btn" to={`/compare?symbols=${s.symbol}`} title="Compare">
                          <GitCompare size={13} />
                        </Link>
                      </div>
                      {openPopover === s.symbol && (
                        <WatchlistPopover
                          symbol={s.symbol}
                          anchorRef={{ current: starRefs.current[s.symbol] }}
                          onClose={() => setOpenPopover(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}

                {/* Infinite scroll sentinel */}
                <tr ref={sentinelRef}>
                  <td colSpan={COLUMNS.length + 2} className="sc-sentinel">
                    <div className="sc-sentinel-inner">
                      {loadingMore && (
                        <><Loader2 size={14} className="spin" /> Loading more…</>
                      )}
                      {!hasMore && stocks.length > 0 && (
                        <span>— {stocks.length} stocks —</span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreenerPage;
