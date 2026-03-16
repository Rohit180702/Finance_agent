import { useState } from 'react';
import StockSelector from '../TechnicalAnalysis/StockSelector';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Skeleton from '../ui/Skeleton';
import { ExternalLink } from 'lucide-react';
import { useSentiment } from '../../hooks/useSentiment';

const VERDICT_COLOR = { Bullish: '#22c55e', Bearish: '#ef4444', Neutral: '#f59e0b' };
const NEWS_COLOR    = { Positive: '#22c55e', Negative: '#ef4444', Mixed: '#f59e0b', Neutral: '#9ca3af' };

const SentimentAnalysis = () => {
  const { loading, error, result, analyze } = useSentiment();
  const [symbol, setSymbol] = useState('');

  return (
    <section className="sentiment-layout">
      <Card title="Sentiment Analysis" subtitle="AI-powered analysis using recent news, price trend, and analyst ratings.">
        <form
          className="sentiment-form"
          onSubmit={(e) => { e.preventDefault(); if (!symbol || loading) return; analyze({ symbol }); }}
        >
          <div className="ui-field">
            <span className="ui-field-label">Stock</span>
            <StockSelector value={symbol} onChange={setSymbol} />
          </div>
          <Button type="submit" disabled={!symbol || loading}>
            {loading ? 'Analysing…' : 'Analyse Sentiment'}
          </Button>
        </form>
      </Card>

      {error && <ErrorState title="Sentiment analysis failed" message={error} />}

      {loading && (
        <Card title="Processing" subtitle="Fetching news, price data, analyst ratings and calling Claude…">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </Card>
      )}

      {!loading && !result && !error && (
        <Card>
          <EmptyState
            title="No sentiment report yet"
            description="Select a stock and click Analyse Sentiment to get an AI-powered report."
          />
        </Card>
      )}

      {!loading && result && (
        <div className="sentiment-results-grid">

          {/* Verdict + Score */}
          <Card title="Verdict" subtitle={`${result.symbol} · ${result.news_sentiment || ''} news sentiment`}>
            <div className="gauge-wrap">
              <meter className="sentiment-meter" min="0" max="100" value={result.score} />
              <div>
                <p className="metric-value" style={{ color: VERDICT_COLOR[result.verdict] }}>
                  {result.verdict}
                </p>
                <p className="metric-label">Score: {result.score} / 100</p>
              </div>
            </div>
          </Card>

          {/* Drivers */}
          {result.drivers?.length > 0 && (
            <Card title="Key Drivers" subtitle="What's supporting the sentiment">
              <ul className="headline-list" style={{ color: '#22c55e' }}>
                {result.drivers.map((d, i) => <li key={i}>✓ {d}</li>)}
              </ul>
            </Card>
          )}

          {/* Risks */}
          {result.risks?.length > 0 && (
            <Card title="Risk Factors" subtitle="What could change the outlook">
              <ul className="headline-list" style={{ color: '#ef4444' }}>
                {result.risks.map((r, i) => <li key={i}>⚠ {r}</li>)}
              </ul>
            </Card>
          )}

          {/* AI Summary */}
          <Card title="AI Summary" subtitle={`Updated ${new Date(result.timestamp).toLocaleString()}`}>
            <p className="commentary-panel">{result.summary}</p>
          </Card>

          {/* News Sources */}
          {result.news_items?.length > 0 && (
            <Card title="News Sources Used" subtitle="Articles analysed to generate this report">
              <div className="sent-sources-list">
                {result.news_items.map((item, i) => (
                  <a
                    key={i}
                    className="sent-source-card"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="sent-source-meta">
                      {item.publisher && <span className="sent-source-pub">{item.publisher}</span>}
                      <span className="sent-source-date">{item.date}</span>
                    </div>
                    <p className="sent-source-title">{item.title}</p>
                    {item.summary && <p className="sent-source-summary">{item.summary}</p>}
                    <ExternalLink size={11} className="sent-source-ext" />
                  </a>
                ))}
              </div>
            </Card>
          )}

        </div>
      )}
    </section>
  );
};

export default SentimentAnalysis;
