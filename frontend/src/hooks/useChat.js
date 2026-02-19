import { useState } from 'react';
import { sendChatMessage, clearChat } from '../services/chatApi';

/**
 * Hook to manage chat state and interactions
 */
export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Send a message to the agent
   */
  const sendMessage = async (message) => {
    if (!message.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Add user message to UI immediately
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to backend with full history
      const response = await sendChatMessage(message, messages);

      // Add assistant response to UI
      if (response.success && response.message) {
        setMessages((prev) => [...prev, response.message]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear all messages
   */
  const clearMessages = async () => {
    try {
      await clearChat();
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to clear chat:', err);
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

