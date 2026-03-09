import ReactMarkdown from 'react-markdown';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import './FundamentalResults.css';
import './FundamentalAnalysis.css';

// Parse markdown sections from the consolidated report based on analysis type
const getRelevantSection = (markdown = '', analysisType = 'all') => {
  // If 'all' or 'overview', return the full report
  if (analysisType === 'all') {
    return markdown;
  }

  // Split by h2 headers (##) - keep the header with each section
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = { header: '', content: [] };

  lines.forEach(line => {
    if (line.startsWith('## ')) {
      // Save previous section if it has content
      if (currentSection.header || currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = { header: line, content: [line] };
    } else {
      currentSection.content.push(line);
    }
  });

  // Don't forget the last section
  if (currentSection.header || currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  // Map analysis types to section headers - match exact headers from backend
  const sectionMap = {
    'ratios': ['## 🏢 Company Information', '## 📊 Key Ratios'],
    'balance_sheet': ['## 🏦 Balance Sheet'],
    'cashflow': ['## 💰 Cash Flow Analysis'],
    'income': ['## 📈 Profit & Loss']
  };

  const targetHeaders = sectionMap[analysisType] || [];

  // Filter sections that match our target headers
  const matchedSections = sections.filter(section =>
    targetHeaders.some(header => section.header === header)
  );

  // Join matched sections
  const relevantContent = matchedSections
    .map(section => section.content.join('\n'))
    .join('\n\n');

  // If no specific section found, return full report
  return relevantContent || markdown;
};

const FundamentalResults = ({ result, loading, analysisType = 'all' }) => {
  if (loading) {
    return (
      <div className="fundamental-loading">
        <Skeleton className="h-24" />
        <Skeleton className="h-36" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="No fundamental report yet"
        description="Select a stock and analysis view to generate financial commentary."
      />
    );
  }

  const content = getRelevantSection(result.response, analysisType);

  // Get a friendly title based on analysis type
  const getTitleForType = (type) => {
    const titles = {
      'all': 'Complete Financial Analysis',
      'ratios': 'Key Fundamental Ratios',
      'balance_sheet': 'Balance Sheet Analysis',
      'cashflow': 'Cash Flow Analysis',
      'income': 'Income Statement Analysis'
    };
    return titles[type] || 'Financial Analysis';
  };

  return (
    <div className="fundamental-results">
      <Card title="Summary" subtitle={`Generated for ${result.symbol}`}>
        <div className="summary-grid">
          <div className="summary-item">
            <span>Current View</span>
            <strong>{analysisType.replace('_', ' ')}</strong>
          </div>
          <div className="summary-item">
            <span>Timestamp</span>
            <strong>{new Date(result.timestamp).toLocaleString()}</strong>
          </div>
          <div className="summary-item">
            <span>Status</span>
            <strong>Completed</strong>
          </div>
        </div>
      </Card>

      <Card title={getTitleForType(analysisType)} subtitle="AI-generated financial insights">
        <div className="commentary-panel">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
};

export default FundamentalResults;
