import { useState, useMemo } from 'react';
import './IndicatorSelector.css';

const IndicatorSelector = ({ value, onChange, indicators }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get selected indicator label
  const selectedLabel = useMemo(() => {
    if (!value || !indicators) return 'Select indicator...';
    
    // Search in popular indicators
    for (const category of Object.values(indicators.popular || {})) {
      const found = category.find(ind => ind.value === value);
      if (found) return found.label;
    }
    
    // Search in all indicators
    for (const category of Object.values(indicators.all || {})) {
      const found = category.find(ind => ind.value === value);
      if (found) return found.label;
    }
    
    return value;
  }, [value, indicators]);

  // Filter indicators based on search term
  const filteredIndicators = useMemo(() => {
    if (!indicators) return { popular: {}, all: {} };
    if (!searchTerm) return indicators;

    const term = searchTerm.toLowerCase();
    const filterCategory = (categoryObj) => {
      const filtered = {};
      for (const [catName, items] of Object.entries(categoryObj)) {
        const matchingItems = items.filter(ind => 
          ind.value.toLowerCase().includes(term) || 
          ind.label.toLowerCase().includes(term)
        );
        if (matchingItems.length > 0) {
          filtered[catName] = matchingItems;
        }
      }
      return filtered;
    };

    return {
      popular: filterCategory(indicators.popular || {}),
      all: filterCategory(indicators.all || {})
    };
  }, [indicators, searchTerm]);

  const handleSelect = (indicatorValue) => {
    onChange(indicatorValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (!indicators) {
    return <div className="indicator-selector-loading">Loading indicators...</div>;
  }

  return (
    <div className="indicator-selector">
      <div 
        className="indicator-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
        <span className="indicator-selector-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="indicator-selector-dropdown">
          <div className="indicator-selector-search">
            <input
              type="text"
              placeholder="🔍 Search 200+ indicators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="indicator-selector-content">
            {/* Popular Indicators Section */}
            {Object.keys(filteredIndicators.popular).length > 0 && (
              <div className="indicator-section">
                <div className="indicator-section-header">📌 POPULAR</div>
                {Object.entries(filteredIndicators.popular).map(([category, items]) => (
                  <div key={category} className="indicator-category">
                    <div className="indicator-category-name">{category}</div>
                    {items.map(indicator => (
                      <div
                        key={indicator.value}
                        className={`indicator-item ${value === indicator.value ? 'selected' : ''}`}
                        onClick={() => handleSelect(indicator.value)}
                      >
                        {indicator.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            {Object.keys(filteredIndicators.popular).length > 0 && 
             Object.keys(filteredIndicators.all).length > 0 && (
              <div className="indicator-divider"></div>
            )}

            {/* All Indicators Section */}
            {Object.keys(filteredIndicators.all).length > 0 && (
              <div className="indicator-section">
                <div className="indicator-section-header">
                  📚 ALL INDICATORS ({Object.values(filteredIndicators.all).reduce((sum, items) => sum + items.length, 0)})
                </div>
                {Object.entries(filteredIndicators.all).map(([category, items]) => (
                  <div key={category} className="indicator-category">
                    <div className="indicator-category-name">{category} ({items.length})</div>
                    {items.map(indicator => (
                      <div
                        key={indicator.value}
                        className={`indicator-item ${value === indicator.value ? 'selected' : ''}`}
                        onClick={() => handleSelect(indicator.value)}
                      >
                        {indicator.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {Object.keys(filteredIndicators.popular).length === 0 && 
             Object.keys(filteredIndicators.all).length === 0 && (
              <div className="indicator-no-results">
                No indicators found for "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicatorSelector;

