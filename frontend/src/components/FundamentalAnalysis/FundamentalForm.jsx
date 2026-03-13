import { useState } from 'react';
import StockSelector from '../TechnicalAnalysis/StockSelector';
import Button from '../ui/Button';
import Select from '../ui/Select';

const analysisOptions = [
  { value: 'all', label: 'Overview — Full Analysis + Investment Verdict' },
  { value: 'ratios', label: 'Ratios — Valuation, Profitability & Health' },
  { value: 'balance_sheet', label: 'Balance Sheet — Assets, Debt & Equity' },
  { value: 'cashflow', label: 'Cash Flow — OCF, FCF & Capex' },
  { value: 'income', label: 'Income Statement — Revenue, Margins & Earnings' },
];

const FundamentalForm = ({ onSubmit, loading, analysisType, onAnalysisTypeChange, isCached, defaultSymbol = '' }) => {
  const [symbol, setSymbol] = useState(defaultSymbol);

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
        <Select
          label="Analysis Type"
          id="analysis-type"
          value={analysisType}
          onChange={(e) => onAnalysisTypeChange(e.target.value)}
        >
          {analysisOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      <Button type="submit" disabled={!symbol || loading}>
        {loading ? 'Analyzing...' : isCached ? 'Re-run Analysis' : 'Run Analysis'}
      </Button>
    </form>
  );
};

export default FundamentalForm;
