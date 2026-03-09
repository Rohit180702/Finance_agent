import { useState } from 'react';
import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import { useFundamental } from '../../hooks/useFundamental';
import FundamentalForm from './FundamentalForm';
import FundamentalResults from './FundamentalResults';

const FundamentalAnalysis = () => {
  const { loading, error, result, analyze } = useFundamental();
  const [analysisType, setAnalysisType] = useState('all');

  return (
    <section className="fundamental-layout">
      <Card title="Configuration" subtitle="Select stock and analysis lens.">
        <FundamentalForm
          loading={loading}
          analysisType={analysisType}
          onAnalysisTypeChange={setAnalysisType}
          onSubmit={async (formData) => {
            // Always run full analysis to get all data
            await analyze(formData.symbol, 'all');
          }}
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
