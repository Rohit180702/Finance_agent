import { Link } from 'react-router-dom';
import { Star, SlidersHorizontal } from 'lucide-react';
import WatchlistCard from '../components/Watchlist/WatchlistCard';
import './Dashboard.css';

const WatchlistPage = () => (
  <div className="watchlist-page">
    <div className="watchlist-page-header">
      <div>
        <h2 className="watchlist-page-title">
          <Star size={18} className="watchlist-page-icon" /> Watchlist
        </h2>
        <p className="watchlist-page-sub">
          Track your stocks across multiple lists. Prices refresh every 60 seconds.
        </p>
      </div>
      <Link to="/screener" className="watchlist-add-btn">
        <SlidersHorizontal size={14} /> Browse Screener
      </Link>
    </div>

    <WatchlistCard />
  </div>
);

export default WatchlistPage;
