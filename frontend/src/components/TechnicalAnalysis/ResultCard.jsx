import { useState, useEffect } from 'react';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import TechnicalChart from './TechnicalChart';
import { getChartData } from '../../services/api';
import './ResultCard.css';

const ResultCard = ({ result, loading }) => {
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  useEffect(() => {
    if (!result?.params) {
      setChartData(null);
      return;
    }
    let cancelled = false;
    setChartLoading(true);
    setChartError(null);
    getChartData(result.params)
      .then((data) => { if (!cancelled) setChartData(data); })
      .catch((err) => { if (!cancelled) setChartError(err.message); })
      .finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [result]);

  if (loading) {
    return (
      <div className="result-panel-loading">
        <Skeleton style={{ height: '5rem', borderRadius: '8px' }} />
        <Skeleton style={{ height: '14rem', borderRadius: '8px', marginTop: '1rem' }} />
        <Skeleton style={{ height: '4rem', borderRadius: '8px', marginTop: '1rem' }} />
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="No indicator output yet"
        description="Run a calculation to view indicator value, response narrative, and chart."
      />
    );
  }

  const p = result.params ?? {};
  const ind = p.indicator?.toUpperCase() ?? '--';
  const sym = p.symbol?.toUpperCase() ?? '--';

  return (
    <section className="result-panel">

      {/* metric strip */}
      <div className="metric-strip">
        <div>
          <p className="metric-label">Symbol</p>
          <p className="metric-text">{sym}</p>
        </div>
        <div>
          <p className="metric-label">Indicator</p>
          <p className="metric-text">{ind}</p>
        </div>
        <div>
          <p className="metric-label">Period</p>
          <p className="metric-text">{p.data_period ?? '--'}</p>
        </div>
        <div>
          <p className="metric-label">Interval</p>
          <p className="metric-text">{p.interval ?? '--'}</p>
        </div>
        <div>
          <p className="metric-label">Lookback</p>
          <p className="metric-text">{p.indicator_period ?? '--'}</p>
        </div>
      </div>

      {/* real chart */}
      {chartLoading && (
        <Skeleton style={{ height: '28rem', borderRadius: '12px', marginTop: '1.5rem' }} />
      )}
      {!chartLoading && chartError && (
        <p className="chart-error">Chart unavailable: {chartError}</p>
      )}
      {!chartLoading && chartData && (
        <TechnicalChart chartData={chartData} />
      )}

      {/* AI narrative */}
      <div className="response-panel">
        <h4>Analysis Summary</h4>
        <p>{result.response}</p>
      </div>

    </section>
  );
};

export default ResultCard;
