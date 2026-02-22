"""
Tool for fetching fundamental ratios (PE, ROE, Debt/Equity, etc.)
"""

from langchain.tools import tool
import yfinance as yf


@tool
def get_fundamental_ratios(symbol: str) -> dict:
    """
    Get key fundamental ratios for a stock.

    Returns PE ratio, PEG ratio, ROE, ROA, Debt-to-Equity, Current Ratio,
    Dividend Yield, Market Cap, EPS, and more.

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')

    Returns:
        Dictionary containing fundamental ratios
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        return {
            "symbol": symbol,
            "ratios": {
                # Valuation Ratios
                "pe_ratio": info.get("trailingPE"),
                "forward_pe": info.get("forwardPE"),
                "peg_ratio": info.get("pegRatio"),
                "price_to_book": info.get("priceToBook"),
                "price_to_sales": info.get("priceToSalesTrailing12Months"),

                # Profitability Ratios
                "roe": info.get("returnOnEquity"),
                "roa": info.get("returnOnAssets"),
                "profit_margin": info.get("profitMargins"),
                "operating_margin": info.get("operatingMargins"),

                # Liquidity Ratios
                "current_ratio": info.get("currentRatio"),
                "quick_ratio": info.get("quickRatio"),

                # Leverage Ratios
                "debt_to_equity": info.get("debtToEquity"),
                "total_debt": info.get("totalDebt"),

                # Dividend Ratios
                "dividend_yield": info.get("dividendYield"),
                "payout_ratio": info.get("payoutRatio"),

                # Per Share Metrics
                "eps": info.get("trailingEps"),
                "book_value_per_share": info.get("bookValue"),

                # Market Metrics
                "market_cap": info.get("marketCap"),
                "enterprise_value": info.get("enterpriseValue"),
            },
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }
