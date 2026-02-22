import { useState } from 'react';
import { useConfig } from '../../hooks/useConfig';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Skeleton from '../ui/Skeleton';
import ErrorState from '../ui/ErrorState';
import IndicatorSelector from './IndicatorSelector';
import StockSelector from './StockSelector';

const periodLabels = {
  '1d': '1 Day',
  '5d': '5 Days',
  '1mo': '1 Month',
  '3mo': '3 Months',
  '6mo': '6 Months',
  '1y': '1 Year',
  '2y': '2 Years',
  '5y': '5 Years',
  '10y': '10 Years',
  ytd: 'Year to Date',
  max: 'Maximum',
};

const intervalLabels = {
  '1m': '1 Minute',
  '2m': '2 Minutes',
  '5m': '5 Minutes',
  '15m': '15 Minutes',
  '30m': '30 Minutes',
  '1h': '1 Hour',
  '90m': '90 Minutes',
  '1d': '1 Day',
  '5d': '5 Days',
  '1wk': '1 Week',
  '1mo': '1 Month',
  '3mo': '3 Months',
};

const IndicatorForm = ({ onSubmit, loading }) => {
  const { config, loading: configLoading, error } = useConfig();
  const [formData, setFormData] = useState({
    symbol: '',
    indicator: '',
    data_period: '6mo',
    interval: '1d',
    indicator_period: 14,
  });

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'indicator_period' ? Number(value) : value,
    }));
  };

  const disabled = !formData.symbol || !formData.indicator || loading;

  if (configLoading) {
    return (
      <div className="form-loading-state">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Configuration unavailable" message={error} />;
  }

  return (
    <form
      className="indicator-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(formData);
      }}
    >
      <div className="ui-field">
        <span className="ui-field-label">Stock</span>
        <StockSelector
          value={formData.symbol}
          onChange={(value) => handleChange('symbol', value)}
        />
        <span className="ui-field-hint">Select from NSE stocks and indices.</span>
      </div>

      <div className="ui-field">
        <span className="ui-field-label">Indicator</span>
        <IndicatorSelector
          value={formData.indicator}
          onChange={(value) => handleChange('indicator', value)}
          indicators={config?.indicators}
        />
        <span className="ui-field-hint">Browse categories or search by indicator name.</span>
      </div>

      <div className="field-grid-2">
        <Select
          id="data_period"
          label="Data Period"
          value={formData.data_period}
          onChange={(event) => handleChange('data_period', event.target.value)}
        >
          {(config?.periods || []).map((period) => (
            <option key={period.value} value={period.value}>
              {periodLabels[period.value] || period.value}
            </option>
          ))}
        </Select>

        <Select
          id="interval"
          label="Interval"
          value={formData.interval}
          onChange={(event) => handleChange('interval', event.target.value)}
        >
          {(config?.intervals || []).map((interval) => (
            <option key={interval.value} value={interval.value}>
              {intervalLabels[interval.value] || interval.value}
            </option>
          ))}
        </Select>
      </div>

      <label className="ui-field" htmlFor="indicator_period">
        <span className="ui-field-label">Indicator Period</span>
        <input
          className="ui-input"
          id="indicator_period"
          name="indicator_period"
          type="number"
          min="1"
          max="200"
          value={formData.indicator_period}
          onChange={(event) => handleChange('indicator_period', event.target.value)}
        />
      </label>

      <Button type="submit" disabled={disabled}>
        {loading ? 'Calculating...' : 'Calculate Indicator'}
      </Button>
    </form>
  );
};

export default IndicatorForm;
