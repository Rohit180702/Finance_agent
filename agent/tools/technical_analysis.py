import pandas_ta as ta
from langchain.tools import tool
import yfinance as yf

@tool
def calculate_indicator(
  symbol:str,
  indicator:str,
  timeframe:str = "1d",
  period:int = 14,
  **kwargs
  ) -> dict:
      """
    Calculate any technical indicator for a stock.

    Common indicators: rsi, macd, sma, ema, bbands, atr, stoch, adx, obv, vwap

    Args:
        symbol: Stock ticker (e.g., 'AAPL', 'TSLA')
        indicator: Indicator name (e.g., 'rsi', 'macd')
        timeframe: '1d', '1h', '5m' (default: '1d')
        period: Lookback period (default: 14)
    """
      # 1. Download data from Yahoo Finance
      ticker = yf.Ticker(symbol)
      df = ticker.history(period="6mo", interval=timeframe)

      # 2. Dynamically call the indicator
      indicator_func = getattr(df.ta, indicator.lower())
      result = indicator_func(length=period, **kwargs)

      # 3. Return the result
      return {
          "symbol": symbol,
          "indicator": indicator,
          "current_value": float(result.iloc[-1]),
          "timestamp": str(df.index[-1])
      }
