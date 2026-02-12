from pydantic import BaseModel, Field
from typing import Optional


class CalculateIndicatorRequest(BaseModel):
    """Request model for calculating technical indicators"""
    symbol: str = Field(..., description="Stock ticker symbol (e.g., AAPL, TSLA)")
    indicator: str = Field(..., description="Technical indicator name (e.g., rsi, macd, sma)")
    interval: str = Field(default="1d", description="Candle interval/timeframe (e.g., 1m, 5m, 1h, 1d)")
    data_period: str = Field(default="6mo", description="Historical data range (e.g., 1d, 5d, 1mo, 6mo, 1y)")
    indicator_period: int = Field(default=14, ge=1, le=200, description="Lookback period for indicator calculation")

    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "AAPL",
                "indicator": "rsi",
                "interval": "1d",
                "data_period": "6mo",
                "indicator_period": 14
            }
        }


class AnalyzeRequest(BaseModel):
    """Request model for natural language analysis"""
    message: str = Field(..., description="Natural language query about stock analysis")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Calculate RSI for AAPL with 14 period"
            }
        }

