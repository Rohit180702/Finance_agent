import { useMemo } from 'react';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import './TechnicalChart.css';

/* ─── helpers ─────────────────────────────────────────────── */

const fmtPrice = (v) =>
  v == null ? '--' : v >= 1000 ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : v.toFixed(2);

const fmtVol = (v) => {
  if (v == null) return '--';
  if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L';
  return v.toLocaleString();
};

const fmtDate = (d) => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length < 3) return d;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(parts[1], 10) - 1]} ${parts[2]}`;
};

/* ─── custom candlestick bar ──────────────────────────────── */

const makeCandleShape = (priceDomain) =>
  function CandleShape({ x, width, background, payload }) {
    if (!payload || !background || background.height <= 0) return null;
    const { open, high, low, close } = payload;
    const [minP, maxP] = priceDomain;
    const range = maxP - minP;
    if (range === 0) return null;

    const toY = (price) =>
      background.y + background.height * (1 - (price - minP) / range);

    const highY  = toY(high);
    const lowY   = toY(low);
    const openY  = toY(open);
    const closeY = toY(close);

    const isUp    = close >= open;
    const fill    = isUp ? '#10b981' : '#ef4444';
    const bodyTop = Math.min(openY, closeY);
    const bodyH   = Math.max(Math.abs(closeY - openY), 1.5);
    const wickX   = x + width / 2;
    const bw      = Math.max(width - 2, 1);

    return (
      <g>
        <line x1={wickX} y1={highY} x2={wickX} y2={lowY} stroke={fill} strokeWidth={1} />
        <rect
          x={x + 1}
          y={bodyTop}
          width={bw}
          height={bodyH}
          fill={fill}
          fillOpacity={0.9}
        />
      </g>
    );
  };

/* ─── custom tooltips ─────────────────────────────────────── */

const OHLCTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;
  return (
    <div className="tc-tooltip">
      <p className="tc-tooltip-date">{label}</p>
      <p className="tc-tooltip-row"><span>O</span><span>{fmtPrice(d.open)}</span></p>
      <p className="tc-tooltip-row"><span>H</span><span>{fmtPrice(d.high)}</span></p>
      <p className="tc-tooltip-row"><span>L</span><span>{fmtPrice(d.low)}</span></p>
      <p className={`tc-tooltip-row ${isUp ? 'up' : 'dn'}`}>
        <span>C</span><span>{fmtPrice(d.close)}</span>
      </p>
      <p className="tc-tooltip-row muted"><span>Vol</span><span>{fmtVol(d.volume)}</span></p>
    </div>
  );
};

const IndicatorTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tc-tooltip">
      <p className="tc-tooltip-date">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="tc-tooltip-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{p.value != null ? Number(p.value).toFixed(2) : '--'}</span>
        </p>
      ))}
    </div>
  );
};

/* ─── indicator colour palette ────────────────────────────── */

const IND_COLORS = ['#818cf8', '#f59e0b', '#10b981', '#f43f5e', '#38bdf8'];

/* ─── friendly column name ────────────────────────────────── */

const friendlyCol = (col) => {
  if (/MACD_/.test(col))  return 'MACD';
  if (/MACDs_/.test(col)) return 'Signal';
  if (/MACDh_/.test(col)) return 'Hist';
  if (/BBU_/.test(col))   return 'Upper';
  if (/BBM_/.test(col))   return 'Mid';
  if (/BBL_/.test(col))   return 'Lower';
  if (/RSI_/.test(col))   return 'RSI';
  if (/SMA_/.test(col))   return 'SMA';
  if (/EMA_/.test(col))   return 'EMA';
  return col.split('_')[0];
};

/* ─── main component ──────────────────────────────────────── */

const TechnicalChart = ({ chartData }) => {
  const {
    ohlcv = [],
    indicator_series = [],
    indicator_columns = [],
    indicator_type = 'oscillator',
    indicator,
  } = chartData;

  /* merge OHLCV + indicator by date */
  const mergedData = useMemo(() => {
    const indMap = {};
    indicator_series.forEach((d) => { indMap[d.date] = d; });
    return ohlcv.map((d) => ({
      ...d,
      ...(indMap[d.date] || {}),
      label: fmtDate(d.date),
    }));
  }, [ohlcv, indicator_series]);

  /* price domain (with 3 % headroom) */
  const priceDomain = useMemo(() => {
    if (!ohlcv.length) return ['auto', 'auto'];
    const lows  = ohlcv.map((d) => d.low);
    const highs = ohlcv.map((d) => d.high);
    const lo = Math.min(...lows);
    const hi = Math.max(...highs);
    const pad = (hi - lo) * 0.03;
    return [lo - pad, hi + pad];
  }, [ohlcv]);


  /* candlestick shape memoised over priceDomain */
  const CandleShape = useMemo(() => makeCandleShape(priceDomain), [priceDomain]);

  /* indicator specifics */
  const isOverlay = indicator_type === 'overlay' || indicator_type === 'bbands';
  const isMacd    = indicator_type === 'macd';
  const histCol   = indicator_columns.find((c) => /MACDh_/.test(c));
  const linesCols = indicator_columns.filter((c) => !/MACDh_/.test(c));

  /* RSI reference levels */
  const isRsi = indicator?.toLowerCase() === 'rsi';

  /* shared axis tick style */
  const tickStyle = { fontSize: 10, fill: '#6b7280' };

  /* X-axis interval to avoid crowding */
  const xInterval = Math.max(Math.floor(mergedData.length / 8) - 1, 0);

  if (!ohlcv.length) return null;

  return (
    <div className="tc-wrap">

      {/* ── price chart ── */}
      <div className="tc-label">Price</div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={mergedData} syncId="tech" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="label" tick={tickStyle} interval={xInterval} axisLine={false} tickLine={false} />
          <YAxis
            domain={priceDomain}
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={58}
            tickFormatter={fmtPrice}
            orientation="right"
          />
          <Tooltip content={<OHLCTooltip />} />

          {/* candlestick bars — dataKey="close" provides x-positions; shape does all rendering */}
          <Bar dataKey="close" shape={CandleShape} isAnimationActive={false} />

          {/* overlay indicators (SMA, EMA, BBands) drawn on top of price */}
          {isOverlay && indicator_columns.map((col, i) => (
            <Line
              key={col}
              type="monotone"
              dataKey={col}
              stroke={IND_COLORS[i % IND_COLORS.length]}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
              name={friendlyCol(col)}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* ── volume chart ── */}
      <div className="tc-label tc-label-sm">Volume</div>
      <ResponsiveContainer width="100%" height={55}>
        <BarChart data={mergedData} syncId="tech" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" hide />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={58} tickFormatter={fmtVol} orientation="right" />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="tc-tooltip">
                  <p className="tc-tooltip-row muted">
                    <span>Vol</span>
                    <span>{fmtVol(payload[0]?.payload?.volume)}</span>
                  </p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="volume" isAnimationActive={false}>
            {mergedData.map((entry, i) => (
              <Cell key={i} fill={entry.close >= entry.open ? '#10b981' : '#ef4444'} fillOpacity={0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* ── oscillator / MACD panel ── */}
      {!isOverlay && (
        <>
          <div className="tc-label tc-label-sm">{indicator?.toUpperCase()}</div>
          <ResponsiveContainer width="100%" height={120}>
            <ComposedChart data={mergedData} syncId="tech" margin={{ top: 0, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="label" tick={tickStyle} interval={xInterval} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={58} orientation="right" />
              <Tooltip content={<IndicatorTooltip />} />

              {isRsi && (
                <>
                  <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
                  <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1} />
                  <ReferenceLine y={50} stroke="#374151" strokeDasharray="2 4" strokeWidth={1} />
                </>
              )}

              {isMacd && histCol && (
                <Bar
                  dataKey={histCol}
                  isAnimationActive={false}
                  name="Hist"
                  fill="#818cf8"
                  fillOpacity={0.6}
                />
              )}

              {(isMacd ? linesCols : indicator_columns).map((col, i) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={IND_COLORS[i % IND_COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  name={friendlyCol(col)}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}

      {/* legend row */}
      <div className="tc-legend">
        {isOverlay || isMacd ? (
          indicator_columns.map((col, i) => (
            <span key={col} className="tc-legend-item">
              <span className="tc-legend-dot" style={{ background: IND_COLORS[i % IND_COLORS.length] }} />
              {friendlyCol(col)}
            </span>
          ))
        ) : null}
        {isRsi && (
          <>
            <span className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#f59e0b' }} />Overbought (70)</span>
            <span className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#10b981' }} />Oversold (30)</span>
          </>
        )}
      </div>
    </div>
  );
};

export default TechnicalChart;
