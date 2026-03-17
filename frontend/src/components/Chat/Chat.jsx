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

const TOOL_LABELS = {
  calculate_indicator:  'Running technical indicator…',
  analyze_fundamentals: 'Fetching fundamental data…',
};

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

/** Three-dot bouncing indicator shown while waiting for the first token */
const TypingDots = () => (
  <article className="chat-message-row is-assistant">
    <div className="chat-message-bubble chat-loading-bubble">
      <span /><span /><span />
    </div>
  </article>
);

/** Status pill shown when the agent is calling a tool */
const ToolStatusBadge = ({ toolStatus }) => {
  if (!toolStatus) return null;
  const label = TOOL_LABELS[toolStatus.tool] ?? `Using ${toolStatus.tool}…`;
  return (
    <article className="chat-message-row is-assistant">
      <div className="chat-tool-status">
        <span className="chat-tool-spinner" aria-hidden="true" />
        {label}
      </div>
    </article>
  );
};

const Chat = () => {
  const { messages, loading, toolStatus, error, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, toolStatus]);

  const isEmpty = messages.length === 0;
  const canSend = input.trim() && !loading;

  // Derive whether the last assistant message is still streaming
  const lastMsg = messages[messages.length - 1];
  const isStreaming = lastMsg?.role === 'assistant' && lastMsg?.streaming;
  // Show typing dots only when loading but no tokens have arrived yet
  const showTypingDots = loading && (!isStreaming || lastMsg?.content === '');

  const messageRows = useMemo(
    () =>
      messages.map((msg, index) => (
        <article
          key={`${msg.timestamp || index}-${index}`}
          className={`chat-message-row ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}
        >
          <div className={`chat-message-bubble${msg.streaming ? ' is-streaming' : ''}`}>
            {msg.thinking && msg.role === 'assistant' && (
              <details className="thinking-section">
                <summary>🧠 Show Reasoning</summary>
                <div className="thinking-content">
                  <ReactMarkdown>{msg.thinking}</ReactMarkdown>
                </div>
              </details>
            )}
            <div className="message-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.streaming && msg.content && (
                <span className="streaming-cursor" aria-hidden="true" />
              )}
            </div>
            {!msg.streaming && <time>{formatTime(msg.timestamp)}</time>}
          </div>
        </article>
      )),
    [messages],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSend) return;
    const text = input;
    setInput('');
    sendMessage(text);
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

        {/* Tool call status — shown above the typing dots */}
        {loading && toolStatus?.phase === 'running' && (
          <ToolStatusBadge toolStatus={toolStatus} />
        )}

        {/* Typing dots — only while waiting for the very first token */}
        {showTypingDots && <TypingDots />}

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
