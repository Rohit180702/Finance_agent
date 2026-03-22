import { useEffect, useState, useRef, useCallback } from 'react';
import './News.css';
import { Loader2, Newspaper, ExternalLink, AlertCircle } from 'lucide-react';
import { getMarketNews } from '../services/newsApi';

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SkeletonCards({ count = 6 }) {
  return (
    <div className="nw-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="nw-skel-card">
          <div className="nw-skel-bar nw-skel-bar--med" />
          <div className="nw-skel-bar nw-skel-bar--short" />
        </div>
      ))}
    </div>
  );
}

function NewsCard({ item, style }) {
  const ago = timeAgo(item.pub_date);

  return (
    <a
      className="nw-card"
      href={item.url}
      target="_blank"
      rel="noreferrer"
      style={style}
    >
      {item.thumbnail && (
        <img
          className="nw-card-thumb"
          src={item.thumbnail}
          alt=""
          loading="lazy"
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
      <div className="nw-card-body">
        <p className="nw-card-title">{item.title}</p>
        {item.summary && <p className="nw-card-summary">{item.summary}</p>}
        <div className="nw-card-meta">
          {item.publisher && <span className="nw-publisher">{item.publisher}</span>}
          {item.publisher && ago && <span className="nw-dot">·</span>}
          {ago && <span className="nw-date">{ago}</span>}
          <ExternalLink size={11} className="nw-ext" />
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

  useEffect(() => { loadPage(0); }, []); // eslint-disable-line

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
    <div className="nw-page">

      {/* Header */}
      <div className="nw-header">
        <Newspaper size={20} className="nw-header-icon" />
        <h1 className="nw-title">Market News</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="nw-error">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Initial skeleton */}
      {initLoading ? (
        <SkeletonCards count={6} />
      ) : (
        <>
          <div className="nw-list">
            {news.map((item, i) => (
              <NewsCard
                key={item.id || i}
                item={item}
                style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}
              />
            ))}
          </div>

          <div ref={sentinelRef} className="nw-sentinel">
            {loading && (
              <div className="nw-load-more">
                <Loader2 size={16} className="spin" /> Loading more…
              </div>
            )}
            {!hasMore && news.length > 0 && (
              <p className="nw-end">You've reached the end of the news feed.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
