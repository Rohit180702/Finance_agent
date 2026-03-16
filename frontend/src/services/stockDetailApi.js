import axios from 'axios';

const BASE = '/api/v1/stocks';

export const getStockMetrics = (symbol) =>
  axios.get(`${BASE}/${encodeURIComponent(symbol)}/metrics`).then(r => r.data);

export const getStockInfo = (symbol) =>
  axios.get(`${BASE}/${encodeURIComponent(symbol)}/info`).then(r => r.data);

export const getStockNews = (symbol, limit = 10) =>
  axios.get(`${BASE}/${encodeURIComponent(symbol)}/news`, { params: { limit } }).then(r => r.data);

export const getStockSentiment = (symbol) =>
  axios.get(`${BASE}/${encodeURIComponent(symbol)}/sentiment`).then(r => r.data);

export const getStockHistory = (symbol, period = '3mo') =>
  axios.get(`${BASE}/${encodeURIComponent(symbol)}/history`, { params: { period } }).then(r => r.data);

export const compareStocks = (symbols) =>
  axios.get(`${BASE}/compare`, { params: { symbols: symbols.join(',') } }).then(r => r.data);

export const searchStocks = (q) =>
  axios.get(`${BASE}/search`, { params: { q, limit: 10 } }).then(r => r.data);
