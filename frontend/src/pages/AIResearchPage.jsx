import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles, Send, Trash2, Copy, Check,
  X, BarChart3, LineChart,
  ThumbsUp, Download, Newspaper,
  Crosshair, Eye, Paperclip,
} from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { addRecentChat } from '../components/layout/Sidebar';
import ToolResultRenderer from '../components/ToolResults';
import './AIResearchPage.css';

const TOOL_LABELS = {
  calculate_indicator:  'Running technical indicator…',
  analyze_fundamentals: 'Fetching fundamental data…',
  analyze_sentiment:    'Analyzing market sentiment…',
  screen_stocks:        'Screening stocks…',
};

const SUGGESTIONS = [
  { icon: TrendingUp, title: 'Analyze Tata Motors', desc: 'Review Q3 earnings and technical breakout potential.' },
  { icon: BarChart3, title: 'Compare IT Stocks', desc: 'TCS vs Infosys vs Wipro valuation comparison.' },
];

const FOLLOW_UPS = [
  'Summarize recent news',
  'Show segment revenue breakdown',
  'Compare with peers',
  'What are the key risks?',
];

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="ai-action-btn" onClick={handle} title="Copy analysis">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span>{copied ? 'Copied' : 'Copy Analysis'}</span>
    </button>
  );
}

/* ── Scope Selector ── */
const SCOPE_OPTIONS = [
  { value: 'fundamental', label: 'Fundamental Analysis', short: 'Financials', Icon: BarChart3, desc: 'Company health, ratios, earnings' },
  { value: 'technical',   label: 'Technical Analysis',   short: 'Charts',     Icon: LineChart, desc: 'Price action, indicators, signals' },
  { value: 'sentiment',   label: 'Sentiment Analysis',   short: 'Sentiment',  Icon: Newspaper, desc: 'News flow, analyst views, market mood' },
];

const SCOPE_PREFIX = {
  fundamental: 'fundamental analysis: ',
  technical:   'technical analysis: ',
  sentiment:   'sentiment analysis: ',
};

