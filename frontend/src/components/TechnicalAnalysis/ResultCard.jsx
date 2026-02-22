import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';

const extractIndicatorValue = (response = '') => {
  const match = String(response).match(/(-?\d+(?:\.\d+)?)/);
  return match ? Number(match[1]).toFixed(2) : '--';
};

const ResultCard = ({ result, loading }) => {
  if (loading) {
    return (
      <div className="result-panel-loading">
        <Skeleton className="h-24" />
        <Skeleton className="h-56" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="No indicator output yet"
        description="Run a calculation to view indicator value, response narrative, and metadata."
      />
    );
  }

  const currentValue = extractIndicatorValue(result.response);

  return (
    <section className="result-panel">
      <div className="metric-strip">
        <div>
          <p className="metric-label">Current Value</p>
          <p className="metric-value">{currentValue}</p>
        </div>
        <div>
          <p className="metric-label">Indicator</p>
          <p className="metric-text">{result.params?.indicator?.toUpperCase() || '--'}</p>
        </div>
        <div>
          <p className="metric-label">Symbol</p>
          <p className="metric-text">{result.params?.symbol || '--'}</p>
        </div>
      </div>

      <div className="chart-surface" aria-label="Chart preview">
        <div className="chart-grid" />
        <svg viewBox="0 0 400 160" className="chart-line" aria-hidden="true">
          <path d="M10 120 C 60 100, 100 130, 150 90 C 200 50, 240 80, 300 55 C 330 45, 360 70, 390 60" />
        </svg>
      </div>

      <div className="response-panel">
        <h4>Analysis Summary</h4>
        <p>{result.response}</p>
      </div>

      <div className="meta-row">
        <span>Period: {result.params?.data_period || '--'}</span>
        <span>Interval: {result.params?.interval || '--'}</span>
        <span>Lookback: {result.params?.indicator_period || '--'}</span>
      </div>
    </section>
  );
};

export default ResultCard;
