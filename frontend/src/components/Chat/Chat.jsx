import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import './Chat.css';

const Chat = () => {
  const { messages, loading, error, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    await sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <h2>Finance Agent Chat</h2>
        <button
          onClick={clearMessages}
          className="clear-button"
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <h3>👋 Welcome to Finance Agent!</h3>
            <p>Ask me anything about technical analysis, indicators, or stock data.</p>
            <div className="chat-examples">
              <p><strong>Try asking:</strong></p>
              <ul>
                <li>"What is RSI?"</li>
                <li>"Calculate MACD for RELIANCE"</li>
                <li>"Show me the Bollinger Bands for TCS"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                {msg.timestamp && (
                  <div className="message-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="chat-message assistant-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="chat-error">
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me about stocks, indicators, or technical analysis..."
          className="chat-input"
          rows="2"
          disabled={loading}
        />
        <button
          type="submit"
          className="chat-send-button"
          disabled={!input.trim() || loading}
        >
          {loading ? '⏳' : '📤'} Send
        </button>
      </form>
    </div>
  );
};

export default Chat;

