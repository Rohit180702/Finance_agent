"""
Async service that computes key technical indicators for a symbol.
Blocking yfinance/pandas_ta calls are offloaded via run_in_executor.
"""

import asyncio
import logging
import yfinance as yf
import pandas_ta as ta

logger = logging.getLogger(__name__)


def _safe_round(v, decimals=2):
    if v is None:
        return None
    try:
        return round(float(v), decimals)
    except (TypeError, ValueError):
        return None


def _rsi_signal(v):
    if v is None:
        return "N/A"
    if v >= 70:
        return "Overbought"
    if v >= 60:
        return "Approaching Overbought"
    if v <= 30:
        return "Oversold"
    if v <= 40:
        return "Approaching Oversold"
    return "Neutral"


def _macd_signal(macd_line, signal_line):
    if macd_line is None or signal_line is None:
        return "N/A"
    if macd_line > signal_line:
        return "Bullish Crossover" if abs(macd_line - signal_line) < 2 else "Bullish"
    return "Bearish Crossover" if abs(macd_line - signal_line) < 2 else "Bearish"


def _ma_signal(price, ma_val):
    if price is None or ma_val is None:
        return "N/A"
    return "Above" if price > ma_val else "Below"


def _compute_indicators(symbol: str) -> dict:
    """Blocking helper -- fetches data and computes all indicators in one shot."""
    ticker = yf.Ticker(symbol)

    live_price = None
    try:
        fi = ticker.fast_info
        live_price = _safe_round(fi.last_price)
    except Exception:
        pass

    try:
        df = ticker.history(period="1y", interval="1d")
    except Exception as exc:
        logger.warning("History fetch failed for %s: %s", symbol, exc)
        return {"success": False, "symbol": symbol, "error": str(exc)}

    if df.empty:
        return {"success": False, "symbol": symbol, "error": "No price history available"}

    close = df["Close"]

    rsi_val = None
    try:
        rsi_s = ta.rsi(close, length=14)
        if rsi_s is not None and not rsi_s.empty:
            rsi_val = _safe_round(rsi_s.iloc[-1])
    except Exception as exc:
        logger.debug("RSI calc failed: %s", exc)

    macd_line = signal_line = histogram = None
    try:
        macd_df = ta.macd(close)
        if macd_df is not None and not macd_df.empty:
            last = macd_df.iloc[-1]
            macd_line = _safe_round(last.get("MACD_12_26_9"))
            signal_line = _safe_round(last.get("MACDs_12_26_9"))
            histogram = _safe_round(last.get("MACDh_12_26_9"))
    except Exception as exc:
        logger.debug("MACD calc failed: %s", exc)

    sma_vals = {}
    for length in (20, 50, 200):
        try:
            s = ta.sma(close, length=length)
            if s is not None and not s.empty:
                sma_vals[length] = _safe_round(s.iloc[-1])
        except Exception as exc:
            logger.debug("SMA-%d calc failed: %s", length, exc)

    bbands_val = None
    try:
        bb = ta.bbands(close, length=20)
        if bb is not None and not bb.empty:
            last = bb.iloc[-1]
            bbands_val = {
                k: _safe_round(v) for k, v in last.to_dict().items() if v is not None
            }
    except Exception as exc:
        logger.debug("BBands calc failed: %s", exc)

    return {
        "success": True,
        "symbol": symbol,
        "price": live_price,
        "indicators": {
            "rsi": {
                "value": rsi_val,
                "period": 14,
                "signal": _rsi_signal(rsi_val),
            },
            "macd": {
                "value": {
                    "macd_line": macd_line,
                    "signal_line": signal_line,
                    "histogram": histogram,
                } if macd_line is not None else None,
                "signal": _macd_signal(macd_line, signal_line),
            },
            "sma_20": {
                "value": sma_vals.get(20),
                "signal": _ma_signal(live_price, sma_vals.get(20)),
            },
            "sma_50": {
                "value": sma_vals.get(50),
                "signal": _ma_signal(live_price, sma_vals.get(50)),
            },
            "sma_200": {
                "value": sma_vals.get(200),
                "signal": _ma_signal(live_price, sma_vals.get(200)),
            },
            "bbands": {"value": bbands_val},
        },
    }


async def get_technical_summary(symbol: str) -> dict:
    """Async entry point. Offloads blocking work to a thread."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _compute_indicators, symbol)
