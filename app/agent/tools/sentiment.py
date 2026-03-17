"""
Sentiment analysis tool — lets the chat agent fetch news + analyst sentiment
for any NSE/BSE stock symbol via the shared sentiment_service.
"""

from langchain.tools import tool


@tool
async def analyze_sentiment(symbol: str) -> dict:
    """Analyze the current market sentiment for a stock using recent news,
    price trend, and analyst consensus data.

    Use this tool when the user asks about:
    - Whether a stock has positive or negative sentiment
    - Recent news impact on a stock
    - Analyst opinion / consensus on a stock
    - Whether to buy/hold/sell based on market mood

    Args:
        symbol: NSE/BSE ticker symbol, e.g. "RELIANCE.NS", "TCS.NS", "INFY.NS".
                Append ".NS" for NSE stocks or ".BO" for BSE stocks.
                For well-known indices or companies, the agent may also pass
                the bare symbol like "RELIANCE" and the service will handle it.

    Returns:
        dict with:
          - verdict: "Bullish" | "Bearish" | "Neutral"
          - score: 0-100 sentiment score
          - drivers: list of positive/neutral factors
          - risks: list of key risk factors
          - news_sentiment: "Positive" | "Negative" | "Mixed" | "Neutral"
          - summary: 2-3 paragraph narrative
          - raw.news_items: list of recent news headlines used
          - raw.price_data: current price and recent % changes
          - raw.analyst: analyst buy/sell/hold counts and price targets
    """
    from app.services.sentiment_service import get_sentiment
    return await get_sentiment(symbol)
