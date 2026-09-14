import { useState, useRef, useCallback } from 'react';
import { streamChatMessage } from '../services/chatApi';

/**
 * Hook for on-demand AI analysis on the stock detail page.
 * Sends a pre-formed prompt via SSE and collects tool results + AI text.
 */
export const useStockAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [toolResults, setToolResults] = useState([]);
  const [aiText, setAiText] = useState('');
  const [error, setError] = useState(null);
  const [toolStatus, setToolStatus] = useState(null);
  const abortRef = useRef(null);

  const analyze = useCallback((prompt) => {
    abortRef.current?.abort();
    setLoading(true);
    setToolResults([]);
    setAiText('');
    setError(null);
    setToolStatus(null);

    abortRef.current = streamChatMessage(prompt, null, (event) => {
      switch (event.type) {
        case 'tool_start':
          setToolStatus({ tool: event.tool, phase: 'running' });
          break;
        case 'tool_result':
          setToolResults(prev => [...prev, { tool: event.tool, data: event.data }]);
          break;
        case 'tool_end':
          setToolStatus({ tool: event.tool, phase: 'done' });
          break;
        case 'token':
          setAiText(prev => prev + event.content);
          break;
        case 'done':
          setLoading(false);
          setToolStatus(null);
          break;
        case 'error':
          setError(event.message);
          setLoading(false);
          setToolStatus(null);
          break;
        default:
          break;
      }
    });
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setToolStatus(null);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setToolResults([]);
    setAiText('');
    setError(null);
    setToolStatus(null);
  }, []);

  return {
    loading,
    toolResults,
    aiText,
    error,
    toolStatus,
    analyze,
    cancel,
    reset,
  };
};
