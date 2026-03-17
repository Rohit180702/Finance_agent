import { useIndicator } from '../hooks/useIndicator';
import './TechnicalPage.css';
import Card from '../components/ui/Card';
import ErrorState from '../components/ui/ErrorState';
import IndicatorForm from '../components/TechnicalAnalysis/IndicatorForm';
import ResultCard from '../components/TechnicalAnalysis/ResultCard';

const TechnicalPage = () => {
  const { calculate, loading, error, result } = useIndicator();

  return (
    <section className="technical-grid">
      <Card title="Configuration" subtitle="Set stock, indicator, and timeframe parameters.">
        <IndicatorForm onSubmit={calculate} loading={loading} />
      </Card>
      <Card title="Result" subtitle="Indicator output, context, and calculation metadata.">
        {error && <ErrorState title="Calculation failed" message={error} />}
        <ResultCard result={result} loading={loading} />
      </Card>
    </section>
  );
};

export default TechnicalPage;
