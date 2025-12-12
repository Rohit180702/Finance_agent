import requests
import os
from langchain.tools import tool

@tool
def fetch_process(symbol: str) -> dict:
  """Fetch live and historical market news & sentiment data for a stock ticker.

  This API returns news and sentiment analysis from premier news outlets covering:
  - Stock market news and analysis
  - Company-specific news
  - Sentiment scores (bullish/bearish)
  - Market trends and insights

  Args:
      symbol: Stock ticker symbol (e.g., 'AAPL', 'TSLA', 'MSFT')

  Returns:
      Dictionary containing news articles, sentiment scores, and related metadata
  """
  # Fetch news sentiment data from Alpha Vantage
  url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={symbol}&apikey={os.getenv("ALPHA_VANTAGE_API_KEY")}'
  r = requests.get(url)
  data = r.json()
  return data
