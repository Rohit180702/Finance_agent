"""
Tool for fetching income statement (P&L) data.
"""

from langchain.tools import tool
import yfinance as yf


@tool
def get_income_statement(symbol: str, period: str = "annual") -> dict:
    """
    Get income statement (Profit & Loss) for a stock.

    Returns Revenue, Operating Profit, Net Profit, EBITDA, EPS,
    and various margins.

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')
        period: 'annual' or 'quarterly'

    Returns:
        Dictionary containing income statement data
    """
    try:
        ticker = yf.Ticker(symbol)

        # Get income statement
        if period == "quarterly":
            income_stmt = ticker.quarterly_income_stmt
        else:
            income_stmt = ticker.income_stmt

        if income_stmt.empty:
            return {
                "symbol": symbol,
                "error": "No income statement data available",
                "success": False
            }

        # Get the most recent column (latest period)
        latest = income_stmt.iloc[:, 0]

        # Calculate margins
        revenue = latest.get("Total Revenue")
        gross_profit = latest.get("Gross Profit")
        operating_income = latest.get("Operating Income")
        net_income = latest.get("Net Income")

        return {
            "symbol": symbol,
            "period": period,
            "income_statement": {
                # Revenue
                "total_revenue": revenue,
                "cost_of_revenue": latest.get("Cost Of Revenue"),
                "gross_profit": gross_profit,

                # Operating Metrics
                "operating_expense": latest.get("Operating Expense"),
                "operating_income": operating_income,
                "ebitda": latest.get("EBITDA"),
                "ebit": latest.get("EBIT"),

                # Profit Metrics
                "pretax_income": latest.get("Pretax Income"),
                "tax_provision": latest.get("Tax Provision"),
                "net_income": net_income,
                "net_income_continuous_operations": latest.get("Net Income Continuous Operations"),

                # Per Share Metrics
                "basic_eps": latest.get("Basic EPS"),
                "diluted_eps": latest.get("Diluted EPS"),

                # Margins (calculated)
                "gross_margin": (gross_profit / revenue * 100) if revenue else None,
                "operating_margin": (operating_income / revenue * 100) if revenue else None,
                "net_margin": (net_income / revenue * 100) if revenue else None,

                # Growth (if multiple periods available)
                "revenue_growth": self._calculate_growth(income_stmt, "Total Revenue") if len(income_stmt.columns) > 1 else None,
            },
            "full_statement": income_stmt.to_dict(),
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }

def _calculate_growth(df, metric):
    """Helper to calculate YoY growth"""
    try:
        if len(df.columns) < 2:
            return None
        current = df[metric].iloc[0]
        previous = df[metric].iloc[1]
        if previous and current:
            return ((current - previous) / abs(previous)) * 100
    except:
        return None
    return None
