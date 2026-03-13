"""
Stock screener service.

Primary data source: Postgres stock_metrics_history table (populated nightly).
Falls back to Redis → live yfinance only for the legacy POST /screen endpoint.

The new GET /stocks endpoint always reads from Postgres (fast SQL pagination).
"""

import asyncio
import logging
import time
from sqlalchemy import text

from app.db.engine import SyncSessionLocal

logger = logging.getLogger(__name__)


# ── Postgres paginated query ───────────────────────────────────────────────────

_LATEST_CTE = """
WITH latest AS (
    SELECT DISTINCT ON (symbol)
        symbol, name, sector,
        price, market_cap_cr,
        pe, pb, roe, roa,
        debt_equity, net_margin,
        revenue_growth, dividend_yield,
        week52_high, week52_low
    FROM stock_metrics_history
    ORDER BY symbol, snapshot_date DESC
)
"""

def _build_where(f: dict) -> tuple[str, dict]:
    """Return (WHERE clause string, params dict) for the given filter dict."""
    clauses = []
    params  = {}

    def add(col, op, key, val):
        if val is not None:
            clauses.append(f"{col} {op} :{key}")
            params[key] = val

    add("pe",             ">=", "pe_min",             f.get("pe_min"))
    add("pe",             "<=", "pe_max",             f.get("pe_max"))
    add("pb",             ">=", "pb_min",             f.get("pb_min"))
    add("pb",             "<=", "pb_max",             f.get("pb_max"))
    add("roe",            ">=", "roe_min",            f.get("roe_min"))
    add("roa",            ">=", "roa_min",            f.get("roa_min"))
    add("debt_equity",    "<=", "debt_equity_max",    f.get("debt_equity_max"))
    add("net_margin",     ">=", "net_margin_min",     f.get("net_margin_min"))
    add("revenue_growth", ">=", "revenue_growth_min", f.get("revenue_growth_min"))
    add("dividend_yield", ">=", "dividend_yield_min", f.get("dividend_yield_min"))
    add("market_cap_cr",  ">=", "market_cap_min",     f.get("market_cap_min"))
    add("market_cap_cr",  "<=", "market_cap_max",     f.get("market_cap_max"))

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params


def _postgres_paginated(filters, sort_by, sort_dir, page, limit):
    """Query stock_metrics_history. Returns (rows, total) or ([], None) on empty."""
    dir_sql = "DESC NULLS LAST" if sort_dir == "desc" else "ASC NULLS LAST"
    where, params = _build_where(filters)
    params["limit"]  = limit
    params["offset"] = page * limit

    data_sql = text(f"""
        {_LATEST_CTE}
        SELECT * FROM latest
        {where}
        ORDER BY {sort_by} {dir_sql}
        LIMIT :limit OFFSET :offset
    """)
    count_sql = text(f"""
        {_LATEST_CTE}
        SELECT COUNT(*) FROM latest
        {where}
    """)

    try:
        with SyncSessionLocal() as db:
            rows  = [dict(r) for r in db.execute(data_sql, params).mappings()]
            total = db.execute(
                count_sql,
                {k: v for k, v in params.items() if k not in ("limit", "offset")},
            ).scalar() or 0
        return rows, total
    except Exception as exc:
        logger.warning("Postgres query failed: %s", exc)
        return [], None


def _passes_redis(s, f):
    def ge(key, field):
        v = f.get(key)
        return v is None or (s.get(field) is not None and s[field] >= v)
    def le(key, field):
        v = f.get(key)
        return v is None or (s.get(field) is not None and s[field] <= v)
    return all([
        ge("pe_min","pe"), le("pe_max","pe"),
        ge("pb_min","pb"), le("pb_max","pb"),
        ge("roe_min","roe"), ge("roa_min","roa"),
        le("debt_equity_max","debt_equity"),
        ge("net_margin_min","net_margin"),
        ge("revenue_growth_min","revenue_growth"),
        ge("dividend_yield_min","dividend_yield"),
        ge("market_cap_min","market_cap_cr"),
        le("market_cap_max","market_cap_cr"),
    ])


def _redis_paginated(filters, sort_by, sort_dir, page, limit):
    """Fallback: read all cached metrics from Redis, filter + paginate in Python."""
    from app.jobs.stock_cache_job import get_all_cached_metrics
    from app.services.stock_service import get_all_stocks

    all_data = get_all_stocks()
    symbols  = [s["symbol"] for s in all_data["all"] if s.get("type") == "stock"]
    all_metrics = get_all_cached_metrics(symbols)

    if not all_metrics:
        return [], 0

    filtered = [s for s in all_metrics if _passes_redis(s, filters)]

    rev = sort_dir == "desc"
    filtered.sort(
        key=lambda x: (x.get(sort_by) is None, -(x.get(sort_by) or 0) if rev else (x.get(sort_by) or 0))
    )

    total  = len(filtered)
    offset = page * limit
    return filtered[offset : offset + limit], total


def _run_paginated(filters, sort_by, sort_dir, page, limit):
    rows, total = _postgres_paginated(filters, sort_by, sort_dir, page, limit)
    if total:                          # Postgres has data — use it
        return rows, total
    logger.info("Postgres cache empty — falling back to Redis for screener")
    return _redis_paginated(filters, sort_by, sort_dir, page, limit)


async def get_paginated_stocks(filters, sort_by, sort_dir, page, limit):
    """Async wrapper — runs the blocking Postgres query in a thread."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, _run_paginated, filters, sort_by, sort_dir, page, limit
    )


async def get_total_count(filters):
    loop = asyncio.get_event_loop()
    where, params = _build_where(filters)
    def _run():
        with SyncSessionLocal() as db:
            return db.execute(
                text(f"{_LATEST_CTE} SELECT COUNT(*) FROM latest {where}"),
                params,
            ).scalar()
    return await loop.run_in_executor(None, _run)


# ── Legacy filter logic (kept for backward compat) ────────────────────────────

def _passes(stock: dict, f: dict) -> bool:
    def ge(key, field):
        v = f.get(key)
        return v is None or (stock.get(field) is not None and stock[field] >= v)
    def le(key, field):
        v = f.get(key)
        return v is None or (stock.get(field) is not None and stock[field] <= v)
    return all([
        ge("pe_min",             "pe"),
        le("pe_max",             "pe"),
        ge("pb_min",             "pb"),
        le("pb_max",             "pb"),
        ge("roe_min",            "roe"),
        ge("roa_min",            "roa"),
        le("debt_equity_max",    "debt_equity"),
        ge("net_margin_min",     "net_margin"),
        ge("revenue_growth_min", "revenue_growth"),
        ge("dividend_yield_min", "dividend_yield"),
        ge("market_cap_min",     "market_cap_cr"),
        le("market_cap_max",     "market_cap_cr"),
    ])


def apply_filters(stocks: list[dict], filters: dict) -> list[dict]:
    return [s for s in stocks if _passes(s, filters)]
