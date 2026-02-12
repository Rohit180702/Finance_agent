import { useState, useEffect } from 'react';
import { getConfig } from '../services/api';

/**
 * Hook to fetch and manage market data configuration
 */
export const useConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await getConfig();
        setConfig(data.config);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
};

