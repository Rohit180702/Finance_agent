import { Link } from 'react-router-dom';
import { Star, SlidersHorizontal } from 'lucide-react';
import WatchlistCard from '../components/Watchlist/WatchlistCard';
import './WatchlistPage.css';

const WatchlistPage = () => (
  <div className="wl-page">
    <div className="wl-page-header">
      <div>
        <h2 className="wl-page-title">
          <Star size={20} /> Watchlist
        </h2>
        <p className="wl-page-sub">
          Track your stocks across multiple lists. Prices refresh every 60 seconds.
        </p>
      </div>
      <Link to="/screener" className="wl-screener-link">
        <SlidersHorizontal size={14} /> Browse Screener
      </Link>
    </div>

    <WatchlistCard />
  </div>
);

export default WatchlistPage;
