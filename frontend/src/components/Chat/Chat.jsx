import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../../hooks/useChat';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import './Chat.css';

const quickPrompts = [
  'Show RSI trend for RELIANCE over 6 months',
  'Compare MACD signals for TCS and INFY',
  'Summarize key fundamental risks for HDFCBANK',
];

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12h12M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M9 7l1-2h4l1 2M7 7l1 12h8l1-12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Chat = () => {
  const { messages, loading, error, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isEmpty = messages.length === 0;
  const canSend = input.trim() && !loading;

  const messageRows = useMemo(
    () =>
      messages.map((msg, index) => (
        <article
          key={`${msg.timestamp || index}-${index}`}
          className={`chat-message-row ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}
        >
          <div className="chat-message-bubble">
            <div className="message-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            <time>{formatTime(msg.timestamp)}</time>
          </div>
        </article>
      )),
    [messages],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSend) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <section className="chat-layout">
      <header className="chat-titlebar">
        <div>
          <h3>Finance Assistant</h3>
          <p>Ask technical, fundamental, and market-structure questions.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={clearMessages}
          disabled={!messages.length}
          className="icon-left"
        >
          <TrashIcon />
          Clear
        </Button>
      </header>

      <div className="chat-thread" role="log" aria-live="polite">
        {isEmpty ? (
          <EmptyState
            title="Start a new analysis conversation"
            description="Use the assistant to pull indicators, inspect fundamentals, and reason about setups."
            action={
              <div className="chat-prompt-row">
                {quickPrompts.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    className="chat-prompt-pill"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            }
          />
        ) : (
          <div className="chat-messages-list">{messageRows}</div>
        )}

        {loading && (
          <article className="chat-message-row is-assistant">
            <div className="chat-message-bubble chat-loading-bubble">
              <span />
              <span />
              <span />
            </div>
          </article>
        )}

        {error && <ErrorState title="Chat request failed" message={error} />}
        <div ref={endRef} />
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for an indicator read, valuation signal, or thesis check."
          rows={2}
          disabled={loading}
        />
        <Button type="submit" disabled={!canSend} className="icon-left">
          <SendIcon />
          Send
        </Button>
      </form>
    </section>
  );
};

export default Chat;
