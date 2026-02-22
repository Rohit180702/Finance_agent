import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import { useFundamental } from '../../hooks/useFundamental';
import FundamentalForm from './FundamentalForm';
import FundamentalResults from './FundamentalResults';

const FundamentalAnalysis = () => {
  const { loading, error, result, analyze } = useFundamental();

  return (
    <section className="fundamental-layout">
      <Card title="Configuration" subtitle="Select stock and analysis lens.">
        <FundamentalForm
          loading={loading}
          onSubmit={async (formData) => {
            await analyze(formData.symbol, formData.analysisType);
          }}
        />
      </Card>

      {error && <ErrorState title="Fundamental analysis failed" message={error} />}

      <FundamentalResults result={result} loading={loading} />
    </section>
  );
};

export default FundamentalAnalysis;
