import ReactMarkdown from 'react-markdown';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';

const parseMetrics = (text = '') => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  return lines.map((line, index) => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      return { key: parts[0], value: parts.slice(1).join(':').trim() };
    }
    return { key: `Insight ${index + 1}`, value: line };
  });
};

const FundamentalResults = ({ result, loading }) => {
  if (loading) {
    return (
      <div className="fundamental-loading">
        <Skeleton className="h-24" />
        <Skeleton className="h-36" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="No fundamental report yet"
        description="Select a stock and analysis view to generate financial commentary."
      />
    );
  }

  const metrics = parseMetrics(result.response);

  return (
    <div className="fundamental-results">
      <Card title="Summary" subtitle={`Generated for ${result.symbol}`}>
        <div className="summary-grid">
          <div className="summary-item">
            <span>Analysis Type</span>
            <strong>{result.analysisType.replace('_', ' ')}</strong>
          </div>
          <div className="summary-item">
            <span>Timestamp</span>
            <strong>{new Date(result.timestamp).toLocaleString()}</strong>
          </div>
          <div className="summary-item">
            <span>Status</span>
            <strong>Completed</strong>
          </div>
        </div>
      </Card>

      <Card title="Key Metrics" subtitle="Extracted from agent response highlights.">
        <div className="metrics-grid">
          {metrics.map((metric) => (
            <article className="metric-card" key={`${metric.key}-${metric.value}`}>
              <p>{metric.key}</p>
              <h4>{metric.value}</h4>
            </article>
          ))}
        </div>
      </Card>

      <Card title="AI Commentary" subtitle="Narrative interpretation and context.">
        <div className="commentary-panel">
          <ReactMarkdown>{result.response}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
};

export default FundamentalResults;
