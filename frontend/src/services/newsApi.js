import axios from 'axios';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const BASE = `${API_ROOT}/news`;

export const getMarketNews = (page = 0) =>
  axios.get(`${BASE}/market`, { params: { page } }).then(r => r.data);
