"""
Stock screener endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.stock_service import get_popular_stocks, get_all_stocks
from app.services.screener_service import fetch_metrics, apply_filters

router = APIRouter()


class ScreenerFilters(BaseModel):
    universe: str = "nifty50"   # "nifty50" | "all" (capped at 200)

    # Valuation
    pe_min:             Optional[float] = None
    pe_max:             Optional[float] = None
    pb_min:             Optional[float] = None
    pb_max:             Optional[float] = None

    # Profitability (values in %, e.g. 15 = 15%)
    roe_min:            Optional[float] = None
    roa_min:            Optional[float] = None
    net_margin_min:     Optional[float] = None

    # Financial health
    debt_equity_max:    Optional[float] = None

    # Market
    market_cap_min:     Optional[float] = None   # Crores
    market_cap_max:     Optional[float] = None   # Crores

    # Growth
    revenue_growth_min: Optional[float] = None   # %

    # Dividend
    dividend_yield_min: Optional[float] = None   # %


@router.post("/screen", summary="Screen Stocks")
async def screen_stocks(filters: ScreenerFilters):
    """
    Screen NSE stocks against fundamental criteria.

    Universe options:
    - nifty50 (default): NIFTY 50 stocks (~51) — fast, ~10-15s first run
    - all: first 200 stocks from full NSE list — slower, ~60s first run

    Results are cached per symbol for 30 minutes so repeated runs are instant.
    """
    try:
        if filters.universe == "nifty50":
            stocks = get_popular_stocks()
        else:
            all_stocks = get_all_stocks()["all"]
            # Cap at 200 to avoid absurdly long fetches
            stocks = [s for s in all_stocks if s.get("type") == "stock"][:200]

        # Fetch metrics concurrently
        metrics = await fetch_metrics(stocks)

        # Apply filters
        results = apply_filters(metrics, filters.model_dump(exclude={"universe"}))

        # Sort by market cap descending by default
        results.sort(key=lambda x: x.get("market_cap_cr") or 0, reverse=True)

        return {
            "success":      True,
            "universe":     filters.universe,
            "total_screened": len(metrics),
            "matched":      len(results),
            "results":      results,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
