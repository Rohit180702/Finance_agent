import './ToolResults.css';
import FundamentalResult from './FundamentalResult';
import TechnicalResult from './TechnicalResult';
import SentimentResult from './SentimentResult';
import ScreenerResult from './ScreenerResult';

const TOOL_COMPONENT_MAP = {
  analyze_fundamentals: FundamentalResult,
  calculate_indicator: TechnicalResult,
  analyze_sentiment: SentimentResult,
  screen_stocks: ScreenerResult,
};

export default function ToolResultRenderer({ toolResults }) {
  if (!toolResults?.length) return null;

  return (
    <div className="tool-results-container">
      {toolResults.map((tr, i) => {
        const Component = TOOL_COMPONENT_MAP[tr.tool];
        if (!Component) return null;
        return <Component key={`${tr.tool}-${i}`} data={tr.data} />;
      })}
    </div>
  );
}

export { FundamentalResult, TechnicalResult, SentimentResult, ScreenerResult };
