import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };

function signalClass(indicator, value) {
  const ind = indicator?.toLowerCase();
  if (ind === 'rsi') {
    if (value < 30) return 'positive';
    if (value > 70) return 'negative';
    return '';
  }
  return '';
}

function signalLabel(indicator, value) {
  const ind = indicator?.toLowerCase();
  if (ind === 'rsi') {
    if (value < 30) return 'Oversold';
    if (value < 40) return 'Near Oversold';
    if (value > 70) return 'Overbought';
    if (value > 60) return 'Near Overbought';
    return 'Neutral';
  }
  return '';
}

export default function TechnicalResult({ data }) {
  if (!data?.success) return null;

  const { symbol, indicator, current_value, data_period, indicator_period } = data;
  const cleanSym = symbol?.replace('.NS', '').replace('.BO', '');
  const isMultiCol = typeof current_value === 'object' && current_value !== null;

  const numValue = isMultiCol ? null : parseFloat(current_value);
  const cls = signalClass(indicator, numValue);
  const signal = signalLabel(indicator, numValue);

  return (
    <div className="tr-technical">
      <div className="tr-section-header">
        <Activity size={16} />
        <span>{indicator?.toUpperCase()} — {cleanSym}</span>
        {symbol && (
          <Link to={`/stock/${symbol}?tab=technical`} className="tr-view-link">
            View Dashboard →
          </Link>
        )}
      </div>

      <div className="tr-indicator-card-large">
        <div className="tr-ind-main">
          <span className="tr-ind-name">{indicator?.toUpperCase()} ({indicator_period})</span>
          {!isMultiCol ? (
            <span className={`tr-ind-big-value ${cls}`}>{fmt(numValue)}</span>
          ) : (
            <div className="tr-ind-multi">
              {Object.entries(current_value).map(([k, v]) => (
                <div key={k} className="tr-ind-multi-row">
                  <span className="tr-ind-multi-label">{k.replace(/_/g, ' ')}</span>
                  <span className="tr-ind-multi-value">{fmt(v)}</span>
                </div>
              ))}
            </div>
          )}
          {signal && <span className={`tr-ind-signal ${cls}`}>{signal}</span>}
        </div>
        <div className="tr-ind-meta">
          <span>Period: {data_period}</span>
          {!isMultiCol && indicator?.toLowerCase() === 'rsi' && (
            <div className="tr-rsi-gauge">
              <div className="tr-rsi-track">
                <div className="tr-rsi-zone oversold" />
                <div className="tr-rsi-zone neutral" />
                <div className="tr-rsi-zone overbought" />
                <div className="tr-rsi-needle" style={{ left: `${Math.min(Math.max(numValue, 0), 100)}%` }} />
              </div>
              <div className="tr-rsi-labels">
                <span>0</span><span>30</span><span>70</span><span>100</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
