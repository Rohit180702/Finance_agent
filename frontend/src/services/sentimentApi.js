import axios from 'axios';

export const analyzeSentiment = (symbol) =>
  axios.get(`/api/v1/stocks/${encodeURIComponent(symbol)}/sentiment`).then(r => r.data);
