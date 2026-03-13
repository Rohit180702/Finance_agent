"""
Stock screener endpoints.
"""

import time, datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.screener_service import get_paginated_stocks, get_total_count
from app.jobs.stock_cache_job import get_cache_meta

router = APIRouter()

VALID_SORT_COLS = {
    "market_cap_cr", "pe", "pb", "roe", "roa",
    "debt_equity", "net_margin", "revenue_growth", "dividend_yield",
    "price", "symbol",
}


@router.get("/stocks", summary="Get stocks (paginated + filtered)")
async def get_stocks(
    page:    int   = Query(0, ge=0),
    limit:   int   = Query(50, ge=1, le=200),
    sort_by: str   = Query("market_cap_cr"),
    sort_dir: str  = Query("desc"),

    # Filters (all optional)
    pe_min:             Optional[float] = None,
    pe_max:             Optional[float] = None,
    pb_min:             Optional[float] = None,
    pb_max:             Optional[float] = None,
    roe_min:            Optional[float] = None,
    roa_min:            Optional[float] = None,
    debt_equity_max:    Optional[float] = None,
    net_margin_min:     Optional[float] = None,
    revenue_growth_min: Optional[float] = None,
    dividend_yield_min: Optional[float] = None,
    market_cap_min:     Optional[float] = None,
    market_cap_max:     Optional[float] = None,
):
    """
    Returns all NSE stocks from the Postgres cache, paginated.
    Filters are applied server-side via SQL WHERE clauses.
    On a cold start (cache empty) returns an empty list with a warning.
    """
    if sort_by not in VALID_SORT_COLS:
        sort_by = "market_cap_cr"

    filters = dict(
        pe_min=pe_min, pe_max=pe_max,
        pb_min=pb_min, pb_max=pb_max,
        roe_min=roe_min, roa_min=roa_min,
        debt_equity_max=debt_equity_max,
        net_margin_min=net_margin_min,
        revenue_growth_min=revenue_growth_min,
        dividend_yield_min=dividend_yield_min,
        market_cap_min=market_cap_min,
        market_cap_max=market_cap_max,
    )

    try:
        rows, total = await get_paginated_stocks(
            filters=filters,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            limit=limit,
        )
        return {
            "page":     page,
            "limit":    limit,
            "total":    total,
            "has_more": (page + 1) * limit < total,
            "results":  rows,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache-status", summary="Cache Status")
async def cache_status():
    meta = get_cache_meta()
    if not meta:
        return {"cached": False}

    age_s = int(time.time() - meta["last_run_ts"])
    return {
        "cached":      True,
        "last_run":    datetime.datetime.fromtimestamp(
                           meta["last_run_ts"], tz=datetime.timezone.utc
                       ).strftime("%Y-%m-%d %H:%M UTC"),
        "age_minutes": age_s // 60,
        "ok":          meta["ok"],
        "failed":      meta["failed"],
    }
