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
import anthropic
from app.core.config import settings

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


@router.get("/etfs", summary="Get all ETFs")
async def get_etfs_endpoint(
    q: str = Query("", description="Optional search query"),
):
    """Return all NSE ETFs from the static data file, optionally filtered."""
    data   = get_all_stocks()
    etfs   = [s for s in data["all"] if s.get("type") == "etf"]
    if q:
        ql = q.lower()
        etfs = [s for s in etfs if ql in s["symbol"].lower() or ql in s["name"].lower()]
    return {"success": True, "count": len(etfs), "etfs": etfs}


@router.get("/compare", summary="Compare Stocks with AI")
async def compare_stocks_endpoint(
    symbols: str = Query(..., description="Comma-separated symbols, max 3 (e.g. RELIANCE.NS,TCS.NS)"),
):
    """
    Fetch fundamental metrics for 2-3 stocks and generate an AI comparison summary.
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()][:3]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 symbols to compare")

    from app.services.screener_service import get_paginated_stocks

    async def _fetch_metrics(sym: str) -> dict | None:
        rows, _ = await get_paginated_stocks({}, "market_cap_cr", "desc", 0, 1)
        # get_paginated_stocks doesn't filter by symbol, so query directly
        from sqlalchemy import text
        from app.db.engine import SyncSessionLocal
        loop = asyncio.get_event_loop()
        def _q():
            with SyncSessionLocal() as db:
                row = db.execute(
                    text("""
                        SELECT DISTINCT ON (symbol)
                            symbol, name, sector, price, market_cap_cr,
                            pe, pb, roe, roa, debt_equity, net_margin,
                            revenue_growth, dividend_yield, week52_high, week52_low
                        FROM stock_metrics_history
                        WHERE symbol = :sym
                        ORDER BY symbol, snapshot_date DESC
                    """),
                    {"sym": sym},
                ).mappings().first()
                return dict(row) if row else None
        return await loop.run_in_executor(None, _q)

    # Fetch metrics for all symbols in parallel
    tasks = [_fetch_metrics(sym) for sym in symbol_list]
    results = await asyncio.gather(*tasks)
    stocks_data = [r for r in results if r is not None]

    if not stocks_data:
        raise HTTPException(status_code=404, detail="No data found for the given symbols")

    # Build AI comparison prompt
    def _fmt_metric(v, suffix=""):
        if v is None:
            return "N/A"
        return f"{v:.2f}{suffix}"

    lines = []
    for s in stocks_data:
        lines.append(
            f"**{s['name']} ({s['symbol'].replace('.NS','')})** — {s.get('sector','')}\n"
            f"  Price: ₹{_fmt_metric(s.get('price'))} | MCap: ₹{_fmt_metric(s.get('market_cap_cr'))}Cr\n"
            f"  PE: {_fmt_metric(s.get('pe'))} | PB: {_fmt_metric(s.get('pb'))} | ROE: {_fmt_metric(s.get('roe'))}%\n"
            f"  D/E: {_fmt_metric(s.get('debt_equity'))} | Net Margin: {_fmt_metric(s.get('net_margin'))}% | Rev Growth: {_fmt_metric(s.get('revenue_growth'))}%\n"
            f"  Div Yield: {_fmt_metric(s.get('dividend_yield'))}% | 52W High: ₹{_fmt_metric(s.get('week52_high'))} | 52W Low: ₹{_fmt_metric(s.get('week52_low'))}"
        )

    metrics_block = "\n\n".join(lines)
    prompt = (
        f"You are an expert Indian stock market analyst. Compare the following stocks and give a structured, "
        f"insightful analysis. Focus on: valuation (PE/PB), profitability (ROE, margins), growth, debt, and "
        f"which stock is better for different types of investors (value, growth, income).\n\n"
        f"{metrics_block}\n\n"
        f"Structure your response with sections: **Overview**, **Valuation**, **Profitability & Growth**, "
        f"**Risk (Debt)**, **Verdict**. Be concise but specific. Use INR (₹) where relevant."
    )

    loop = asyncio.get_event_loop()
    def _call_claude():
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text

    ai_comparison = await loop.run_in_executor(None, _call_claude)

    return {
        "success": True,
        "symbols": symbol_list,
        "stocks": stocks_data,
        "ai_comparison": ai_comparison,
    }


@router.get("/{symbol}/metrics", summary="Get Stock Metrics from Cache")
async def get_stock_metrics_endpoint(symbol: str):
    """
    Get fundamental metrics for a stock from the Postgres cache (fast).
    Falls back to Redis if Postgres is empty.
    """
    from sqlalchemy import text
    from app.db.engine import SyncSessionLocal
    import json

    loop = asyncio.get_event_loop()

    def _fetch():
        with SyncSessionLocal() as db:
            row = db.execute(
                text("""
                    SELECT DISTINCT ON (symbol)
                        symbol, name, sector, price, market_cap_cr,
                        pe, pb, roe, roa, debt_equity, net_margin,
                        revenue_growth, dividend_yield, week52_high, week52_low,
                        snapshot_date
                    FROM stock_metrics_history
                    WHERE symbol = :sym
                    ORDER BY symbol, snapshot_date DESC
                """),
                {"sym": symbol},
            ).mappings().first()
            return dict(row) if row else None

    metrics = await loop.run_in_executor(None, _fetch)

    # Also fetch live price + change via fast_info
    def _live():
        try:
            fi = yf.Ticker(symbol).fast_info
            return {
                "live_price": round(fi.last_price, 2) if fi.last_price else None,
                "prev_close": round(fi.previous_close, 2) if fi.previous_close else None,
            }
        except Exception:
            return {"live_price": None, "prev_close": None}

    live = await loop.run_in_executor(None, _live)

    if not metrics:
        from app.jobs.stock_cache_job import get_cached_metrics
        metrics = await loop.run_in_executor(None, get_cached_metrics, symbol)

    if not metrics:
        # Last resort: live fetch from yfinance (covers ETFs and uncached stocks)
        from app.jobs.stock_cache_job import _fetch_one
        stock_info = get_stock_by_symbol(symbol) or {}
        metrics = await loop.run_in_executor(
            None, _fetch_one,
            symbol,
            stock_info.get("name", symbol),
            stock_info.get("sector", ""),
        )

    if not metrics:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    price = live["live_price"] or metrics.get("price")
    prev  = live["prev_close"]
    change     = round(price - prev, 2)        if (price and prev) else None
    change_pct = round(change / prev * 100, 2) if (change and prev) else None

    return {
        "success": True,
        "symbol": symbol,
        "metrics": {
            **metrics,
            "price":      price,
            "change":     change,
            "change_pct": change_pct,
        },
    }


@router.get("/{symbol}/info", summary="Get Company / ETF Profile")
async def get_stock_info_endpoint(symbol: str):
    """
    Returns company profile: description, sector, industry, website,
    employees, address. For ETFs returns whatever yfinance has.
    """
    loop = asyncio.get_event_loop()

    def _fetch():
        try:
            info = yf.Ticker(symbol).info
            return {
                "longName":             info.get("longName"),
                "longBusinessSummary":  info.get("longBusinessSummary"),
                "sector":               info.get("sector"),
                "industry":             info.get("industry"),
                "website":              info.get("website"),
                "fullTimeEmployees":    info.get("fullTimeEmployees"),
                "country":              info.get("country"),
                "city":                 info.get("city"),
                "address1":             info.get("address1"),
                "quoteType":            info.get("quoteType"),
                "exchange":             info.get("exchange"),
                "currency":             info.get("currency"),
                "logo_url":             info.get("logo_url"),
                # ETF-specific (may be None for Indian ETFs)
                "category":             info.get("category"),
                "fundFamily":           info.get("fundFamily"),
                "totalAssets":          info.get("totalAssets"),
            }
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))

    profile = await loop.run_in_executor(None, _fetch)
    return {"success": True, "symbol": symbol, "profile": profile}


@router.get("/{symbol}/news", summary="Get Recent News for a Stock")
async def get_stock_news_endpoint(
    symbol: str,
    limit: int = Query(10, ge=1, le=30),
):
    """
    Returns recent news articles for a stock from Yahoo Finance.
    """
    loop = asyncio.get_event_loop()

    def _fetch():
        try:
            raw = yf.Ticker(symbol).news or []
            articles = []
            for item in raw[:limit]:
                c = item.get("content", {})
                if not c:
                    continue
                thumb = None
                resolutions = c.get("thumbnail", {}).get("resolutions", []) if c.get("thumbnail") else []
                for r in resolutions:
                    if r.get("tag") == "170x128":
                        thumb = r.get("url")
                        break
                if not thumb and resolutions:
                    thumb = resolutions[0].get("url")

                articles.append({
                    "id":        c.get("id"),
                    "title":     c.get("title"),
                    "summary":   c.get("summary") or c.get("description") or "",
                    "publisher": c.get("provider", {}).get("displayName"),
                    "url":       (c.get("canonicalUrl") or c.get("clickThroughUrl") or {}).get("url"),
                    "pub_date":  c.get("pubDate"),
                    "thumbnail": thumb,
                })
            return articles
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))

    articles = await loop.run_in_executor(None, _fetch)
    return {"success": True, "symbol": symbol, "news": articles}


@router.get("/{symbol}/history", summary="Get Stock Price History")
async def get_stock_history_endpoint(
    symbol: str,
    period: str = Query("3mo", description="Period: 1d, 5d, 1mo, 6mo, ytd, 1y, max"),
):
    """
    Get OHLCV price history for a stock (used for the price chart).
    Uses intraday intervals for short periods, daily for longer ones.
    """
    # Map period → yfinance interval
    INTERVAL_MAP = {
        "1d":  "5m",
        "5d":  "1h",
        "1mo": "1d",
        "3mo": "1d",
        "6mo": "1d",
        "ytd": "1d",
        "1y":  "1d",
        "max": "1wk",
    }
    if period not in INTERVAL_MAP:
        period = "3mo"
    interval = INTERVAL_MAP[period]

    loop = asyncio.get_event_loop()

    def _download():
        df = yf.download(symbol, period=period, interval=interval,
                         auto_adjust=True, progress=False)
        if df.empty:
            return []
        df = df.reset_index()

        # Flatten MultiIndex columns (yfinance returns MultiIndex when one symbol)
        if isinstance(df.columns, __import__('pandas').MultiIndex):
            df.columns = [col[0] for col in df.columns]

        rows = []
        date_col = "Datetime" if "Datetime" in df.columns else "Date"
        for _, row in df.iterrows():
            try:
                ts = row[date_col]
                # For intraday data include time; for daily just date
                date_str = str(ts)[:16] if interval in ("5m", "1h") else str(ts)[:10]
                rows.append({
                    "date":   date_str,
                    "open":   round(float(row["Open"]),  2),
                    "high":   round(float(row["High"]),  2),
                    "low":    round(float(row["Low"]),   2),
                    "close":  round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]) if row.get("Volume") else 0,
                })
            except Exception:
                pass
        return rows

    history = await loop.run_in_executor(None, _download)

    return {"success": True, "symbol": symbol, "period": period,
            "interval": interval, "history": history}


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
