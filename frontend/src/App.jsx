import React, { useState } from 'react';
import Header from './components/common/Header';
import Chat from './components/Chat/Chat';
import IndicatorForm from './components/TechnicalAnalysis/IndicatorForm';
import ResultCard from './components/TechnicalAnalysis/ResultCard';
import { useIndicator } from './hooks/useIndicator';
import './App.css';

function App() {
  const { calculate, loading, error, result } = useIndicator();
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'technical'

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

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`tab-button ${activeTab === 'technical' ? 'active' : ''}`}
          onClick={() => setActiveTab('technical')}
        >
          📊 Technical Analysis
        </button>
      </div>

      <main className="main-content">
        {activeTab === 'chat' ? (
          <Chat />
        ) : (
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
        )}
      </main>
    </div>
  );
}

export default App;

