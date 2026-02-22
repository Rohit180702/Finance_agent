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

const FundamentalForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    analysisType: 'all',
  });

  return (
    <form
      className="fundamental-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!formData.symbol || loading) return;
        onSubmit(formData);
      }}
    >
      <div className="field-grid-2">
        <div className="ui-field">
          <span className="ui-field-label">Stock</span>
          <StockSelector
            value={formData.symbol}
            onChange={(value) => setFormData((prev) => ({ ...prev, symbol: value }))}
          />
        </div>
        <div className="ui-field">
          <span className="ui-field-label">Analysis View</span>
          <SegmentedControl
            value={formData.analysisType}
            onChange={(value) => setFormData((prev) => ({ ...prev, analysisType: value }))}
            options={analysisOptions}
          />
        </div>
      </div>

      <Button type="submit" disabled={!formData.symbol || loading}>
        {loading ? 'Analyzing...' : 'Run Fundamental Analysis'}
      </Button>
    </form>
  );
};

export default FundamentalForm;
