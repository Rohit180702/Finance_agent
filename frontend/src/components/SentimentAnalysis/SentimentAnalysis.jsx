import { useState } from 'react';
import StockSelector from '../TechnicalAnalysis/StockSelector';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Skeleton from '../ui/Skeleton';
import { useSentiment } from '../../hooks/useSentiment';

const ranges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const sources = [
  { value: 'news', label: 'News' },
  { value: 'social', label: 'Social' },
  { value: 'both', label: 'Both' },
];

const SentimentAnalysis = () => {
  const { loading, error, result, analyze } = useSentiment();
  const [symbol, setSymbol] = useState('');
  const [range, setRange] = useState('30d');
  const [source, setSource] = useState('both');

  return (
    <section className="sentiment-layout">
      <Card title="Configuration" subtitle="Define market narrative scope and source coverage.">
        <form
          className="sentiment-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!symbol || loading) return;
            analyze({ symbol, range, source });
          }}
        >
          <div className="ui-field">
            <span className="ui-field-label">Stock</span>
            <StockSelector value={symbol} onChange={setSymbol} />
          </div>

          <div className="field-grid-2">
            <Select id="range" label="Time Range" value={range} onChange={(event) => setRange(event.target.value)}>
              {ranges.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>

            <Select id="source" label="Data Source" value={source} onChange={(event) => setSource(event.target.value)}>
              {sources.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" disabled={!symbol || loading}>
            {loading ? 'Analyzing...' : 'Analyze Sentiment'}
          </Button>
        </form>
      </Card>

      {error && <ErrorState title="Sentiment analysis failed" message={error} />}

      {loading && (
        <Card title="Processing" subtitle="Collecting narrative signals.">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </Card>
      )}

      {!loading && !result && (
        <Card>
          <EmptyState
            title="No sentiment report yet"
            description="Choose a stock, range, and source to compute sentiment positioning."
          />
        </Card>
      )}

      {!loading && result && (
        <div className="sentiment-results-grid">
          <Card title="Sentiment Score" subtitle={`${result.symbol} | ${result.range} | ${result.source}`}>
            <div className="gauge-wrap">
              <meter className="sentiment-meter" min="0" max="100" value={result.score} />
              <div>
                <p className="metric-value">{result.score}</p>
                <p className="metric-label">Composite sentiment score</p>
              </div>
            </div>

            <div className="breakdown-grid">
              <article>
                <span>Positive</span>
                <strong>{result.breakdown.positive}%</strong>
              </article>
              <article>
                <span>Neutral</span>
                <strong>{result.breakdown.neutral}%</strong>
              </article>
              <article>
                <span>Negative</span>
                <strong>{result.breakdown.negative}%</strong>
              </article>
            </div>
          </Card>

          <Card title="Sentiment Trend" subtitle="Recent tone trajectory.">
            <div className="trend-chart">
              {result.trend.map((point, index) => (
                <div key={`${point}-${index}`} className="trend-bar-wrap">
                  <progress max="100" value={point} />
                  <span>D{index + 1}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Headlines" subtitle="Representative market narrative snippets.">
            <ul className="headline-list">
              {result.headlines.map((headline) => (
                <li key={headline}>{headline}</li>
              ))}
            </ul>
          </Card>

          <Card title="AI Summary" subtitle={`Updated ${new Date(result.timestamp).toLocaleString()}`}>
            <p className="commentary-panel">{result.summary}</p>
          </Card>
        </div>
      )}
    </section>
  );
};

export default SentimentAnalysis;
