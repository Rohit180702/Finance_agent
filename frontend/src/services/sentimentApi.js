import axios from 'axios';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

export const analyzeSentiment = (symbol) =>
  axios.get(`${API_ROOT}/stocks/${encodeURIComponent(symbol)}/sentiment`).then(r => r.data);
