import axios from 'axios';

const BASE = '/api/v1/news';

export const getMarketNews = (page = 0) =>
  axios.get(`${BASE}/market`, { params: { page } }).then(r => r.data);
