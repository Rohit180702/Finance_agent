import pandas_ta as ta
from langchain.tools import tool
import yfinance as yf

@tool
def calculate_indicator(
  symbol: str,
  indicator: str,
  interval: str = "1d",
  data_period: str = "6mo",
  indicator_period: int = 14,
  **kwargs
  ) -> dict:
      """
    Calculate any technical indicator for a stock.

    Common indicators: rsi, macd, sma, ema, bbands, atr, stoch, adx, obv, vwap

    Args:
        symbol: Stock ticker (e.g., 'AAPL', 'TSLA')
        indicator: Indicator name (e.g., 'rsi', 'macd')
        interval: Candle interval/timeframe (e.g., '1m', '5m', '1h', '1d', '1wk')
        data_period: How much historical data to fetch (e.g., '1d', '5d', '1mo', '6mo', '1y')
        indicator_period: Lookback period for indicator calculation (default: 14)
    """
      # 1. Download data from Yahoo Finance
      ticker = yf.Ticker(symbol)
      df = ticker.history(period=data_period, interval=interval)

      if df.empty:
          return {
              "error": f"No data available for {symbol} with period={data_period} and interval={interval}",
              "symbol": symbol,
              "indicator": indicator
          }

      # 2. Dynamically call the indicator
      indicator_func = getattr(df.ta, indicator.lower())
      result = indicator_func(length=indicator_period, **kwargs)

      # Handle multi-column results (like MACD, Bollinger Bands)
      if hasattr(result, 'columns') and len(result.columns) > 1:
          current_value = {col: float(result[col].iloc[-1]) for col in result.columns}
      else:
          current_value = float(result.iloc[-1])

      # 3. Return the result
      return {
          "symbol": symbol,
          "indicator": indicator,
          "current_value": current_value,
          "timestamp": str(df.index[-1]),
          "data_period": data_period,
          "interval": interval,
          "indicator_period": indicator_period
      }
