import { useState, useEffect, useCallback, useRef } from 'react';
import { getMarketOverview } from '../services/stocksApi';

const POLL_INTERVAL_MS = 5_000; // poll every 5s during market hours

/**
 * Returns whether NSE/BSE is currently open.
 * Market hours: Mon–Fri, 09:15–15:30 IST (UTC+5:30)
 */
export function isMarketOpen() {
  const now = new Date();
  // Derive current IST time regardless of the user's local timezone
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + now.getTimezoneOffset() * 60_000 + istOffsetMs);

  const day            = ist.getDay(); // 0=Sun, 6=Sat
  const minutesSinceMidnight = ist.getHours() * 60 + ist.getMinutes();
  const OPEN  = 9  * 60 + 15; // 09:15
  const CLOSE = 15 * 60 + 30; // 15:30

  return day >= 1 && day <= 5
    && minutesSinceMidnight >= OPEN
    && minutesSinceMidnight <= CLOSE;
}

export const useMarketOverview = () => {
  const [indices,     setIndices]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketOpen,  setMarketOpen]  = useState(isMarketOpen);
  const timerRef = useRef(null);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else        setLoading(true);

    try {
      const data = await getMarketOverview();
      setIndices(data.indices ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const open = isMarketOpen();
      setMarketOpen(open);

      if (open) {
        fetchData({ silent: true });
      } else {
        // Market just closed — stop the interval
        clearInterval(timerRef.current);
      }
    }, POLL_INTERVAL_MS);
  }, [fetchData]);

  // Initial load + conditional polling
  useEffect(() => {
    fetchData();

    if (isMarketOpen()) {
      startPolling();
    }

    return () => clearInterval(timerRef.current);
  }, [fetchData, startPolling]);

  // Manual refresh — always allowed regardless of market hours
  const refresh = useCallback(() => {
    clearInterval(timerRef.current);
    fetchData({ silent: indices.length > 0 });
    if (isMarketOpen()) startPolling();
  }, [fetchData, startPolling, indices.length]);

  return { indices, loading, refreshing, error, lastUpdated, marketOpen, refresh };
};
