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

/**
 * Analyze stock fundamentals
 */
export const analyzeFundamentals = async (symbol, analysisType = 'all') => {
  // Use chat endpoint to leverage the agent
  const response = await fundamentalApi.post('/chat/message', {
    message: `Analyze ${symbol} fundamentals with analysis_type=${analysisType}`,
    history: [],
  });
  return response.data;
};

/**
 * Get fundamental ratios
 */
export const getFundamentalRatios = async (symbol) => {
  const response = await fundamentalApi.post('/chat/message', {
    message: `Get fundamental ratios for ${symbol}`,
    history: [],
  });
  return response.data;
};

/**
 * Get balance sheet
 */
export const getBalanceSheet = async (symbol) => {
  const response = await fundamentalApi.post('/chat/message', {
    message: `Get balance sheet for ${symbol}`,
    history: [],
  });
  return response.data;
};

/**
 * Get cash flow statement
 */
export const getCashFlow = async (symbol) => {
  const response = await fundamentalApi.post('/chat/message', {
    message: `Get cash flow statement for ${symbol}`,
    history: [],
  });
  return response.data;
};

/**
 * Get income statement
 */
export const getIncomeStatement = async (symbol) => {
  const response = await fundamentalApi.post('/chat/message', {
    message: `Get income statement for ${symbol}`,
    history: [],
  });
  return response.data;
};

export default fundamentalApi;

