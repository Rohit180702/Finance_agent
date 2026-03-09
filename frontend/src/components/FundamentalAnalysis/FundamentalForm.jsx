import { useState } from 'react';
import StockSelector from '../TechnicalAnalysis/StockSelector';
import Button from '../ui/Button';
import SegmentedControl from '../ui/SegmentedControl';

const analysisOptions = [
  { value: 'all', label: 'Overview' },
  { value: 'ratios', label: 'Ratios' },
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'cashflow', label: 'Cash Flow' },
  { value: 'income', label: 'Income Statement' },
];

const FundamentalForm = ({ onSubmit, loading, analysisType, onAnalysisTypeChange }) => {
  const [symbol, setSymbol] = useState('');

  return (
    <form
      className="fundamental-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!symbol || loading) return;
        onSubmit({ symbol, analysisType });
      }}
    >
      <div className="field-grid-2">
        <div className="ui-field">
          <span className="ui-field-label">Stock</span>
          <StockSelector
            value={symbol}
            onChange={setSymbol}
          />
        </div>
        <div className="ui-field">
          <span className="ui-field-label">Analysis View</span>
          <SegmentedControl
            value={analysisType}
            onChange={onAnalysisTypeChange}
            options={analysisOptions}
          />
        </div>
      </div>

      <Button type="submit" disabled={!symbol || loading}>
        {loading ? 'Analyzing...' : 'Run Fundamental Analysis'}
      </Button>
    </form>
  );
};

export default FundamentalForm;
