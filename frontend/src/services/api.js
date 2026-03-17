import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.detail || error.message || 'An error occurred';
    console.error('API Error:', errorMessage);
    throw new Error(errorMessage);
  }
);

/**
 * Get market data configuration
 */
export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

/**
 * Calculate technical indicator
 */
export const calculateIndicator = async (params) => {
  const response = await api.post('/technical/calculate', params);
  return response.data;
};

/**
 * Analyze using natural language
 */
export const analyze = async (message) => {
  const response = await api.post('/technical/analyze', { message });
  return response.data;
};

/**
 * Fetch OHLCV + full indicator time-series for charting
 */
export const getChartData = async (params) => {
  const response = await api.get('/technical/chart-data', { params });
  return response.data;
};

export default api;