function ScopeSelector({ scope, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isAll = scope.length === 0;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = isAll ? 'All' : scope.map(v => SCOPE_OPTIONS.find(o => o.value === v)?.short).join(' + ');

  return (
    <div ref={ref} className="ai-scope-wrap">
      <button className={`ai-scope-trigger${!isAll ? ' active' : ''}`}
        onClick={() => setOpen(o => !o)} type="button">
        <Crosshair size={12} />
        <span>Scope: {label}</span>
      </button>
      {!isAll && scope.map(v => {
        const opt = SCOPE_OPTIONS.find(o => o.value === v);
        return (
          <span key={v} className="ai-scope-chip">
            <opt.Icon size={11} /> {opt.short}
            <button className="ai-scope-chip-x" type="button" onClick={() => onToggle(v)}><X size={9} /></button>
          </span>
        );
      })}
      {!isAll && <button className="ai-scope-reset" type="button" onClick={onReset}>Reset</button>}
      {open && (
        <div className="ai-scope-dropdown">
          <button className={`ai-scope-opt${isAll ? ' active' : ''}`} type="button"
            onClick={() => { onReset(); setOpen(false); }}>
            <Eye size={14} />
            <div className="ai-scope-opt-text">
              <span className="ai-scope-opt-label">All</span>
              <span className="ai-scope-opt-desc">AI decides what to show</span>
            </div>
            {isAll && <Check size={12} />}
          </button>
          <div className="ai-scope-divider" />
          {SCOPE_OPTIONS.map(opt => {
            const isActive = scope.includes(opt.value);
            return (
              <button key={opt.value} type="button"
                className={`ai-scope-opt${isActive ? ' active' : ''}`}
                onClick={() => onToggle(opt.value)}>
                <opt.Icon size={14} />
                <div className="ai-scope-opt-text">
                  <span className="ai-scope-opt-label">{opt.label}</span>
                  <span className="ai-scope-opt-desc">{opt.desc}</span>
                </div>
                {isActive && <Check size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
const AIResearchPage = () => {
  const { messages, loading, toolStatus, error, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [scope, setScope] = useState([]);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const threadRef = useRef(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      userScrolledUp.current = !atBottom;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, toolStatus]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const tag = e.target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isEmpty    = messages.length === 0;
  const lastMsg    = messages[messages.length - 1];
  const streaming  = lastMsg?.role === 'assistant' && lastMsg?.streaming;
  const showDots   = loading && (!streaming || lastMsg?.content === '');
  const canSend    = input.trim() && !loading;
  const showFollowUps = !loading && messages.length > 0 && lastMsg?.role === 'assistant' && !lastMsg?.streaming;

  const handleScopeToggle = useCallback((val) => {
    setScope(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]);
  }, []);
  const handleScopeReset = useCallback(() => setScope([]), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSend) return;
    const raw = input.trim();
    addRecentChat(raw);
    let text = raw;
    if (scope.length > 0) {
      text = scope.map(s => SCOPE_PREFIX[s] || '').join('') + text;
    }
    setInput('');
    userScrolledUp.current = false;
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const handlePrompt = useCallback((t) => {
    setInput('');
    userScrolledUp.current = false;
    addRecentChat(t);
    sendMessage(t);
  }, [sendMessage]);

  const handleNewChat = useCallback(() => {
    clearMessages();
    setScope([]);
  }, [clearMessages]);

  const messageRows = useMemo(
    () => messages.map((msg, i) => {
      const hasToolResults = msg.toolResults?.length > 0;
      const hasContent = msg.content || hasToolResults;

      return (
        <div key={`${msg.timestamp || i}-${i}`} className={`ai-msg ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}>
          <div className={`ai-bubble${msg.streaming ? ' is-streaming' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="ai-bubble-avatar">
                <Sparkles size={14} />
              </div>
            )}
            <div className="ai-bubble-body">
              {msg.thinking && msg.role === 'assistant' && (
                <details className="ai-thinking">
                  <summary>Show reasoning</summary>
                  <div className="ai-thinking-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.thinking}</ReactMarkdown>
                  </div>
                </details>
              )}

              {/* Tool result visual components -- rendered BEFORE the text */}
              {hasToolResults && (
                <ToolResultRenderer toolResults={msg.toolResults} />
              )}

              {msg.content && (
                <div className="ai-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  {msg.streaming && msg.content && <span className="ai-cursor" />}
                </div>
              )}

              {!msg.streaming && hasContent && msg.role === 'assistant' && (
                <div className="ai-bubble-actions">
                  <CopyButton text={msg.content || ''} />
                  <button className="ai-action-btn" title="Export PDF">
                    <Download size={13} /> <span>Export PDF</span>
                  </button>
                  <button className="ai-action-btn" title="Helpful">
                    <ThumbsUp size={13} /> <span>Helpful</span>
                  </button>
                </div>
              )}

              {!msg.streaming && hasContent && (
                <div className="ai-bubble-footer">
                  <time>{formatTime(msg.timestamp)}</time>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }),
    [messages],
  );

  return (
    <div className="ai-page">
      <div className="ai-chat-container">
        {messages.length > 0 && (
          <div className="ai-chat-topbar">
            <button className="ai-new-chat-btn" onClick={handleNewChat} type="button">
              <Trash2 size={13} /> New chat
            </button>
          </div>
        )}

        <div className="ai-thread" ref={threadRef}>
          {isEmpty ? (
            <div className="ai-welcome">
              <div className="ai-welcome-icon">
                <Sparkles size={28} />
              </div>
              <h2 className="ai-welcome-title">How can I help you analyze today?</h2>
              <p className="ai-welcome-sub">
                I can analyze fundamentals, technicals, and sentiment for NSE/BSE listed companies.
              </p>
              <div className="ai-suggestion-cards">
                {SUGGESTIONS.map(s => (
                  <button key={s.title} className="ai-suggestion-card" onClick={() => handlePrompt(s.title)} type="button">
                    <s.icon size={18} className="ai-suggestion-icon" />
                    <div>
                      <span className="ai-suggestion-title">{s.title}</span>
                      <span className="ai-suggestion-desc">{s.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="ai-msg-list">
              {messageRows}

              {showFollowUps && (
                <div className="ai-followups">
                  {FOLLOW_UPS.map(f => (
                    <button key={f} className="ai-followup-btn" onClick={() => handlePrompt(f)} type="button">
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading && toolStatus?.phase === 'running' && (
            <div className="ai-msg is-assistant">
              <div className="ai-tool-badge">
                <span className="ai-tool-spinner" />
                {TOOL_LABELS[toolStatus.tool] ?? `Using ${toolStatus.tool}…`}
              </div>
            </div>
          )}
          {showDots && (
            <div className="ai-msg is-assistant">
              <div className="ai-dots"><span /><span /><span /></div>
            </div>
          )}
          {error && (
            <div className="ai-msg is-assistant">
              <div className="ai-error-bubble">Something went wrong: {error}</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="ai-composer" onSubmit={handleSubmit}>
          <div className="ai-composer-inner">
            <div className="ai-composer-scope-row">
              <ScopeSelector scope={scope} onToggle={handleScopeToggle} onReset={handleScopeReset} />
            </div>
            <div className="ai-composer-input-row">
              <button type="button" className="ai-attach-btn" title="Attach file">
                <Paperclip size={16} />
              </button>
              <input
                ref={inputRef}
                className="ai-composer-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any stock — fundamentals, technicals, sentiment..."
                disabled={loading}
              />
              <button type="submit" className="ai-send-btn" disabled={!canSend}>
                <Send size={16} />
              </button>
            </div>
          </div>
          <p className="ai-disclaimer">Finance Agent can make mistakes. Consider verifying critical investment decisions.</p>
        </form>
      </div>
    </div>
  );
};

export default AIResearchPage;
