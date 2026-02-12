import React from 'react';
import './ResultCard.css';

const ResultCard = ({ result }) => {
  if (!result) return null;

  const { response, params, warning } = result;
  const timestamp = new Date().toLocaleString();

  return (
    <div className="result-card">
      <div className="result-header">
        <div className="result-title">Analysis Result</div>
        <div className="result-badge">{timestamp}</div>
      </div>

      {warning && (
        <div className="result-warning">
          <span className="warning-icon">⚠️</span>
          {warning}
        </div>
      )}

      <div className="result-content">{response}</div>

      {params && (
        <div className="result-meta">
          <div className="meta-item">
            <span className="meta-label">Symbol</span>
            <span className="meta-value">{params.symbol}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Indicator</span>
            <span className="meta-value">{params.indicator?.toUpperCase()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Interval</span>
            <span className="meta-value">{params.interval}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Data Period</span>
            <span className="meta-value">{params.data_period}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Indicator Period</span>
            <span className="meta-value">{params.indicator_period}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;

