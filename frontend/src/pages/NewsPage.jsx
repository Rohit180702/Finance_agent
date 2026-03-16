import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, Newspaper, ExternalLink, AlertCircle } from 'lucide-react';
import { getMarketNews } from '../services/newsApi';

function NewsCard({ item }) {
  const date = item.pub_date
    ? new Date(item.pub_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : null;

  return (
    <a className="np-card" href={item.url} target="_blank" rel="noreferrer">
      {item.thumbnail && (
        <img className="np-card-thumb" src={item.thumbnail} alt="" loading="lazy" />
      )}
      <div className="np-card-body">
        <p className="np-card-title">{item.title}</p>
        {item.summary && <p className="np-card-summary">{item.summary}</p>}
        <div className="np-card-meta">
          {item.publisher && <span className="np-publisher">{item.publisher}</span>}
          {date && <span className="np-date">{date}</span>}
          <ExternalLink size={11} className="np-ext" />
        </div>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const [news,        setNews]        = useState([]);
  const [page,        setPage]        = useState(0);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error,       setError]       = useState(null);
  const sentinelRef = useRef(null);
  const seenTitles  = useRef(new Set());

  const loadPage = useCallback(async (p) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const d = await getMarketNews(p);
      const fresh = (d.news || []).filter(item => {
        const key = item.title?.toLowerCase().trim();
        if (!key || seenTitles.current.has(key)) return false;
        seenTitles.current.add(key);
        return true;
      });
      setNews(prev => [...prev, ...fresh]);
      setHasMore(d.has_more);
      setPage(p);
    } catch {
      setError('Could not load news. Please try again.');
    } finally {
      setLoading(false);
      setInitLoading(false);
    }
  }, [loading]);

  // Initial load
  useEffect(() => { loadPage(0); }, []); // eslint-disable-line

  // IntersectionObserver — load next page when sentinel enters view
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPage(page + 1);
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, page, loadPage]);

  return (
    <div className="np-page">
      <div className="np-header">
        <div className="np-header-left">
          <Newspaper size={20} />
          <h1 className="np-title">Market News</h1>
        </div>
      </div>

      {error && (
        <div className="np-error">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {initLoading ? (
        <div className="np-loading">
          <Loader2 size={28} className="spin" />
          <p>Fetching latest market news…</p>
        </div>
      ) : (
        <>
          <div className="np-list">
            {news.map((item, i) => <NewsCard key={item.id || i} item={item} />)}
          </div>

          {/* sentinel — triggers next page load */}
          <div ref={sentinelRef} className="np-sentinel">
            {loading && (
              <div className="np-load-more">
                <Loader2 size={18} className="spin" /> Loading more…
              </div>
            )}
            {!hasMore && news.length > 0 && (
              <p className="np-end">You've reached the end of the news feed.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
