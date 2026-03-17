import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useWatchlist } from '../../hooks/useWatchlist';
import { getStockMetrics } from '../../services/stockDetailApi';
import './WatchlistMini.css';

const fmt = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtP = (v) => v != null ? `₹${parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

const WatchlistMini = () => {
  const { lists } = useWatchlist();
  const allSymbols = [...new Set(lists.flatMap((l) => l.symbols))];

  const [prices, setPrices] = useState({});

  const fetchPrices = useCallback(async () => {
    if (!allSymbols.length) return;
    const results = await Promise.allSettled(
      allSymbols.map((sym) => getStockMetrics(sym).then((d) => ({ sym, data: d.metrics })))
    );
    const next = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') next[r.value.sym] = r.value.data;
    });
    setPrices(next);
  }, [allSymbols.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  if (!allSymbols.length) {
    return (
      <div className="wlm-empty">
        <Star size={14} />
        <span>No stocks watched yet —</span>
        <Link to="/screener">add from Screener</Link>
        <span>or</span>
        <Link to="/watchlist">open Watchlist</Link>
      </div>
    );
  }

  return (
    <div className="wlm-wrap">
      <div className="wlm-strip">
        {allSymbols.map((sym) => {
          const m = prices[sym];
          const isUp = parseFloat(m?.change_pct) >= 0;
          const clean = sym.replace('.NS', '').replace('.BO', '');
          return (
            <Link key={sym} to={`/stock/${sym}`} className="wlm-chip">
              <span className="wlm-sym">{clean}</span>
              <span className="wlm-price">{fmtP(m?.price)}</span>
              {m && (
                <span className={`wlm-chg ${isUp ? 'up' : 'dn'}`}>
                  {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {isUp ? '+' : ''}{fmt(m.change_pct)}%
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <Link to="/watchlist" className="wlm-view-all">
        Manage <ArrowRight size={12} />
      </Link>
    </div>
  );
};

export default WatchlistMini;
