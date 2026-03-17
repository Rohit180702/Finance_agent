"""
Screener tool — lets the chat agent filter NSE stocks by financial metrics.
Wraps the existing screener_service which reads from Postgres/Redis.
"""

from langchain.tools import tool
from typing import Optional


@tool
async def screen_stocks(
    pe_max: Optional[float] = None,
    pe_min: Optional[float] = None,
    pb_max: Optional[float] = None,
    pb_min: Optional[float] = None,
    roe_min: Optional[float] = None,
    roa_min: Optional[float] = None,
    debt_equity_max: Optional[float] = None,
    net_margin_min: Optional[float] = None,
    revenue_growth_min: Optional[float] = None,
    dividend_yield_min: Optional[float] = None,
    market_cap_min: Optional[float] = None,
    market_cap_max: Optional[float] = None,
    sort_by: str = "market_cap_cr",
    top_n: int = 5,
) -> dict:
    """Screen NSE stocks by financial metrics and return the top matches.

    Use this tool to find stocks that satisfy financial criteria such as
    valuation, profitability, leverage, and size.  All filter parameters
    are optional — pass only the ones relevant to the query.

    Args:
        pe_max: Maximum P/E ratio (e.g. 25 for "value stocks")
        pe_min: Minimum P/E ratio
        pb_max: Maximum Price-to-Book ratio
        pb_min: Minimum Price-to-Book ratio
        roe_min: Minimum Return on Equity in % (e.g. 15 for "good ROE")
        roa_min: Minimum Return on Assets in %
        debt_equity_max: Maximum Debt-to-Equity ratio (e.g. 0.5 for "low debt")
        net_margin_min: Minimum net profit margin in % (e.g. 10)
        revenue_growth_min: Minimum revenue growth in % (e.g. 10)
        dividend_yield_min: Minimum dividend yield in % (e.g. 1.5)
        market_cap_min: Minimum market cap in Crores (e.g. 5000 for mid-cap)
        market_cap_max: Maximum market cap in Crores (e.g. 20000 for mid-cap)
        sort_by: Column to rank results by. Options: market_cap_cr, roe, pe,
                 net_margin, revenue_growth, dividend_yield (default: market_cap_cr)
        top_n: Number of top results to return (default: 5, max: 20)

    Returns:
        dict with 'stocks' list (each with symbol, name, sector, and key metrics)
        and 'total_matches' count.

    Examples:
        screen_stocks(roe_min=20, debt_equity_max=0.5, top_n=5)
        screen_stocks(pe_max=15, net_margin_min=10, market_cap_min=10000)
        screen_stocks(revenue_growth_min=20, sort_by="revenue_growth", top_n=3)
    """
    from app.services.screener_service import get_paginated_stocks

    top_n = min(max(top_n, 1), 20)

    filters = {
        "pe_max":             pe_max,
        "pe_min":             pe_min,
        "pb_max":             pb_max,
        "pb_min":             pb_min,
        "roe_min":            roe_min,
        "roa_min":            roa_min,
        "debt_equity_max":    debt_equity_max,
        "net_margin_min":     net_margin_min,
        "revenue_growth_min": revenue_growth_min,
        "dividend_yield_min": dividend_yield_min,
        "market_cap_min":     market_cap_min,
        "market_cap_max":     market_cap_max,
    }

    valid_sort = {
        "market_cap_cr", "roe", "roa", "pe", "pb",
        "net_margin", "revenue_growth", "dividend_yield",
        "debt_equity", "price",
    }
    if sort_by not in valid_sort:
        sort_by = "market_cap_cr"

    rows, total = await get_paginated_stocks(
        filters=filters,
        sort_by=sort_by,
        sort_dir="desc",
        page=0,
        limit=top_n,
    )

    stocks = [
        {
            "symbol":         r.get("symbol"),
            "name":           r.get("name"),
            "sector":         r.get("sector"),
            "price":          r.get("price"),
            "market_cap_cr":  r.get("market_cap_cr"),
            "pe":             r.get("pe"),
            "pb":             r.get("pb"),
            "roe":            r.get("roe"),
            "debt_equity":    r.get("debt_equity"),
            "net_margin":     r.get("net_margin"),
            "revenue_growth": r.get("revenue_growth"),
            "dividend_yield": r.get("dividend_yield"),
        }
        for r in rows
    ]

    active_filters = {k: v for k, v in filters.items() if v is not None}

    return {
        "stocks":         stocks,
        "total_matches":  total or len(stocks),
        "showing":        len(stocks),
        "filters_applied": active_filters,
        "sorted_by":      sort_by,
    }
