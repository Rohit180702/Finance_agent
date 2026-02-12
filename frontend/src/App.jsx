import React, { useState } from 'react';
import Header from './components/common/Header';
import IndicatorForm from './components/TechnicalAnalysis/IndicatorForm';
import ResultCard from './components/TechnicalAnalysis/ResultCard';
import { useIndicator } from './hooks/useIndicator';
import './App.css';

function App() {
  const { calculate, loading, error, result } = useIndicator();
  const [showError, setShowError] = useState(false);

  const handleSubmit = async (formData) => {
    try {
      setShowError(false);
      await calculate(formData);
    } catch (err) {
      setShowError(true);
      console.error('Calculation error:', err);
    }
  };

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <div className="container">
          <div className="content-wrapper">
            <IndicatorForm onSubmit={handleSubmit} loading={loading} />
            
            {showError && error && (
              <div className="error-message">
                <span className="error-icon">❌</span>
                <span>{error}</span>
              </div>
            )}
            
            <ResultCard result={result} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

