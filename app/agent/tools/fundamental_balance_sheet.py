"""
Tool for fetching balance sheet data.
"""

from langchain.tools import tool
import yfinance as yf


@tool
def get_balance_sheet(symbol: str, period: str = "annual") -> dict:
    """
    Get balance sheet for a stock.

    Returns Total Assets, Total Liabilities, Total Equity, Current Assets,
    Current Liabilities, and related metrics.

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')
        period: 'annual' or 'quarterly'

    Returns:
        Dictionary containing balance sheet data
    """
    try:
        ticker = yf.Ticker(symbol)

        # Get balance sheet
        if period == "quarterly":
            balance_sheet = ticker.quarterly_balance_sheet
        else:
            balance_sheet = ticker.balance_sheet

        if balance_sheet.empty:
            return {
                "symbol": symbol,
                "error": "No balance sheet data available",
                "success": False
            }

        # Get the most recent column (latest period)
        latest = balance_sheet.iloc[:, 0]

        return {
            "symbol": symbol,
            "period": period,
            "balance_sheet": {
                # Assets
                "total_assets": latest.get("Total Assets"),
                "current_assets": latest.get("Current Assets"),
                "cash_and_equivalents": latest.get("Cash And Cash Equivalents"),
                "inventory": latest.get("Inventory"),
                "receivables": latest.get("Receivables"),
                "total_non_current_assets": latest.get("Total Non Current Assets"),
                "property_plant_equipment": latest.get("Net PPE"),
                "intangible_assets": latest.get("Goodwill And Other Intangible Assets"),

                # Liabilities
                "total_liabilities": latest.get("Total Liabilities Net Minority Interest"),
                "current_liabilities": latest.get("Current Liabilities"),
                "accounts_payable": latest.get("Payables"),
                "short_term_debt": latest.get("Current Debt"),
                "long_term_debt": latest.get("Long Term Debt"),
                "total_debt": latest.get("Total Debt"),

                # Equity
                "total_equity": latest.get("Total Equity Gross Minority Interest"),
                "retained_earnings": latest.get("Retained Earnings"),
                "common_stock": latest.get("Common Stock"),

                # Calculated Ratios
                "current_ratio": (
                    latest.get("Current Assets") / latest.get("Current Liabilities")
                    if latest.get("Current Liabilities") else None
                ),
                "debt_to_equity": (
                    latest.get("Total Debt") / latest.get("Total Equity Gross Minority Interest")
                    if latest.get("Total Equity Gross Minority Interest") else None
                ),
            },
            "full_statement": balance_sheet.to_dict(),
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }
