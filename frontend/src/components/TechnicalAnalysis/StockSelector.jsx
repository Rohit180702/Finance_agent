import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const StockSelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stocks, setStocks] = useState({ popular: [], all: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        setLoading(true);
        const [popularRes, allRes] = await Promise.all([
          fetch(`${API_BASE_URL}/stocks/popular`),
          fetch(`${API_BASE_URL}/stocks/all`),
        ]);

        const popular = await popularRes.json();
        const all = await allRes.json();

        console.log('📊 Stocks loaded:', {
          popularCount: popular.stocks?.length || 0,
          allCount: all.stocks?.length || 0,
          popularSample: popular.stocks?.[0],
          allSample: all.stocks?.[0],
        });

        setStocks({
          popular: popular.stocks || [],
          all: all.stocks || [],
        });
      } catch (err) {
        console.error('❌ Failed to load stocks:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedStock = useMemo(() => {
    const allStocks = [...stocks.popular, ...stocks.all];
    return allStocks.find((item) => item.symbol === value || item.nse_symbol === value);
  }, [stocks, value]);

  const filteredStocks = useMemo(() => {
    if (!search.trim()) {
      const result = {
        popular: stocks.popular.slice(0, 12),
        all: stocks.all.slice(0, 30),
      };
      console.log('🔍 Filtered stocks (no search):', {
        popularCount: result.popular.length,
        allCount: result.all.length,
      });
      return result;
    }

    const term = search.trim().toLowerCase();
    const allResults = stocks.all.filter((item) =>
      [item.symbol, item.nse_symbol, item.name].some((field) => field?.toLowerCase().includes(term)),
    );

    const result = {
      popular: [],
      all: allResults.slice(0, 40),
    };
    console.log('🔍 Filtered stocks (search:', term, '):', {
      allCount: result.all.length,
    });
    return result;
  }, [stocks, search]);

  const selectedLabel = selectedStock
    ? `${selectedStock.nse_symbol} - ${selectedStock.name}`
    : 'Select stock';

  return (
    <div className="selector" ref={containerRef}>
      <button
        type="button"
        className="selector-trigger"
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading}
      >
        <span>{loading ? 'Loading stocks...' : selectedLabel}</span>
        <span className={`selector-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="selector-dropdown" role="listbox">
          <div className="selector-search-wrap">
            <input
              className="selector-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by symbol or company"
              autoFocus
            />
          </div>

          <div className="selector-list">
            {!search && filteredStocks.popular.length > 0 && (
              <>
                <div className="selector-section-label">Popular</div>
                {filteredStocks.popular.map((stock) => (
                  <button
                    type="button"
                    key={stock.symbol}
                    className={`selector-item ${value === stock.symbol ? 'is-selected' : ''}`}
                    onClick={() => {
                      onChange(stock.symbol);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    <span>{stock.nse_symbol}</span>
                    <small>{stock.name}</small>
                  </button>
                ))}
              </>
            )}

            {filteredStocks.all.length > 0 && (
              <>
                <div className="selector-section-label">All Stocks</div>
                {filteredStocks.all.map((stock) => (
                  <button
                    type="button"
                    key={stock.symbol}
                    className={`selector-item ${value === stock.symbol ? 'is-selected' : ''}`}
                    onClick={() => {
                      onChange(stock.symbol);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    <span>{stock.nse_symbol}</span>
                    <small>{stock.name}</small>
                  </button>
                ))}
              </>
            )}

            {filteredStocks.popular.length === 0 && filteredStocks.all.length === 0 && (
              <p className="selector-empty">No stocks matched your search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSelector;
