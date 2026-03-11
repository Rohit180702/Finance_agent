"""
Stock API endpoints.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
from app.services.stock_service import (
    get_all_stocks,
    get_popular_stocks,
    search_stocks,
    get_stock_by_symbol
)
import yfinance as yf
import asyncio
import time

router = APIRouter()

# ── In-memory cache for market overview ───────────────────────────────────────
# Avoids hitting Yahoo Finance on every poll from the frontend.
# TTL: 15 seconds — short enough to stay fresh, long enough to absorb bursts.
_CACHE_TTL = 4  # seconds — matches the 5s frontend poll
_cache: dict = {"data": None, "ts": 0, "lock": None}


def _get_lock():
    if _cache["lock"] is None:
        _cache["lock"] = asyncio.Lock()
    return _cache["lock"]


async def _fetch_indices() -> list:
    indices = [
        {"name": "NIFTY 50",   "symbol": "^NSEI"},
        {"name": "SENSEX",     "symbol": "^BSESN"},
        {"name": "NIFTY Bank", "symbol": "^NSEBANK"},
        {"name": "NIFTY IT",   "symbol": "^CNXIT"},
    ]

    def _sync_fetch():
        results = []
        for idx in indices:
            try:
                fi    = yf.Ticker(idx["symbol"]).fast_info
                price = fi.last_price
                prev  = fi.previous_close
                change     = round(price - prev, 2)        if (price and prev) else None
                change_pct = round(change / prev * 100, 2) if (change and prev) else None
                results.append({
                    "name": idx["name"], "symbol": idx["symbol"],
                    "price":      round(price, 2) if price else None,
                    "change":     change,
                    "change_pct": change_pct,
                })
            except Exception:
                results.append({
                    "name": idx["name"], "symbol": idx["symbol"],
                    "price": None, "change": None, "change_pct": None,
                })
        return results

    # Run blocking yfinance calls in a thread pool so the event loop stays free
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_fetch)


@router.get("/market-overview", summary="Market Overview")
async def get_market_overview():
    """
    Get live prices and daily change for key Indian market indices.
    Results are cached for 15 seconds to reduce Yahoo Finance round-trips.
    """
    now = time.monotonic()

    # Serve cached data if still fresh
    if _cache["data"] and (now - _cache["ts"]) < _CACHE_TTL:
        return {"success": True, "indices": _cache["data"], "cached": True}

    # Only one concurrent fetch — others wait and then get the fresh result
    async with _get_lock():
        # Re-check after acquiring the lock (another request may have just refreshed)
        if _cache["data"] and (now - _cache["ts"]) < _CACHE_TTL:
            return {"success": True, "indices": _cache["data"], "cached": True}

        results = await _fetch_indices()
        _cache["data"] = results
        _cache["ts"]   = time.monotonic()

    return {"success": True, "indices": results, "cached": False}


@router.get("/popular", summary="Get Popular Stocks")
async def get_popular_stocks_endpoint():
    """
    Get NIFTY 50 stocks (popular stocks).

    Returns:
        dict: Response with popular stocks
    """
    # Call get_popular_stocks()
    stocks = get_popular_stocks()

    # Return response
    return {
        "success": True,
        "count": len(stocks),
        "stocks": stocks
    }


@router.get("/all", summary="Get All Stocks")
async def get_all_stocks_endpoint():
    """
    Get all NSE stocks.

    Returns:
        dict: Response with all stocks and metadata
    """
    # Call get_all_stocks()
    data = get_all_stocks()

    # Return response
    return {
        "success": True,
        "metadata": data['metadata'],
        "stocks": data['all']
    }


@router.get("/search", summary="Search Stocks")
async def search_stocks_endpoint(
    q: str = Query(..., description="Search query (symbol or company name)", min_length=1),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return")
):
    """
    Search stocks by symbol or company name.

    Args:
        q: Search query
        limit: Max results (1-100)

    Returns:
        dict: Response with matching stocks
    """
    # Call search_stocks(q, limit)
    results = search_stocks(q, limit)

    # Return response
    return {
        "success": True,
        "query": q,
        "count": len(results),
        "stocks": results
    }


@router.get("/{symbol}", summary="Get Stock by Symbol")
async def get_stock_endpoint(symbol: str):
    """
    Get detailed info about a specific stock.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE.NS" or "RELIANCE")

    Returns:
        dict: Stock information

    Raises:
        HTTPException: 404 if stock not found
    """
    # Call get_stock_by_symbol(symbol)
    stock = get_stock_by_symbol(symbol)

    # If stock is None, raise 404
    if stock is None:
        raise HTTPException(status_code=404, detail=f"Stock '{symbol}' not found")

    # Return response
    return {
        "success": True,
        "stock": stock
    }
