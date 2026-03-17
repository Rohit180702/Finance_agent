import { useState, useEffect, useRef } from 'react';
import { streamChatMessage, getChatHistory, clearChat } from '../services/chatApi';

const SESSION_STORAGE_KEY = 'finance_agent_session_id';

export const useChat = () => {
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [toolStatus, setToolStatus] = useState(null); // { tool, phase: 'start'|'end' }
  const [error, setError]           = useState(null);
  const [sessionId, setSessionId]   = useState(null);

  const abortRef = useRef(null); // AbortController for in-flight stream

  // Load session and restore history on mount
  useEffect(() => {
    const loadSessionAndHistory = async () => {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return;

      setSessionId(stored);
      try {
        const response = await getChatHistory(stored);
        if (response.success && response.messages) {
          setMessages(response.messages);
        }
      } catch (err) {
        console.error('Failed to load conversation history:', err);
      }
    };

    loadSessionAndHistory();
  }, []);

  const sendMessage = (message) => {
    if (!message.trim() || loading) return;

    // Cancel any in-flight stream
    abortRef.current?.abort();

    setLoading(true);
    setError(null);
    setToolStatus(null);

    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    // Placeholder for the streaming assistant reply
    const assistantPlaceholder = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

    const currentSession = sessionId;

    abortRef.current = streamChatMessage(message, currentSession, (event) => {
      switch (event.type) {
        case 'session':
          // Persist session id returned by the server
          setSessionId(event.session_id);
          localStorage.setItem(SESSION_STORAGE_KEY, event.session_id);
          break;

        case 'tool_start':
          setToolStatus({ tool: event.tool, phase: 'running' });
          break;

        case 'tool_end':
          setToolStatus({ tool: event.tool, phase: 'done' });
          break;

        case 'token':
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + event.content };
            }
            return next;
          });
          break;

        case 'done':
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              if (!last.content) {
                // No tokens arrived — remove the invisible placeholder
                next.pop();
              } else {
                next[next.length - 1] = { ...last, streaming: false };
              }
            }
            return next;
          });
          setLoading(false);
          setToolStatus(null);
          break;

        case 'error':
          setError(event.message);
          setMessages((prev) => {
            // Remove the empty placeholder on error
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant' && last.streaming && !last.content) {
              next.pop();
            }
            return next;
          });
          setLoading(false);
          setToolStatus(null);
          break;

        default:
          break;
      }
    });
  };

  const clearMessages = async () => {
    abortRef.current?.abort();
    try {
      await clearChat();
    } catch {
      // best-effort
    }
    setMessages([]);
    setError(null);
    setLoading(false);
    setToolStatus(null);
    setSessionId(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  return {
    messages,
    loading,
    toolStatus,
    error,
    sendMessage,
    clearMessages,
  };
};
