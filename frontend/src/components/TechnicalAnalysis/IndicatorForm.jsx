import React, { useState } from 'react';
import { useConfig } from '../../hooks/useConfig';
import LoadingSpinner from '../common/LoadingSpinner';
import IndicatorSelector from './IndicatorSelector';
import './IndicatorForm.css';

const IndicatorForm = ({ onSubmit, loading }) => {
  const { config, loading: configLoading, error: configError } = useConfig();

  const [formData, setFormData] = useState({
    symbol: '',
    indicator: '',
    data_period: '6mo',
    interval: '1d',
    indicator_period: 14
  });

  // UI labels for periods (frontend responsibility)
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
    'ytd': 'Year to Date',
    'max': 'Maximum Available'
  };

  // UI labels for intervals (frontend responsibility)
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
    '3mo': '3 Months'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'indicator_period' ? parseInt(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (configLoading) {
    return (
      <div className="form-loading">
        <LoadingSpinner size="large" />
        <p>Loading configuration...</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="form-error">
        <p>Error loading configuration: {configError}</p>
      </div>
    );
  }

  return (
    <form className="indicator-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="symbol">Stock Symbol</label>
        <input
          type="text"
          id="symbol"
          name="symbol"
          value={formData.symbol}
          onChange={handleChange}
          placeholder="e.g., AAPL, TSLA, MSFT"
          required
        />
        <small>Enter the stock ticker symbol</small>
      </div>

      <div className="form-group">
        <label htmlFor="indicator">Technical Indicator</label>
        <IndicatorSelector
          value={formData.indicator}
          onChange={(value) => setFormData(prev => ({ ...prev, indicator: value }))}
          indicators={config?.indicators}
        />
        <small>Choose from 200+ technical indicators or search</small>
      </div>

      <div className="form-group">
        <label htmlFor="data_period">Data Period (Historical Range)</label>
        <select
          id="data_period"
          name="data_period"
          value={formData.data_period}
          onChange={handleChange}
          required
        >
          {config?.periods?.map(period => (
            <option key={period.value} value={period.value}>
              {periodLabels[period.value] || period.value}
            </option>
          ))}
        </select>
        <small>How much historical data to fetch</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="interval">Interval (Timeframe)</label>
          <select
            id="interval"
            name="interval"
            value={formData.interval}
            onChange={handleChange}
            required
          >
            {config?.intervals?.map(interval => (
              <option key={interval.value} value={interval.value}>
                {intervalLabels[interval.value] || interval.value}
                {interval.limitation ? ` (${interval.limitation})` : ''}
              </option>
            ))}
          </select>
          <small>Candle size (e.g., 1m, 5m, 1d)</small>
        </div>

        <div className="form-group">
          <label htmlFor="indicator_period">Indicator Period</label>
          <input
            type="number"
            id="indicator_period"
            name="indicator_period"
            value={formData.indicator_period}
            onChange={handleChange}
            min="1"
            max="200"
            required
          />
          <small>Lookback period for calculation</small>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? (
          <>
            <LoadingSpinner size="small" />
            <span>Calculating...</span>
          </>
        ) : (
          <span>Calculate Indicator</span>
        )}
      </button>
    </form>
  );
};

export default IndicatorForm;

