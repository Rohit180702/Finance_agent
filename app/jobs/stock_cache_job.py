"""
Background job: pre-fetch fundamental metrics for all NSE stocks and persist them.

Write path (dual-write):
  1. Postgres  → stock_metrics_history  (permanent, queryable history)
  2. Redis     → stock_metrics:<symbol> (25-hour hot cache for fast screener reads)

Schedule: daily at 06:00 IST (before market opens) + once at cold startup.

Redis key schema:
  stock_metrics:<SYMBOL.NS>  →  JSON string of metric dict
  stock_metrics:__meta__     →  JSON with last_run, total, ok, failed, duration_s
"""

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

import yfinance as yf
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.redis_client import get_redis_client
from app.db.engine import SyncSessionLocal
from app.db.models import StockMetricsHistory
from app.services.stock_service import get_all_stocks

logger = logging.getLogger(__name__)

CACHE_TTL    = 25 * 3600   # Redis TTL: 25 hours
BATCH_SIZE   = 8            # concurrent threads — keep low to avoid Yahoo 401s
BATCH_DELAY  = 1.0          # seconds between waves
REDIS_PREFIX = "stock_metrics"
MAX_RETRIES  = 2            # retry 401s once before giving up


# ── Single-stock fetch (runs inside thread pool) ───────────────────────────────

def _to_float(v) -> float | None:
    """Coerce a yfinance value to float, returning None for non-numeric types."""
    if v is None:
        return None
    try:
        f = float(v)
        return None if (f != f) else f   # reject NaN
    except (TypeError, ValueError):
        return None


def _fetch_one(symbol: str, name: str, sector: str) -> dict | None:
    for attempt in range(MAX_RETRIES + 1):
        try:
            info = yf.Ticker(symbol).info

            def pct(key):
                v = _to_float(info.get(key))
                return round(v * 100, 2) if v is not None else None

            market_cap = _to_float(info.get("marketCap"))
            price      = _to_float(info.get("currentPrice") or info.get("regularMarketPrice"))

            return {
                "symbol":           symbol,
                "name":             name,
                "sector":           sector,
                "price":            price,
                "market_cap_cr":    round(market_cap / 1e7, 2) if market_cap else None,
                "pe":               _to_float(info.get("trailingPE")),
                "pb":               _to_float(info.get("priceToBook")),
                "roe":              pct("returnOnEquity"),
                "roa":              pct("returnOnAssets"),
                "debt_equity":      _to_float(info.get("debtToEquity")),
                "net_margin":       pct("profitMargins"),
                "revenue_growth":   pct("revenueGrowth"),
                "dividend_yield":   pct("dividendYield"),
                "week52_high":      _to_float(info.get("fiftyTwoWeekHigh")),
                "week52_low":       _to_float(info.get("fiftyTwoWeekLow")),
            }
        except Exception as exc:
            err = str(exc)
            if ("401" in err or "Unauthorized" in err) and attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)   # 1s, 2s back-off
                continue
            logger.debug("Failed %s (attempt %d): %s", symbol, attempt + 1, exc)
            return None
    return None


# ── Postgres bulk upsert (one INSERT … ON CONFLICT DO UPDATE per wave) ─────────

def _upsert_to_postgres(records: list[dict], snapshot_date: date) -> int:
    """
    Upsert a batch of metric dicts into stock_metrics_history.
    Returns the number of rows successfully upserted.
    """
    if not records:
        return 0

    rows = [
        {
            "symbol":          r["symbol"],
            "name":            r.get("name"),
            "sector":          r.get("sector"),
            "snapshot_date":   snapshot_date,
            "price":           r.get("price"),
            "market_cap_cr":   r.get("market_cap_cr"),
            "pe":              r.get("pe"),
            "pb":              r.get("pb"),
            "roe":             r.get("roe"),
            "roa":             r.get("roa"),
            "debt_equity":     r.get("debt_equity"),
            "net_margin":      r.get("net_margin"),
            "revenue_growth":  r.get("revenue_growth"),
            "dividend_yield":  r.get("dividend_yield"),
            "week52_high":     r.get("week52_high"),
            "week52_low":      r.get("week52_low"),
        }
        for r in records
    ]

    try:
        with SyncSessionLocal() as db:
            stmt = pg_insert(StockMetricsHistory).values(rows)
            # On duplicate (same symbol + date), update all metric columns
            stmt = stmt.on_conflict_do_update(
                constraint="uq_metrics_symbol_date",
                set_={
                    col: stmt.excluded[col]
                    for col in [
                        "name", "sector", "price", "market_cap_cr",
                        "pe", "pb", "roe", "roa", "debt_equity",
                        "net_margin", "revenue_growth", "dividend_yield",
                        "week52_high", "week52_low",
                    ]
                },
            )
            db.execute(stmt)
            db.commit()
        return len(rows)
    except Exception as exc:
        logger.error("Postgres upsert failed: %s", exc)
        return 0


# ── Main job ───────────────────────────────────────────────────────────────────

