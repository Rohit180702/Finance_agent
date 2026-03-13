"""
SQLAlchemy ORM models.

Tables
------
stock_metrics_history
    One row per (symbol, date). The nightly background job inserts a snapshot
    of all fundamental metrics so we can track how PE, ROE, D/E, etc. change
    over time — enabling screener filtering by trend, not just point-in-time.

stock_prices
    One row per (symbol, date). OHLCV data fetched from yfinance.
    Used by the chart feature so we can serve historical price data from our
    own DB instead of hitting yfinance on every chart load.
"""

from datetime import date, datetime
from sqlalchemy import (
    BigInteger, Column, Date, DateTime, Float,
    Index, Integer, String, UniqueConstraint,
)
from sqlalchemy.sql import func
from app.db.base import Base


class StockMetricsHistory(Base):
    """Daily fundamental snapshot for every NSE stock."""

    __tablename__ = "stock_metrics_history"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol        = Column(String(32),  nullable=False, index=True)
    name          = Column(String(256), nullable=True)
    sector        = Column(String(128), nullable=True)
    snapshot_date = Column(Date, nullable=False, default=date.today, index=True)

    # Price & size
    price         = Column(Float, nullable=True)
    market_cap_cr = Column(Float, nullable=True)   # Crores

    # Valuation
    pe            = Column(Float, nullable=True)
    pb            = Column(Float, nullable=True)

    # Profitability (stored as %, e.g. 15.2 = 15.2%)
    roe           = Column(Float, nullable=True)
    roa           = Column(Float, nullable=True)
    net_margin    = Column(Float, nullable=True)

    # Financial health
    debt_equity   = Column(Float, nullable=True)

    # Growth & income
    revenue_growth  = Column(Float, nullable=True)
    dividend_yield  = Column(Float, nullable=True)

    # 52-week range
    week52_high   = Column(Float, nullable=True)
    week52_low    = Column(Float, nullable=True)

    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # One snapshot per stock per day — no duplicates
        UniqueConstraint("symbol", "snapshot_date", name="uq_metrics_symbol_date"),
        Index("ix_metrics_symbol_date", "symbol", "snapshot_date"),
    )

    def to_dict(self) -> dict:
        return {
            "symbol":           self.symbol,
            "name":             self.name,
            "sector":           self.sector,
            "price":            self.price,
            "market_cap_cr":    self.market_cap_cr,
            "pe":               self.pe,
            "pb":               self.pb,
            "roe":              self.roe,
            "roa":              self.roa,
            "debt_equity":      self.debt_equity,
            "net_margin":       self.net_margin,
            "revenue_growth":   self.revenue_growth,
            "dividend_yield":   self.dividend_yield,
            "week52_high":      self.week52_high,
            "week52_low":       self.week52_low,
        }


class StockPrice(Base):
    """Daily OHLCV candlestick data — the backbone for charts."""

    __tablename__ = "stock_prices"

    id       = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol   = Column(String(32),  nullable=False, index=True)
    date     = Column(Date,        nullable=False, index=True)

    open     = Column(Float, nullable=True)
    high     = Column(Float, nullable=True)
    low      = Column(Float, nullable=True)
    close    = Column(Float, nullable=True)
    volume   = Column(BigInteger, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("symbol", "date", name="uq_price_symbol_date"),
        Index("ix_price_symbol_date", "symbol", "date"),
    )
