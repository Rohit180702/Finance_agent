import { Activity, TrendingUp, ShieldAlert, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const VERDICT_COLORS = {
  Bullish:  { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)' },
  Bearish:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)' },
  Neutral:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
};

export default function SentimentResult({ data }) {
  if (!data?.success) return null;

  const { symbol } = data;
  const s = data.sentiment || {};
  const raw = data.raw || {};
  const vc = VERDICT_COLORS[s.verdict] || VERDICT_COLORS.Neutral;
  const cleanSym = symbol?.replace('.NS', '').replace('.BO', '');

  return (
    <div className="tr-sentiment">
      <div className="tr-section-header">
        <Activity size={16} />
        <span>Sentiment Analysis: {cleanSym}</span>
        {symbol && (
          <Link to={`/stock/${symbol}?tab=sentiment`} className="tr-view-link">
            View Dashboard →
          </Link>
        )}
      </div>

      <div className="tr-sent-grid">
        {/* Score Ring */}
        <div className="tr-sent-score" style={{ borderColor: vc.border, background: vc.bg }}>
          <div className="tr-ring-wrap">
            <svg viewBox="0 0 100 100" className="tr-ring-svg">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={vc.color} strokeWidth="8"
                strokeDasharray={`${(s.score || 0) * 2.51} ${251 - (s.score || 0) * 2.51}`}
                strokeLinecap="round" transform="rotate(-90 50 50)" />
            </svg>
            <div className="tr-ring-center">
              <span className="tr-ring-num" style={{ color: vc.color }}>{s.score}</span>
              <span className="tr-ring-label">{s.verdict}</span>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="tr-sent-meta">
          <div className="tr-sent-meta-item">
            <span className="tr-meta-label">News Sentiment</span>
            <span className="tr-meta-value">{s.news_sentiment || '—'}</span>
          </div>
          <div className="tr-sent-meta-item">
            <span className="tr-meta-label">Articles</span>
            <span className="tr-meta-value">{raw.news_count ?? '—'}</span>
          </div>
          {raw.analyst?.target_mean && (
            <div className="tr-sent-meta-item">
              <span className="tr-meta-label">Target</span>
              <span className="tr-meta-value">₹{raw.analyst.target_mean}</span>
            </div>
          )}
        </div>
      </div>

      {/* Drivers + Risks */}
      <div className="tr-two-col">
        {s.drivers?.length > 0 && (
          <div className="tr-card">
            <h4 className="tr-card-title"><TrendingUp size={13} /> Bullish Factors</h4>
            <ul className="tr-factor-list positive">
              {s.drivers.slice(0, 4).map((d, i) => (
                <li key={i}><ChevronRight size={11} />{d}</li>
              ))}
            </ul>
          </div>
        )}
        {s.risks?.length > 0 && (
          <div className="tr-card">
            <h4 className="tr-card-title"><ShieldAlert size={13} /> Risk Factors</h4>
            <ul className="tr-factor-list negative">
              {s.risks.slice(0, 4).map((r, i) => (
                <li key={i}><ChevronRight size={11} />{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
