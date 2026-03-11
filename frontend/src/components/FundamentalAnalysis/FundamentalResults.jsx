import ReactMarkdown from 'react-markdown';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import './FundamentalResults.css';
import './FundamentalAnalysis.css';

const TITLES = {
  all: 'Complete Fundamental Analysis',
  ratios: 'Key Ratios — Deep Dive',
  balance_sheet: 'Balance Sheet — Deep Dive',
  cashflow: 'Cash Flow — Deep Dive',
  income: 'Income Statement — Deep Dive',
};

const SUBTITLES = {
  all: 'Overview + investment verdict across all financial dimensions',
  ratios: 'Valuation, profitability, liquidity, leverage, and analyst consensus',
  balance_sheet: 'Asset quality, debt structure, liquidity, and working capital',
  cashflow: 'OCF quality, free cash flow, capex efficiency, and financing',
  income: 'Revenue, margins, EBITDA, and earnings quality',
};

const FundamentalResults = ({ result, loading, analysisType = 'all' }) => {
  if (loading) {
    return (
      <div className="fundamental-loading">
        <Skeleton className="h-24" />
        <Skeleton className="h-36" />
        <Skeleton className="h-48" />
        <Skeleton className="h-36" />
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="No analysis yet"
        description="Select a stock and an analysis view, then click Run."
      />
    );
  }

  return (
    <div className="fundamental-results">
      <Card title="Summary" subtitle={`Generated for ${result.symbol}`}>
        <div className="summary-grid">
          <div className="summary-item">
            <span>View</span>
            <strong>{TITLES[result.analysisType] ?? result.analysisType}</strong>
          </div>
          <div className="summary-item">
            <span>Generated</span>
            <strong>{new Date(result.timestamp).toLocaleString()}</strong>
          </div>
          <div className="summary-item">
            <span>Status</span>
            <strong>{result.errors?.length ? `${result.errors.length} warning(s)` : 'Completed'}</strong>
          </div>
        </div>
      </Card>

      <Card
        title={TITLES[analysisType] ?? 'Financial Analysis'}
        subtitle={SUBTITLES[analysisType] ?? 'AI-generated financial insights'}
      >
        <div className="commentary-panel">
          <ReactMarkdown>{result.consolidated_report}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
};

export default FundamentalResults;
