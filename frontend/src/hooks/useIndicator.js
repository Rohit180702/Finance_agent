import { useState } from 'react';
import { calculateIndicator } from '../services/api';

/**
 * Hook to calculate technical indicators
 */
export const useIndicator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const calculate = async (params) => {
    try {
      setLoading(true);
      setError(null);
      const data = await calculateIndicator(params);
      setResult(data);
      return data;
    } catch (err) {
      setError(err.message);
      setResult(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { calculate, loading, error, result, reset };
};

