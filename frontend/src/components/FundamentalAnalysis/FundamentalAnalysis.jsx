import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import { useFundamental } from '../../hooks/useFundamental';
import FundamentalForm from './FundamentalForm';
import FundamentalResults from './FundamentalResults';

const FundamentalAnalysis = () => {
  const { loading, error, result, analyze, isCached } = useFundamental();
  const [analysisType, setAnalysisType] = useState('all');
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [searchParams] = useSearchParams();

  // If navigated from screener with ?symbol=XYZ.NS, auto-run analysis
  useEffect(() => {
    const sym = searchParams.get('symbol');
    if (sym) {
      setCurrentSymbol(sym);
      analyze(sym, 'all');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalysisTypeChange = (newType) => {
    setAnalysisType(newType);
  };

  const handleSubmit = async (formData) => {
    setCurrentSymbol(formData.symbol);
    await analyze(formData.symbol, analysisType);
  };

  return (
    <section className="fundamental-layout">
      <Card title="Configuration" subtitle="Select stock and analysis lens.">
        <FundamentalForm
          loading={loading}
          analysisType={analysisType}
          onAnalysisTypeChange={handleAnalysisTypeChange}
          onSubmit={handleSubmit}
          isCached={currentSymbol ? isCached(currentSymbol, analysisType) : false}
          defaultSymbol={searchParams.get('symbol') || ''}
        />
      </Card>

      {error && <ErrorState title="Fundamental analysis failed" message={error} />}

      <FundamentalResults
        result={result}
        loading={loading}
        analysisType={analysisType}
      />
    </section>
  );
};

export default FundamentalAnalysis;
