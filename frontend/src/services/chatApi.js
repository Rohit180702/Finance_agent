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
 * Send a chat message with conversation history
 */
export const sendChatMessage = async (message, history = []) => {
  const response = await chatApi.post('/chat/message', {
    message,
    history,
    session_id: null, // For future session management
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

export default chatApi;

