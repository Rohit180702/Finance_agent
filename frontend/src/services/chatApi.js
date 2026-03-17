import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const chatApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
chatApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.detail || error.message || 'An error occurred';
    console.error('Chat API Error:', errorMessage);
    throw new Error(errorMessage);
  }
);

/**
 * Send a chat message with session-based conversation memory
 */
export const sendChatMessage = async (message, sessionId = null) => {
  const response = await chatApi.post('/chat/message', {
    message,
    session_id: sessionId, // Redis handles conversation history
  });
  return response.data;
};

/**
 * Get conversation history for a session
 */
export const getChatHistory = async (sessionId) => {
  const response = await chatApi.get('/chat/history', {
    params: { session_id: sessionId },
  });
  return response.data;
};

/**
 * Clear chat history
 */
export const clearChat = async () => {
  const response = await chatApi.post('/chat/clear');
  return response.data;
};

/**
 * Stream a chat message via SSE.
 *
 * onEvent(data) is called for every parsed SSE event object:
 *   { type: 'session',    session_id }
 *   { type: 'tool_start', tool, input }
 *   { type: 'tool_end',   tool }
 *   { type: 'token',      content }
 *   { type: 'done' }
 *   { type: 'error',      message }
 *
 * Returns an AbortController so the caller can cancel the stream.
 */
export const streamChatMessage = (message, sessionId, onEvent) => {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: sessionId }),
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
        buffer = lines.pop(); // keep last incomplete line

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

export default chatApi;

