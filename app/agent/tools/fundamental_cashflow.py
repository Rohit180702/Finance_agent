"""
Tool for fetching cash flow statement data.
"""

from langchain.tools import tool
import yfinance as yf


@tool
def get_cashflow_statement(symbol: str, period: str = "annual") -> dict:
    """
    Get cash flow statement for a stock.

    Returns Operating Cash Flow, Free Cash Flow, Investing Cash Flow,
    Financing Cash Flow, and related metrics.

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')
        period: 'annual' or 'quarterly'

    Returns:
        Dictionary containing cash flow data
    """
    try:
        ticker = yf.Ticker(symbol)

        # Get cash flow statement
        if period == "quarterly":
            cashflow = ticker.quarterly_cashflow
        else:
            cashflow = ticker.cashflow

        if cashflow.empty:
            return {
                "symbol": symbol,
                "error": "No cash flow data available",
                "success": False
            }

        # Get the most recent column (latest period)
        latest = cashflow.iloc[:, 0]

        return {
            "symbol": symbol,
            "period": period,
            "cashflow": {
                # Operating Activities
                "operating_cashflow": latest.get("Operating Cash Flow"),
                "capital_expenditure": latest.get("Capital Expenditure"),
                "free_cashflow": latest.get("Free Cash Flow"),

                # Investing Activities
                "investing_cashflow": latest.get("Investing Cash Flow"),
                "purchase_of_investments": latest.get("Purchase Of Investment"),
                "sale_of_investments": latest.get("Sale Of Investment"),

                # Financing Activities
                "financing_cashflow": latest.get("Financing Cash Flow"),
                "dividends_paid": latest.get("Cash Dividends Paid"),
                "debt_repayment": latest.get("Repayment Of Debt"),
                "issuance_of_debt": latest.get("Issuance Of Debt"),

                # Other
                "change_in_cash": latest.get("Change In Cash"),
                "beginning_cash": latest.get("Beginning Cash Position"),
                "end_cash": latest.get("End Cash Position"),
            },
            "full_statement": cashflow.to_dict(),
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }
