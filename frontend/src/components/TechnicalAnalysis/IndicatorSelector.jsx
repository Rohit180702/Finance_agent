import { useEffect, useMemo, useRef, useState } from 'react';

const IndicatorSelector = ({ value, onChange, indicators }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedLabel = useMemo(() => {
    if (!value || !indicators) return 'Select indicator';

    const groups = [...Object.values(indicators.popular || {}), ...Object.values(indicators.all || {})];
    const item = groups.flat().find((entry) => entry.value === value);
    return item?.label || value;
  }, [value, indicators]);

  const filtered = useMemo(() => {
    if (!indicators) return { popular: {}, all: {} };
    if (!search.trim()) return indicators;

    const term = search.toLowerCase();
    const filterCategory = (source = {}) => {
      const result = {};
      Object.entries(source).forEach(([category, items]) => {
        const subset = items.filter(
          (item) => item.value.toLowerCase().includes(term) || item.label.toLowerCase().includes(term),
        );
        if (subset.length) result[category] = subset;
      });
      return result;
    };

    return {
      popular: filterCategory(indicators.popular),
      all: filterCategory(indicators.all),
    };
  }, [indicators, search]);

  const renderCategory = (title, categories) => {
    const entries = Object.entries(categories || {});
    if (!entries.length) return null;

    return (
      <div className="selector-group">
        <p className="selector-section-label">{title}</p>
        {entries.map(([category, items]) => (
          <div key={category} className="selector-category">
            <h4>{category}</h4>
            <div className="selector-tag-grid">
              {items.map((indicator) => (
                <button
                  type="button"
                  key={indicator.value}
                  className={`selector-tag ${value === indicator.value ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(indicator.value);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  {indicator.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="selector" ref={containerRef}>
      <button type="button" className="selector-trigger" onClick={() => setOpen((prev) => !prev)}>
        <span>{selectedLabel}</span>
        <span className={`selector-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="selector-dropdown indicator-dropdown" role="listbox">
          <div className="selector-search-wrap">
            <input
              className="selector-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search indicators"
              autoFocus
            />
          </div>
          <div className="selector-list">
            {renderCategory('Popular', filtered.popular)}
            {renderCategory('All Indicators', filtered.all)}
            {!Object.keys(filtered.popular || {}).length && !Object.keys(filtered.all || {}).length && (
              <p className="selector-empty">No indicators matched your search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicatorSelector;
