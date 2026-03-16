"""
News endpoints — market-wide and per-stock news via yfinance.

Tickers are split into pages of BATCH_SIZE so the frontend can lazy-load:
  page=0 → first batch (fast, shown immediately)
  page=1 → second batch, etc.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import APIRouter, Query
import yfinance as yf

router = APIRouter()

# Full ticker list split into batches of ~8 — each page fetches one batch
_TICKER_BATCHES = [
    # Page 0 — indices + top financials (loads first)
    ["^NSEI", "^BSESN", "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "RELIANCE.NS", "TCS.NS", "INFY.NS"],
    # Page 1 — more large caps
    ["KOTAKBANK.NS", "AXISBANK.NS", "BAJFINANCE.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS", "ONGC.NS", "NTPC.NS"],
    # Page 2 — consumer / pharma / auto
    ["HINDUNILVR.NS", "NESTLEIND.NS", "SUNPHARMA.NS", "DRREDDY.NS", "TATAMOTORS.NS", "MARUTI.NS", "TATASTEEL.NS", "JSWSTEEL.NS"],
    # Page 3 — mid caps / new-age
    ["ADANIPORTS.NS", "POWERGRID.NS", "DIVISLAB.NS", "ZOMATO.NS", "IRCTC.NS", "NYKAA.NS", "PAYTM.NS", "LT.NS"],
]


def _parse_article(item: dict) -> dict | None:
    c = item.get("content", {})
    if not c or c.get("contentType") == "AD":
        return None

    thumb = None
    resolutions = (c.get("thumbnail") or {}).get("resolutions", [])
    for r in resolutions:
        if r.get("tag") == "170x128":
            thumb = r.get("url")
            break
    if not thumb and resolutions:
        thumb = resolutions[0].get("url")

    return {
        "id":        c.get("id"),
        "title":     c.get("title"),
        "summary":   c.get("summary") or c.get("description") or "",
        "publisher": (c.get("provider") or {}).get("displayName"),
        "url":       ((c.get("canonicalUrl") or c.get("clickThroughUrl")) or {}).get("url"),
        "pub_date":  c.get("pubDate"),
        "thumbnail": thumb,
    }


@router.get("/market", summary="Market-wide news feed (paginated by ticker batch)")
async def get_market_news(
    page: int = Query(0, ge=0, description="Ticker-batch page (0-indexed)"),
):
    """
    Returns news for one batch of tickers per request so the frontend can
    lazy-load: request page=0 first, then page=1 as the user scrolls, etc.
    Deduplicates within each batch and sorts newest-first.
    """
    if page >= len(_TICKER_BATCHES):
        return {"success": True, "news": [], "page": page, "has_more": False}

    tickers = _TICKER_BATCHES[page]
    loop    = asyncio.get_event_loop()

    def _fetch_one(ticker: str) -> list[dict]:
        try:
            return yf.Ticker(ticker).news or []
        except Exception:
            return []

    def _fetch():
        all_raw: list[dict] = []
        with ThreadPoolExecutor(max_workers=len(tickers)) as pool:
            futures = [pool.submit(_fetch_one, t) for t in tickers]
            for fut in as_completed(futures):
                all_raw.extend(fut.result())

        seen: set[str] = set()
        articles = []
        for item in all_raw:
            parsed = _parse_article(item)
            if not parsed or not parsed.get("title"):
                continue
            key = parsed["title"].lower().strip()
            if key in seen:
                continue
            seen.add(key)
            articles.append(parsed)

        articles.sort(key=lambda a: a.get("pub_date") or "", reverse=True)
        return articles

    articles = await loop.run_in_executor(None, _fetch)
    return {
        "success":  True,
        "news":     articles,
        "page":     page,
        "has_more": page + 1 < len(_TICKER_BATCHES),
    }
