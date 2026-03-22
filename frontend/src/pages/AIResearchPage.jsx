import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles, Send, Trash2, Copy, Check,
  ExternalLink, TrendingUp, TrendingDown,
  X, Zap, BarChart3, LineChart, FileText,
  ThumbsUp, Download, MessageSquare, Paperclip,
} from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { getStockMetrics, getStockSentiment } from '../services/stockDetailApi';
import { addRecentChat } from '../components/layout/Sidebar';
import './AIResearchPage.css';

const TOOL_LABELS = {
  calculate_indicator:  'Running technical indicator…',
  analyze_fundamentals: 'Fetching fundamental data…',
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

const KNOWN_SYMBOLS = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','SBIN',
  'BHARTIARTL','KOTAKBANK','LT','HCLTECH','AXISBANK','ASIANPAINT','MARUTI',
  'SUNPHARMA','TATAMOTORS','WIPRO','ULTRACEMCO','TITAN','NESTLEIND',
  'BAJFINANCE','BAJAJFINSV','POWERGRID','NTPC','TECHM','ADANIENT','ADANIPORTS',
  'TATASTEEL','JSWSTEEL','HINDALCO','ONGC','COALINDIA','BPCL','IOC','GRASIM',
  'DIVISLAB','DRREDDY','CIPLA','APOLLOHOSP','EICHERMOT','HEROMOTOCO','BAJAJ-AUTO',
  'M&M','BRITANNIA','INDUSINDBK','SBILIFE','HDFCLIFE',
];

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function extractSymbol(text) {
  if (!text) return null;
  const upper = text.toUpperCase();
  for (const sym of KNOWN_SYMBOLS) {
    if (upper.includes(sym)) return sym;
  }
  const match = upper.match(/\b([A-Z]{3,}(?:-[A-Z]+)?)\b/g);
  if (match) {
    for (const m of match) {
      if (m.length >= 3 && !['THE','FOR','AND','NOT','ARE','BUT','HAS','WAS','CAN','HOW',
        'WHAT','WHEN','WHICH','WITH','ABOUT','UNDER','OVER','INTO','BETWEEN','THROUGH',
        'STOCK','STOCKS','BUY','SELL','HOLD','ANALYSIS','INDICATOR','MARKET','SECTOR',
        'GOOD','BEST','COMPARE','RSI','MACD','SMA','EMA'].includes(m)) {
        return m;
      }
    }
  }
  return null;
}

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

