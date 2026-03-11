import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const fundamentalApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
fundamentalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.detail || error.message || 'An error occurred';
    console.error('Fundamental API Error:', errorMessage);
    throw new Error(errorMessage);
  }
);

// Map frontend analysisType values → backend component values
const COMPONENT_MAP = {
  all: '',
  ratios: 'ratios',
  balance_sheet: 'balance_sheet',
  cashflow: 'cashflow',
  income: 'income',
};

/**
 * Run fundamental analysis.
 * analysisType = 'all' → full parallel analysis (overview + investment verdict)
 * analysisType = 'ratios' | 'balance_sheet' | 'cashflow' | 'income' → deep dive
 *
 * Returns: { success, symbol, component, consolidated_report, individual_results, errors, timestamp }
 */
export const analyzeFundamentals = async (symbol, analysisType = 'all', query = '') => {
  const component = COMPONENT_MAP[analysisType] ?? '';
  const response = await fundamentalApi.post('/fundamental/analyze', { symbol, query, component });
  return response.data;
};

export default fundamentalApi;

