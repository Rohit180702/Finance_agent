import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const api = axios.create({ baseURL: API_BASE_URL });

/**
 * Fetch a page of stocks with optional filters.
 * @param {Object} params - { page, limit, sort_by, sort_dir, ...filters }
 */
export const getStocks = async (params = {}) => {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) clean[k] = v;
  });
  const response = await api.get('/screener/stocks', { params: clean });
  return response.data;
};

/**
 * Fetch cache freshness metadata.
 */
export const getCacheStatus = async () => {
  const response = await api.get('/screener/cache-status');
  return response.data;
};
