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

/**
 * Stream fundamental analysis via SSE.
 *
 * onEvent(data) is called for each SSE event:
 *   Full analysis:
 *     { type:'start',            symbol, mode:'full' }
 *     { type:'section_start',    section }   ×4
 *     { type:'section_complete', section }   as each finishes
 *     { type:'consolidating' }
 *     { type:'token',            content }   ×many
 *     { type:'done',             individual_results, errors, timestamp }
 *
 *   Component deep-dive:
 *     { type:'start',    symbol, mode:'component', section }
 *     { type:'fetching', section }
 *     { type:'analyzing' }
 *     { type:'token',    content }  ×many
 *     { type:'done',     individual_results, errors, timestamp }
 *
 *   Error:
 *     { type:'error', message }
 *
 * Returns an AbortController so the caller can cancel.
 */
export const streamFundamentals = (symbol, analysisType = 'all', query = '', onEvent) => {
  const controller = new AbortController();
  const component = COMPONENT_MAP[analysisType] ?? '';

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/fundamental/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, query, component }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        onEvent({ type: 'error', message: text || `HTTP ${response.status}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onEvent({ type: 'error', message: err.message });
      }
    }
  })();

  return controller;
};

export default fundamentalApi;

