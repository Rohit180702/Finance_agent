import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };
const fmtCr = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L Cr`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
};

export default function ScreenerResult({ data }) {
  const stocks = data?.stocks;
  if (!stocks?.length) return null;

  return (
    <div className="tr-screener">
      <div className="tr-section-header">
        <Search size={16} />
        <span>Stock Screener — {data.total_matches} matches</span>
      </div>

      <div className="tr-table-wrap">
        <table className="tr-table">
          <thead>
            <tr>
              <th>Stock</th>
              <th>Price</th>
              <th>Mkt Cap</th>
              <th>P/E</th>
              <th>ROE</th>
              <th>D/E</th>
              <th>Margin</th>
              <th>Growth</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(s => (
              <tr key={s.symbol}>
                <td>
                  <Link to={`/stock/${s.symbol}`} className="tr-stock-link">
                    <span className="tr-stock-sym">{s.symbol?.replace('.NS', '')}</span>
                    <span className="tr-stock-name">{s.name}</span>
                  </Link>
                </td>
                <td>₹{fmt(s.price)}</td>
                <td>{fmtCr(s.market_cap_cr)}</td>
                <td>{fmt(s.pe)}</td>
                <td className={parseFloat(s.roe) > 15 ? 'positive' : ''}>{fmt(s.roe)}%</td>
                <td className={parseFloat(s.debt_equity) > 1.5 ? 'negative' : ''}>{fmt(s.debt_equity)}</td>
                <td>{fmt(s.net_margin)}%</td>
                <td className={parseFloat(s.revenue_growth) > 10 ? 'positive' : parseFloat(s.revenue_growth) < 0 ? 'negative' : ''}>
                  {fmt(s.revenue_growth)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.showing < data.total_matches && (
        <span className="tr-showing-note">Showing {data.showing} of {data.total_matches}</span>
      )}
    </div>
  );
}
