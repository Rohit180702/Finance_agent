import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Chat from './components/Chat/Chat';
import IndicatorForm from './components/TechnicalAnalysis/IndicatorForm';
import ResultCard from './components/TechnicalAnalysis/ResultCard';
import FundamentalAnalysis from './components/FundamentalAnalysis/FundamentalAnalysis';
import SentimentAnalysis from './components/SentimentAnalysis/SentimentAnalysis';
import Card from './components/ui/Card';
import ErrorState from './components/ui/ErrorState';
import { useIndicator } from './hooks/useIndicator';
import './App.css';

function App() {
  const { calculate, loading, error, result } = useIndicator();
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSubmit = async (formData) => {
    await calculate(formData);
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <TopBar activeTab={activeTab} onMenuClick={() => setSidebarOpen(true)} />

        <main className="app-content">
          {activeTab === 'chat' && <Chat />}

          {activeTab === 'technical' && (
            <section className="technical-grid">
              <Card
                title="Configuration"
                subtitle="Set stock, indicator, and timeframe parameters."
              >
                <IndicatorForm onSubmit={handleSubmit} loading={loading} />
              </Card>

              <Card title="Result" subtitle="Indicator output, context, and calculation metadata.">
                {error && (
                  <ErrorState
                    title="Calculation failed"
                    message={error}
                  />
                )}
                <ResultCard result={result} loading={loading} />
              </Card>
            </section>
          )}

          {activeTab === 'fundamental' && <FundamentalAnalysis />}

          {activeTab === 'sentiment' && <SentimentAnalysis />}
        </main>
      </div>
    </div>
  );
}

export default App;
