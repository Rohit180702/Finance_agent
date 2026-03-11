import { useState, useCallback, useRef } from 'react';
import { analyzeFundamentals } from '../services/fundamentalApi';

/**
 * Hook to manage fundamental analysis state.
 *
 * Results are cached by `${symbol}:${analysisType}` so switching between
 * tabs after the first fetch is instant — no extra API call.
 */
export const useFundamental = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Cache: key = `${symbol}:${analysisType}`, value = result object
  const cache = useRef({});

  const analyze = useCallback(async (symbol, analysisType = 'all') => {
    const cacheKey = `${symbol}:${analysisType}`;

    // Return cached result immediately if available
    if (cache.current[cacheKey]) {
      setResult(cache.current[cacheKey]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await analyzeFundamentals(symbol, analysisType);

      const resultObj = {
        symbol,
        analysisType,
        consolidated_report: data.consolidated_report,
        individual_results: data.individual_results,
        errors: data.errors,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      // Store in cache then update state
      cache.current[cacheKey] = resultObj;
      setResult(resultObj);

    } catch (err) {
      setError(err.message);
      console.error('Failed to analyze fundamentals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
    cache.current = {};
  }, []);

  /**
   * Check if a given symbol+analysisType result is already cached,
   * so the UI can show "Cached" badges or skip re-running.
   */
  const isCached = useCallback((symbol, analysisType) => {
    return Boolean(cache.current[`${symbol}:${analysisType}`]);
  }, []);

  return {
    loading,
    error,
    result,
    analyze,
    clear,
    isCached,
  };
};