/* ── Inline Insight Cards ── */
function InsightCards({ insight }) {
  if (!insight || insight.loading) return null;
  const m = insight.metrics || {};
  const s = insight.sentiment?.sentiment || {};
  const fmtP = v => v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

  const verdictClass = s.verdict === 'Bullish' || s.verdict === 'Strong Buy' || s.verdict === 'Buy'
    ? 'positive'
    : s.verdict === 'Bearish' || s.verdict === 'Sell' || s.verdict === 'Strong Sell'
      ? 'negative' : 'neutral';

  return (
    <div className="ai-insight-inline">
      {/* AI Verdict */}
      {s.verdict && s.score != null && (
        <div className={`ai-verdict-card ${verdictClass}`}>
          <div className="ai-verdict-header">
            <TrendingUp size={16} />
            <span className="ai-verdict-label">AI VERDICT</span>
          </div>
          <div className="ai-verdict-body">
            <span className={`ai-verdict-text ${verdictClass}`}>{s.verdict}</span>
            {s.score != null && (
              <div className="ai-verdict-score">
                <svg viewBox="0 0 36 36" className="ai-score-ring">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.15" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeDasharray={`${s.score} ${100 - s.score}`}
                    strokeLinecap="round" />
                </svg>
                <span className="ai-score-num">{s.score}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fundamental + Technical cards side by side */}
      <div className="ai-data-cards">
        {(m.pe || m.roe || m.debt_equity) && (
          <div className="ai-data-card">
            <div className="ai-data-card-header">
              <BarChart3 size={14} />
              <span>Fundamental Highlights</span>
            </div>
            <div className="ai-data-card-body">
              {m.pe != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">P/E Ratio</span>
                  <span className="ai-data-value">{m.pe.toFixed(1)}</span>
                </div>
              )}
              {m.roe != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">ROE</span>
                  <span className="ai-data-value">{m.roe.toFixed(1)}%</span>
                </div>
              )}
              {m.debt_equity != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">Debt to Equity</span>
                  <span className="ai-data-value">{m.debt_equity.toFixed(2)}</span>
                </div>
              )}
              {m.dividend_yield != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">Div Yield</span>
                  <span className="ai-data-value">{m.dividend_yield.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(m.price || m.week52_high) && (
          <div className="ai-data-card">
            <div className="ai-data-card-header">
              <LineChart size={14} />
              <span>Technical Signals</span>
            </div>
            <div className="ai-data-card-body">
              {m.price != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">Current Price</span>
                  <span className="ai-data-value">
                    {fmtP(m.price)}
                    {m.change_pct != null && (
                      <span className={`ai-data-change ${m.change_pct >= 0 ? 'up' : 'dn'}`}>
                        {m.change_pct >= 0 ? '+' : ''}{m.change_pct.toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
              )}
              {m.week52_high != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">52W High</span>
                  <span className="ai-data-value">{fmtP(m.week52_high)}</span>
                </div>
              )}
              {m.week52_low != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">52W Low</span>
                  <span className="ai-data-value">{fmtP(m.week52_low)}</span>
                </div>
              )}
              {m.market_cap_cr != null && (
                <div className="ai-data-row">
                  <span className="ai-data-label">Market Cap</span>
                  <span className="ai-data-value">₹{Number(m.market_cap_cr).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Link to={`/stock/${insight.symbol}`} className="ai-insight-view-link">
        View Full Analysis <ExternalLink size={12} />
      </Link>
    </div>
  );
}

/* ── Main Page ── */
const AIResearchPage = () => {
  const { messages, loading, toolStatus, error, sendMessage, clearMessages } = useChat();
  const [input, setInput]           = useState('');
  const [contextSymbol, setContextSymbol] = useState(null);
  const [insights, setInsights]     = useState({});
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const fetched  = useRef(new Set());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Extract symbol from user messages and fetch insights
  useEffect(() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (!userMsgs.length) return;
    const latest = userMsgs[userMsgs.length - 1];
    const sym = extractSymbol(latest.content);
    if (!sym || fetched.current.has(sym)) return;
    fetched.current.add(sym);
    setContextSymbol(sym);

    setInsights(prev => ({ ...prev, [sym]: { symbol: sym, loading: true } }));

    Promise.allSettled([
      getStockMetrics(sym).catch(() => null),
      getStockSentiment(sym).catch(() => null),
    ]).then(([metricsRes, sentimentRes]) => {
      const md = metricsRes.status === 'fulfilled' ? metricsRes.value : null;
      const sd = sentimentRes.status === 'fulfilled' ? sentimentRes.value : null;
      setInsights(prev => ({
        ...prev,
        [sym]: { symbol: sym, metrics: md?.metrics || null, sentiment: sd || null, loading: false },
      }));
    });
  }, [messages]);

  const isEmpty    = messages.length === 0;
  const lastMsg    = messages[messages.length - 1];
  const streaming  = lastMsg?.role === 'assistant' && lastMsg?.streaming;
  const showDots   = loading && (!streaming || lastMsg?.content === '');
  const canSend    = input.trim() && !loading;
  const showFollowUps = !loading && messages.length > 0 && lastMsg?.role === 'assistant' && !lastMsg?.streaming;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSend) return;
    const raw = input.trim();
    addRecentChat(raw);
    setInput('');
    sendMessage(raw);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const handlePrompt = useCallback((t) => {
    setInput('');
    addRecentChat(t);
    sendMessage(t);
  }, [sendMessage]);

  const handleNewChat = useCallback(() => {
    clearMessages();
    setInsights({});
    setContextSymbol(null);
    fetched.current.clear();
  }, [clearMessages]);

  // Find insight for a message (show after the assistant message that follows a user message with a symbol)
  const getInsightForIndex = (idx) => {
    if (messages[idx]?.role !== 'assistant') return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        const sym = extractSymbol(messages[i].content);
        return sym ? insights[sym] : null;
      }
    }
    return null;
  };

  const messageRows = useMemo(
    () => messages.map((msg, i) => {
      const insight = getInsightForIndex(i);
      const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;

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
              <div className="ai-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                {msg.streaming && msg.content && <span className="ai-cursor" />}
              </div>

              {/* Inline insight cards after assistant response */}
              {msg.role === 'assistant' && !msg.streaming && insight && !insight.loading && (
                <InsightCards insight={insight} />
              )}

              {/* Action buttons */}
              {!msg.streaming && msg.content && msg.role === 'assistant' && (
                <div className="ai-bubble-actions">
                  <CopyButton text={msg.content} />
                  <button className="ai-action-btn" title="Export PDF">
                    <Download size={13} /> <span>Export PDF</span>
                  </button>
                  <button className="ai-action-btn" title="Helpful">
                    <ThumbsUp size={13} /> <span>Helpful</span>
                  </button>
                </div>
              )}

              {!msg.streaming && msg.content && (
                <div className="ai-bubble-footer">
                  <time>{formatTime(msg.timestamp)}</time>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }),
    [messages, insights],
  );

  return (
    <div className="ai-page">
      <div className="ai-chat-container">
        {/* Top actions */}
        {messages.length > 0 && (
          <div className="ai-chat-topbar">
            <button className="ai-new-chat-btn" onClick={handleNewChat} type="button">
              <Trash2 size={13} /> New chat
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="ai-thread">
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

              {/* Follow-up suggestions */}
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
              <div className="ai-error-bubble">⚠ {error}</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form className="ai-composer" onSubmit={handleSubmit}>
          <div className="ai-composer-inner">
            {contextSymbol && (
              <div className="ai-context-row">
                <span className="ai-context-label">CONTEXT:</span>
                <span className="ai-context-chip">
                  <Sparkles size={11} />
                  {contextSymbol}
                  <button className="ai-context-remove" type="button" onClick={() => setContextSymbol(null)}>
                    <X size={10} />
                  </button>
                </span>
              </div>
            )}
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
                placeholder="Ask a follow-up question or analyze another stock..."
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
