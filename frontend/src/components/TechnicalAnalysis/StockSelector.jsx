import { useState, useMemo, useEffect } from 'react';
import './StockSelector.css';

const StockSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stocks, setStocks] = useState({ popular: [], all: [] });
  const [loading, setLoading] = useState(true);

  // Load stocks on mount
  useEffect(() => {
    const loadStocks = async () => {
      try {
        setLoading(true);
        
        // Fetch popular stocks (NIFTY 50)
        const popularResponse = await fetch('http://localhost:8000/api/v1/stocks/popular');
        const popularData = await popularResponse.json();
        
        // Fetch all stocks
        const allResponse = await fetch('http://localhost:8000/api/v1/stocks/all');
        const allData = await allResponse.json();
        
        setStocks({
          popular: popularData.stocks || [],
          all: allData.stocks || []
        });
      } catch (error) {
        console.error('Error loading stocks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
  }, []);

  // Get selected stock label
  const selectedLabel = useMemo(() => {
    if (!value) return 'Select stock...';
    
    // Search in all stocks
    const allStocks = [...stocks.popular, ...stocks.all];
    const found = allStocks.find(stock => 
      stock.symbol === value || stock.nse_symbol === value
    );
    
    if (found) {
      return `${found.nse_symbol} - ${found.name}`;
    }
    
    return value;
  }, [value, stocks]);

  // Filter stocks based on search term
  const filteredStocks = useMemo(() => {
    if (!searchTerm) {
      return { popular: stocks.popular, all: [] };
    }

    const term = searchTerm.toLowerCase();
    const filtered = stocks.all.filter(stock => 
      stock.symbol.toLowerCase().includes(term) || 
      stock.nse_symbol.toLowerCase().includes(term) ||
      stock.name.toLowerCase().includes(term)
    );

    return { popular: [], all: filtered.slice(0, 50) }; // Limit to 50 results
  }, [stocks, searchTerm]);

  const handleSelect = (stock) => {
    onChange(stock.symbol); // Pass the full symbol with .NS suffix
    setIsOpen(false);
    setSearchTerm('');
  };

  if (loading) {
    return <div className="stock-selector-loading">Loading stocks...</div>;
  }

  return (
    <div className="stock-selector">
      <div 
        className="stock-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
        <span className="stock-selector-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="stock-selector-dropdown">
          <div className="stock-selector-search">
            <input
              type="text"
              placeholder="🔍 Search 2200+ NSE stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          <div className="stock-selector-content">
            {/* Popular Stocks Section (NIFTY 50) */}
            {filteredStocks.popular.length > 0 && (
              <div className="stock-section">
                <div className="stock-section-header">⭐ NIFTY 50</div>
                {filteredStocks.popular.map(stock => (
                  <div
                    key={stock.symbol}
                    className={`stock-item ${value === stock.symbol ? 'selected' : ''}`}
                    onClick={() => handleSelect(stock)}
                  >
                    <div className="stock-item-symbol">{stock.nse_symbol}</div>
                    <div className="stock-item-name">{stock.name}</div>
                    {stock.sector && <div className="stock-item-sector">{stock.sector}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            {filteredStocks.popular.length > 0 && filteredStocks.all.length > 0 && (
              <div className="stock-divider"></div>
            )}

            {/* Search Results */}
            {filteredStocks.all.length > 0 && (
              <div className="stock-section">
                <div className="stock-section-header">
                  📊 SEARCH RESULTS ({filteredStocks.all.length})
                </div>
                {filteredStocks.all.map(stock => (
                  <div
                    key={stock.symbol}
                    className={`stock-item ${value === stock.symbol ? 'selected' : ''}`}
                    onClick={() => handleSelect(stock)}
                  >
                    <div className="stock-item-symbol">{stock.nse_symbol}</div>
                    <div className="stock-item-name">{stock.name}</div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {filteredStocks.popular.length === 0 && filteredStocks.all.length === 0 && searchTerm && (
              <div className="stock-no-results">
                No stocks found for "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSelector;

