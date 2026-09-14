"""
Sentiment analysis service.
Extracted from app/api/v1/endpoints/stocks.py so it can be called by
both the HTTP endpoint and the chat agent tool.
"""

import json
import asyncio
import anthropic
import yfinance as yf

from app.core.config import settings
from app.services.stock_service import get_stock_by_symbol


def _gather_data(symbol: str) -> tuple[list, dict, dict]:
    """Collect news, price trend and analyst ratings for a symbol via yfinance."""
    t = yf.Ticker(symbol)

    news_items = []
    for item in (t.news or [])[:10]:
        c = item.get("content", {})
        if c.get("title"):
            news_items.append({
                "title":     c["title"],
                "summary":   (c.get("summary") or c.get("description") or "")[:300],
                "date":      c.get("pubDate", "")[:10],
                "url":       ((c.get("canonicalUrl") or c.get("clickThroughUrl")) or {}).get("url"),
                "publisher": (c.get("provider") or {}).get("displayName"),
            })

    price_data: dict = {}
    try:
        fi = t.fast_info
        price_data = {
            "current":    round(fi.last_price, 2) if fi.last_price else None,
            "week52_high": round(fi.year_high, 2) if fi.year_high else None,
            "week52_low":  round(fi.year_low,  2) if fi.year_low  else None,
        }
    except Exception:
        pass
    try:
        h1m = t.history(period="1mo")
        if not h1m.empty:
            price_data["change_1m_pct"] = round(
                (h1m["Close"].iloc[-1] - h1m["Close"].iloc[0]) / h1m["Close"].iloc[0] * 100, 2
            )
        h1w = t.history(period="5d")
        if not h1w.empty:
            price_data["change_1w_pct"] = round(
                (h1w["Close"].iloc[-1] - h1w["Close"].iloc[0]) / h1w["Close"].iloc[0] * 100, 2
            )
    except Exception:
        pass

    analyst: dict = {}
    try:
        rec = t.recommendations
        if rec is not None and not rec.empty:
            latest = rec.iloc[-1]
            analyst["strong_buy"]  = int(latest.get("strongBuy",  0))
            analyst["buy"]         = int(latest.get("buy",         0))
            analyst["hold"]        = int(latest.get("hold",        0))
            analyst["sell"]        = int(latest.get("sell",        0))
            analyst["strong_sell"] = int(latest.get("strongSell",  0))
    except Exception:
        pass
    try:
        apt = t.analyst_price_targets
        if apt:
            analyst["target_mean"]    = apt.get("mean")
            analyst["target_high"]    = apt.get("high")
            analyst["target_low"]     = apt.get("low")
            analyst["target_current"] = apt.get("current")
    except Exception:
        pass

    return news_items, price_data, analyst


def _call_claude(symbol: str, news_items: list, price_data: dict, analyst: dict) -> dict:
    """Send the gathered data to Claude and parse a structured sentiment JSON."""
    stock_info = get_stock_by_symbol(symbol) or {}
    name  = stock_info.get("name", symbol)
    clean = symbol.replace(".NS", "").replace(".BO", "")

    news_block = "\n".join([
        f'{i+1}. [{n["date"]}] "{n["title"]}"\n   {n["summary"]}'
        for i, n in enumerate(news_items)
    ]) or "No recent news available."

    p = price_data
    price_block = (
        f'Current Price : ₹{p.get("current", "N/A")}\n'
        f'1W Change     : {p.get("change_1w_pct", "N/A")}%\n'
        f'1M Change     : {p.get("change_1m_pct", "N/A")}%\n'
        f'52W High      : ₹{p.get("week52_high", "N/A")}\n'
        f'52W Low       : ₹{p.get("week52_low",  "N/A")}'
    )

    if analyst.get("strong_buy") is not None:
        total = sum(analyst.get(k, 0) for k in ["strong_buy", "buy", "hold", "sell", "strong_sell"])
        analyst_block = (
            f'Strong Buy: {analyst.get("strong_buy",0)}  |  '
            f'Buy: {analyst.get("buy",0)}  |  '
            f'Hold: {analyst.get("hold",0)}  |  '
            f'Sell: {analyst.get("sell",0)}  |  '
            f'Strong Sell: {analyst.get("strong_sell",0)}  '
            f'(Total analysts: {total})\n'
        )
        if analyst.get("target_mean"):
            analyst_block += (
                f'Price Targets → Mean: ₹{analyst["target_mean"]}  |  '
                f'High: ₹{analyst["target_high"]}  |  '
                f'Low: ₹{analyst["target_low"]}'
            )
    else:
        analyst_block = "No analyst data available."

    prompt = f"""Analyze sentiment for {clean} ({name}). Return ONLY valid JSON, no markdown.

RECENT NEWS:
{news_block}

PRICE TREND:
{price_block}

ANALYST CONSENSUS:
{analyst_block}

Return this exact JSON structure:
{{
  "verdict": "Bullish" | "Bearish" | "Neutral",
  "score": <integer 0-100, where 0=extreme bearish, 50=neutral, 100=extreme bullish>,
  "drivers": ["<3-4 bullish/positive factors as concise strings>"],
  "risks": ["<2-3 key risk factors as concise strings>"],
  "news_sentiment": "Positive" | "Negative" | "Mixed" | "Neutral",
  "news_score": <integer 0-100, sentiment from news alone>,
  "analyst_score": <integer 0-100, sentiment from analyst consensus alone>,
  "catalysts": ["<2-3 recent events driving price action>"],
  "summary": "<2-3 paragraph narrative, no emojis, professional tone>"
}}

Rules: No emojis. No markdown. No explanation outside the JSON."""

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


async def get_sentiment(symbol: str) -> dict:
    """
    Public async entry point.  Gathers data + calls Claude in a thread pool
    and returns the full sentiment payload.
    """
    loop = asyncio.get_event_loop()
    news_items, price_data, analyst = await loop.run_in_executor(
        None, _gather_data, symbol
    )
    result = await loop.run_in_executor(
        None, _call_claude, symbol, news_items, price_data, analyst
    )
    return {
        "success":   True,
        "symbol":    symbol,
        "sentiment": result,
        "raw": {
            "news_count": len(news_items),
            "news_items": news_items,
            "price_data": price_data,
            "analyst":    analyst,
        },
    }
