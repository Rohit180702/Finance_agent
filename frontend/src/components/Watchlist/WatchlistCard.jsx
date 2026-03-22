import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, TrendingUp, TrendingDown, X, RefreshCw,
  ExternalLink, Plus, Pencil, Trash2, Check, Search, Loader2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useWatchlist } from '../../hooks/useWatchlist';
import { getStockMetrics, searchStocks } from '../../services/stockDetailApi';
import './WatchlistCard.css';

const fmtP  = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';
const fmt   = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L Cr`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

const ListTab = ({ list, active, onActivate, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(list.name);
  const inputRef = useRef(null);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(list.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== list.name) onRename(list.id, trimmed);
    setEditing(false);
  };

  const onKey = (e) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className={`wl-tab${active ? ' active' : ''}`} onClick={onActivate}>
      {editing ? (
        <input
          ref={inputRef}
          className="wl-tab-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="wl-tab-name">{list.name}</span>
          <span className="wl-tab-count">({list.symbols.length})</span>
        </>
      )}

      {active && (
        <span className="wl-tab-actions">
          {editing ? (
            <button className="wl-tab-btn" onClick={(e) => { e.stopPropagation(); commit(); }}>
              <Check size={11} />
            </button>
          ) : (
            <button className="wl-tab-btn" onClick={startEdit} title="Rename">
              <Pencil size={11} />
            </button>
          )}
          <button
            className="wl-tab-btn danger"
            onClick={(e) => { e.stopPropagation(); onDelete(list.id); }}
            title="Delete list"
          >
            <Trash2 size={11} />
          </button>
        </span>
      )}
    </div>
  );
};

const AddStockBar = ({ onAdd }) => {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [open,      setOpen]      = useState(false);
  const wrapRef = useRef(null);
  const debounce = useRef(null);

  const runSearch = (q) => {
    clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchStocks(q);
        setResults(data.stocks ?? []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const pick = (item) => {
    onAdd(item.symbol);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="wl-add-wrap" ref={wrapRef}>
      <div className="wl-add-input-row">
        <Search size={14} className="wl-add-icon" />
        <input
          className="wl-add-input"
          placeholder="Search and add stock…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); runSearch(e.target.value); }}
          onFocus={() => results.length && setOpen(true)}
        />
        {searching && <Loader2 size={14} className="wl-add-spinner" />}
      </div>
      {open && results.length > 0 && (
        <ul className="wl-add-dropdown">
          {results.map((r) => (
            <li key={r.symbol} className="wl-add-result" onMouseDown={() => pick(r)}>
              <span className="wl-add-sym">{r.symbol.replace('.NS', '').replace('.BO', '')}</span>
              <span className="wl-add-name">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const WatchlistCard = () => {
  const {
    lists, activeListId, activeList,
    setActiveListId, createList, deleteList, renameList, removeSymbol, addSymbol,
  } = useWatchlist();

  const symbols = activeList?.symbols ?? [];

  const [rows,       setRows]       = useState({});
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsRef = useRef(null);

  const checkScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll, lists]);

  const scrollTabs = (dir) => {
    tabsRef.current?.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!symbols.length) { setRows({}); return; }
    isRefresh ? setRefreshing(true) : setLoading(true);
    const results = await Promise.allSettled(
      symbols.map((sym) => getStockMetrics(sym).then((d) => ({ sym, data: d.metrics })))
    );
    const next = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') next[r.value.sym] = r.value.data;
    });
    setRows(next);
    isRefresh ? setRefreshing(false) : setLoading(false);
  }, [symbols]);

  useEffect(() => { fetchAll(false); }, [fetchAll]);

  useEffect(() => {
    if (!symbols.length) return;
    const id = setInterval(() => fetchAll(true), 60_000);
    return () => clearInterval(id);
  }, [symbols, fetchAll]);

  return (
    <div className="wl-card">
      {/* Tabs */}
      <div className="wl-tabs-bar">
        {canScrollLeft && (
          <button className="wl-scroll-btn" onClick={() => scrollTabs(-1)}>
            <ChevronLeft size={14} />
          </button>
        )}
        <div className="wl-tabs" ref={tabsRef}>
          {lists.map((l) => (
            <ListTab
              key={l.id}
              list={l}
              active={l.id === activeListId}
              onActivate={() => setActiveListId(l.id)}
              onRename={renameList}
              onDelete={deleteList}
            />
          ))}
        </div>
        {canScrollRight && (
          <button className="wl-scroll-btn" onClick={() => scrollTabs(1)}>
            <ChevronRight size={14} />
          </button>
        )}
        <button className="wl-new-list-btn" onClick={() => createList()} title="New watchlist">
          <Plus size={14} /> New list
        </button>
      </div>

      {/* Add stock */}
      <div className="wl-add-section">
        <AddStockBar onAdd={(sym) => addSymbol(sym, activeListId)} />
      </div>

      {/* Empty state */}
      {!symbols.length ? (
        <div className="wl-empty">
          <Star size={28} className="wl-empty-icon" />
          <p className="wl-empty-title">"{activeList?.name}" is empty</p>
          <p className="wl-empty-sub">Search for a stock above to add it.</p>
        </div>
      ) : (
        <>
          {/* Count + refresh */}
          <div className="wl-topbar">
            <span className="wl-count">
              {symbols.length} stock{symbols.length !== 1 ? 's' : ''}
            </span>
            <button
              className={`wl-refresh${refreshing ? ' spinning' : ''}`}
              onClick={() => fetchAll(true)}
              title="Refresh prices"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Stock cards */}
          <div className="wl-stock-list">
            {symbols.map((sym) => {
              const m = rows[sym];

              if (loading && !m) {
                return <div key={sym} className="wl-skeleton-card" />;
              }

              const isUp  = parseFloat(m?.change_pct) >= 0;
              const clean = sym.replace('.NS', '').replace('.BO', '');

              return (
                <Link key={sym} to={`/stock/${sym}`} className="wl-stock-card">
                  <div className="wl-stock-info">
                    <div className="wl-stock-symbol">{clean}</div>
                    <div className="wl-stock-name">{m?.name || '—'}</div>
                  </div>

                  <div className="wl-stock-mcap">{fmtCr(m?.market_cap_cr)}</div>

                  <div className="wl-stock-price-col">
                    <div className="wl-stock-price">{fmtP(m?.price)}</div>
                    <div className={`wl-stock-change ${m ? (isUp ? 'up' : 'dn') : ''}`}>
                      {m ? (
                        <>
                          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {isUp ? '+' : ''}{fmt(m.change_pct)}%
                        </>
                      ) : '—'}
                    </div>
                  </div>

                  <div className="wl-stock-actions" onClick={(e) => e.preventDefault()}>
                    <Link
                      to={`/stock/${sym}`}
                      className="wl-stock-action-btn"
                      title="View detail"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={13} />
                    </Link>
                    <button
                      className="wl-stock-action-btn danger"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeSymbol(sym, activeListId); }}
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default WatchlistCard;
