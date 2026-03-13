import { useState, useCallback, useEffect, useRef } from 'react';
import { getStocks } from '../services/screenerApi';

export const PRESETS = {
  value:    { label: 'Value Picks',     filters: { pe_max: 15, pb_max: 2 } },
  quality:  { label: 'Quality Leaders', filters: { roe_min: 20, debt_equity_max: 0.5, net_margin_min: 10 } },
  dividend: { label: 'High Dividend',   filters: { dividend_yield_min: 2 } },
  growth:   { label: 'Growth Stocks',   filters: { revenue_growth_min: 20, roe_min: 15 } },
};

export const EMPTY_FILTERS = {
  pe_min: '', pe_max: '',
  pb_min: '', pb_max: '',
  roe_min: '', roa_min: '',
  debt_equity_max: '',
  net_margin_min: '',
  revenue_growth_min: '',
  dividend_yield_min: '',
  market_cap_min: '', market_cap_max: '',
};

const LIMIT = 50;

const buildParams = (filters, sortBy, sortDir, page) => {
  const out = { page, limit: LIMIT, sort_by: sortBy, sort_dir: sortDir };
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '') out[k] = parseFloat(v);
  });
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
export const useScreener = () => {
  const [stocks,       setStocks]       = useState([]);
  const [total,        setTotal]        = useState(null);   // null = not loaded yet
  const [loading,      setLoading]      = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [error,        setError]        = useState(null);
  const [hasMore,      setHasMore]      = useState(true);
  const [filters,      setFilters]      = useState(EMPTY_FILTERS);
  const [sortBy,       setSortBy]       = useState('market_cap_cr');
  const [sortDir,      setSortDir]      = useState('desc');
  const [activePreset, setActivePreset] = useState(null);

  const pageRef      = useRef(0);
  const filterTimer  = useRef(null);
  const activeReqId  = useRef(0);   // cancel stale requests

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (page, currentFilters, currentSortBy, currentSortDir, reset) => {
    const reqId = ++activeReqId.current;

    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = buildParams(currentFilters, currentSortBy, currentSortDir, page);
      const data   = await getStocks(params);

      if (reqId !== activeReqId.current) return;   // stale — discard

      setTotal(data.total);
      setHasMore(data.has_more);
      setStocks(prev => reset ? data.results : [...prev, ...data.results]);
      pageRef.current = page;
    } catch (e) {
      if (reqId !== activeReqId.current) return;
      setError(e.response?.data?.detail || e.message);
    } finally {
      if (reqId === activeReqId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // ── Load next page (called by IntersectionObserver) ───────────────────────
  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    fetchPage(pageRef.current + 1, filters, sortBy, sortDir, false);
  }, [loadingMore, loading, hasMore, filters, sortBy, sortDir, fetchPage]);

  // ── Reset + reload (when filters or sort changes) ─────────────────────────
  const reload = useCallback((f, sb, sd) => {
    clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => {
      pageRef.current = 0;
      setStocks([]);
      setHasMore(true);
      fetchPage(0, f, sb, sd, true);
    }, 300);
  }, [fetchPage]);

  // ── Auto-load on mount ────────────────────────────────────────────────────
  useEffect(() => {
    fetchPage(0, EMPTY_FILTERS, 'market_cap_cr', 'desc', true);
    return () => clearTimeout(filterTimer.current);
  }, [fetchPage]);

  // ── Filter change ─────────────────────────────────────────────────────────
  const setFiltersAndReload = useCallback((updater) => {
    setFilters(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      reload(next, sortBy, sortDir);
      return next;
    });
  }, [reload, sortBy, sortDir]);

  // ── Sort change ───────────────────────────────────────────────────────────
  const toggleSort = useCallback((col) => {
    setSortBy(prevKey => {
      const newDir = prevKey === col ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
      setSortDir(newDir);
      reload(filters, col, newDir);
      return col;
    });
  }, [sortDir, filters, reload]);

  // ── Preset ────────────────────────────────────────────────────────────────
  const applyPreset = useCallback((key) => {
    const preset = PRESETS[key];
    if (!preset) return;
    const merged = { ...EMPTY_FILTERS };
    Object.entries(preset.filters).forEach(([k, v]) => { merged[k] = String(v); });
    setActivePreset(key);
    setFilters(merged);
    reload(merged, sortBy, sortDir);
  }, [sortBy, sortDir, reload]);

  const clearFilters = useCallback(() => {
    setActivePreset(null);
    setFilters(EMPTY_FILTERS);
    reload(EMPTY_FILTERS, sortBy, sortDir);
  }, [sortBy, sortDir, reload]);

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return {
    stocks, total, loading, loadingMore, error, hasMore,
    filters,
    setFilter: (key, val) => setFiltersAndReload(prev => ({ ...prev, [key]: val })),
    sortBy, sortDir, toggleSort,
    activePreset, applyPreset, clearFilters, hasActiveFilters,
    loadMore,
  };
};
