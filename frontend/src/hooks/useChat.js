import { useState, useEffect } from 'react';
import { sendChatMessage, getChatHistory, clearChat } from '../services/chatApi';

const SESSION_STORAGE_KEY = 'finance_agent_session_id';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load session_id from localStorage on mount and fetch history
  useEffect(() => {
    const loadSessionAndHistory = async () => {
      const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSessionId) {
        setSessionId(storedSessionId);

        // Fetch conversation history from backend
        try {
          const response = await getChatHistory(storedSessionId);
          if (response.success && response.messages) {
            setMessages(response.messages);
          }
        } catch (err) {
          console.error('Failed to load conversation history:', err);
          // Don't set error state - just continue with empty messages
        } finally {
          setHistoryLoaded(true);
        }
      } else {
        setHistoryLoaded(true);
      }
    };

    loadSessionAndHistory();
  }, []);

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      // Add user message to UI immediately
      setMessages((prev) => [...prev, userMessage]);

      // Send message with session_id (Redis handles history)
      const response = await sendChatMessage(message, sessionId);

      if (response.success && response.message) {
        // Store session_id for future requests
        if (response.session_id) {
          setSessionId(response.session_id);
          localStorage.setItem(SESSION_STORAGE_KEY, response.session_id);
        }

        // Add assistant response to UI
        setMessages((prev) => [...prev, response.message]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = async () => {
    try {
      await clearChat();
      setMessages([]);
      setError(null);

      // Clear session_id to start a new conversation
      setSessionId(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
  };
};
