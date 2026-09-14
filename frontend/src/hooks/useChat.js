import { useState, useEffect, useRef } from 'react';
import { streamChatMessage, getChatHistory, clearChat } from '../services/chatApi';

const SESSION_STORAGE_KEY = 'finance_agent_session_id';

export const useChat = () => {
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const [detectedSymbols, setDetectedSymbols] = useState([]);
  const [error, setError]           = useState(null);
  const [sessionId, setSessionId]   = useState(null);

  const abortRef = useRef(null);
  const pendingToolResults = useRef([]);

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

    abortRef.current?.abort();

    setLoading(true);
    setError(null);
    setToolStatus(null);
    pendingToolResults.current = [];

    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const assistantPlaceholder = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
      toolResults: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

    const currentSession = sessionId;

    abortRef.current = streamChatMessage(message, currentSession, (event) => {
      switch (event.type) {
        case 'session':
          setSessionId(event.session_id);
          localStorage.setItem(SESSION_STORAGE_KEY, event.session_id);
          break;

        case 'tool_start':
          setToolStatus({ tool: event.tool, phase: 'running', input: event.input });
          if (event.input?.symbol) {
            setDetectedSymbols((prev) =>
              prev.includes(event.input.symbol) ? prev : [...prev, event.input.symbol]
            );
          }
          break;

        case 'tool_result':
          pendingToolResults.current.push({
            tool: event.tool,
            data: event.data,
          });
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                toolResults: [...pendingToolResults.current],
              };
            }
            return next;
          });
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
              const hasContent = last.content || (last.toolResults && last.toolResults.length > 0);
              if (!hasContent) {
                next.pop();
              } else {
                next[next.length - 1] = { ...last, streaming: false };
              }
            }
            return next;
          });
          setLoading(false);
          setToolStatus(null);
          pendingToolResults.current = [];
          break;

        case 'error':
          setError(event.message);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant' && last.streaming && !last.content) {
              next.pop();
            }
            return next;
          });
          setLoading(false);
          setToolStatus(null);
          pendingToolResults.current = [];
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
    setDetectedSymbols([]);
    setSessionId(null);
    pendingToolResults.current = [];
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  return {
    messages,
    loading,
    toolStatus,
    detectedSymbols,
    error,
    sendMessage,
    clearMessages,
  };
};