def refresh_stock_cache() -> dict:
    """
    Fetch metrics for every NSE stock.
    Writes to Postgres (permanent) and Redis (hot cache).
    Returns a summary dict: {total, ok, failed, duration_s}.
    """
    logger.info("📊 Stock cache refresh starting…")
    started       = time.monotonic()
    snapshot_date = date.today()

    all_data = get_all_stocks()
    stocks   = [s for s in all_data["all"] if s.get("type") == "stock"]
    total    = len(stocks)
    ok = failed = 0

    # Redis client (optional — screener still works without it via Postgres)
    try:
        r    = get_redis_client()
        pipe = r.pipeline()
        use_redis = True
    except Exception as exc:
        logger.warning("Redis unavailable, will write to Postgres only: %s", exc)
        use_redis = False

    for wave_start in range(0, total, BATCH_SIZE):
        batch = stocks[wave_start : wave_start + BATCH_SIZE]
        wave_results = []

        with ThreadPoolExecutor(max_workers=BATCH_SIZE) as pool:
            futures = {
                pool.submit(_fetch_one, s["symbol"], s["name"], s.get("sector", "")): s
                for s in batch
            }
            for future in as_completed(futures):
                result = future.result()
                if result:
                    wave_results.append(result)
                    ok += 1
                    if use_redis:
                        pipe.setex(
                            f"{REDIS_PREFIX}:{result['symbol']}",
                            CACHE_TTL,
                            json.dumps(result),
                        )
                else:
                    failed += 1

        # ── Dual write: Postgres + Redis ───────────────────────────────────────
        _upsert_to_postgres(wave_results, snapshot_date)
        if use_redis and wave_results:
            pipe.execute()
            pipe = r.pipeline()

        progress = min(wave_start + BATCH_SIZE, total)
        logger.info("  … %d / %d stocks processed", progress, total)

        if wave_start + BATCH_SIZE < total:
            time.sleep(BATCH_DELAY)

    duration = round(time.monotonic() - started, 1)

    # ── Job metadata in Redis ──────────────────────────────────────────────────
    meta = {
        "last_run_ts": time.time(),
        "total":       total,
        "ok":          ok,
        "failed":      failed,
        "duration_s":  duration,
    }
    if use_redis:
        r.setex(f"{REDIS_PREFIX}:__meta__", CACHE_TTL, json.dumps(meta))

    logger.info(
        "✅ Stock cache refresh done — %d ok, %d failed in %.1fs",
        ok, failed, duration,
    )
    return meta


# ── Read helpers (used by screener_service) ────────────────────────────────────

def get_cached_metrics(symbol: str) -> dict | None:
    """Read a single stock's metrics from Redis."""
    try:
        r   = get_redis_client()
        raw = r.get(f"{REDIS_PREFIX}:{symbol}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def get_cache_meta() -> dict | None:
    """Read job metadata from Redis."""
    try:
        r   = get_redis_client()
        raw = r.get(f"{REDIS_PREFIX}:__meta__")
        return json.loads(raw) if raw else None
    except Exception:
        return None


def get_all_cached_metrics(symbols: list[str]) -> list[dict]:
    """
    Pipeline-fetch metrics for all given symbols from Redis.
    Returns only the symbols that had a cache hit.
    """
    try:
        r    = get_redis_client()
        pipe = r.pipeline()
        for sym in symbols:
            pipe.get(f"{REDIS_PREFIX}:{sym}")
        raw_list = pipe.execute()

        results = []
        for raw in raw_list:
            if raw:
                try:
                    results.append(json.loads(raw))
                except Exception:
                    pass
        return results
    except Exception as exc:
        logger.warning("Redis pipeline fetch failed: %s", exc)
        return []


# ── Backfill Postgres from Redis (no yfinance calls) ──────────────────────────

def backfill_postgres_from_redis() -> int:
    """
    Copy all stock metrics from Redis → Postgres without hitting yfinance.
    Called on startup when Postgres is empty but Redis has data.
    Returns number of rows inserted.
    """
    from app.services.stock_service import get_all_stocks

    logger.info("📥 Backfilling Postgres from Redis cache…")
    all_data = get_all_stocks()
    symbols  = [s["symbol"] for s in all_data["all"] if s.get("type") == "stock"]

    metrics = get_all_cached_metrics(symbols)
    if not metrics:
        logger.warning("Redis also empty — nothing to backfill")
        return 0

    inserted = _upsert_to_postgres(metrics, date.today())
    logger.info("✅ Backfilled %d stocks from Redis → Postgres", inserted)
    return inserted


# ── Postgres fallback read (for screener when Redis is cold) ───────────────────

def get_postgres_metrics(symbols: list[str]) -> list[dict]:
    """
    Fetch the latest snapshot for each symbol from Postgres.
    Used when Redis cache is cold (e.g. first startup before job has run).
    """
    from sqlalchemy import text
    if not symbols:
        return []
    try:
        with SyncSessionLocal() as db:
            # Fetch the most recent row per symbol using a lateral join
            result = db.execute(
                text("""
                    SELECT DISTINCT ON (symbol)
                        symbol, name, sector, price, market_cap_cr,
                        pe, pb, roe, roa, debt_equity, net_margin,
                        revenue_growth, dividend_yield, week52_high, week52_low
                    FROM stock_metrics_history
                    WHERE symbol = ANY(:syms)
                    ORDER BY symbol, snapshot_date DESC
                """),
                {"syms": symbols},
            )
            rows = result.mappings().all()
            return [dict(r) for r in rows]
    except Exception as exc:
        logger.warning("Postgres metrics read failed: %s", exc)
        return []
