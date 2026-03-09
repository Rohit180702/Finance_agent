import { useState } from 'react';
import { analyzeFundamentals } from '../services/fundamentalApi';

/**
 * Hook to manage fundamental analysis state
 */
export const useFundamental = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  /**
   * Analyze stock fundamentals
   */
  const analyze = async (symbol, analysisType = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const data = await analyzeFundamentals(symbol, analysisType);

      // Store the AI-generated response from the chat endpoint
      setResult({
        symbol,
        analysisType,
        response: data.response,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      setError(err.message);
      console.error('Failed to analyze fundamentals:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear results
   */
  const clear = () => {
    setResult(null);
    setError(null);
  };

  return {
    loading,
    error,
    result,
    analyze,
    clear,
  };
};

