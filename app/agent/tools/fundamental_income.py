"""
Tool for fetching income statement (P&L) data.
Enhanced to fetch all 50+ line items from Yahoo Finance.
"""

from langchain.tools import tool
import yfinance as yf
import pandas as pd


def _calculate_growth(df, metric):
    """Helper to calculate YoY growth"""
    try:
        if len(df.columns) < 2:
            return None
        if metric not in df.index:
            return None
        current = df.loc[metric].iloc[0]
        previous = df.loc[metric].iloc[1]
        if pd.notna(previous) and pd.notna(current) and previous != 0:
            return ((current - previous) / abs(previous)) * 100
    except:
        return None
    return None


def _safe_get(series, key, default=None):
    """Safely get value from pandas Series"""
    try:
        val = series.get(key, default)
        return None if pd.isna(val) else val
    except:
        return default


def _safe_divide(numerator, denominator, multiplier=1):
    """Safely divide two numbers"""
    try:
        if numerator is None or denominator is None or denominator == 0:
            return None
        return (numerator / denominator) * multiplier
    except:
        return None


@tool
def get_income_statement(symbol: str, period: str = "annual") -> dict:
    """
    Get comprehensive income statement (P&L) for a stock.

    Returns ALL 50+ line items including Revenue, Operating Profit, Net Profit,
    EBITDA, EPS, margins, and 5-year historical data.

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')
        period: 'annual' or 'quarterly'

    Returns:
        Dictionary containing comprehensive income statement data with:
        - Latest period metrics (50+ fields)
        - Historical data (up to 5 years)
        - Calculated margins and growth rates
        - Full statement for custom analysis
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

        # Extract key metrics for calculations
        revenue = _safe_get(latest, "Total Revenue")
        gross_profit = _safe_get(latest, "Gross Profit")
        operating_income = _safe_get(latest, "Operating Income")
        net_income = _safe_get(latest, "Net Income")
        ebitda = _safe_get(latest, "EBITDA")

        # Build comprehensive income statement data
        income_data = {
            # === REVENUE SECTION ===
            "total_revenue": revenue,
            "cost_of_revenue": _safe_get(latest, "Cost Of Revenue"),
            "gross_profit": gross_profit,

            # === OPERATING EXPENSES ===
            "operating_expense": _safe_get(latest, "Operating Expense"),
            "selling_general_administrative": _safe_get(latest, "Selling General And Administration"),
            "research_development": _safe_get(latest, "Research And Development"),
            "depreciation_amortization": _safe_get(latest, "Reconciled Depreciation"),
            "other_operating_expenses": _safe_get(latest, "Other Operating Expenses"),

            # === OPERATING INCOME ===
            "operating_income": operating_income,
            "ebitda": ebitda,
            "ebit": _safe_get(latest, "EBIT"),

            # === NON-OPERATING ITEMS ===
            "interest_expense": _safe_get(latest, "Interest Expense"),
            "interest_income": _safe_get(latest, "Interest Income"),
            "net_interest_income": _safe_get(latest, "Net Interest Income"),
            "other_income_expense": _safe_get(latest, "Other Income Expense"),
            "special_income_charges": _safe_get(latest, "Special Income Charges"),
            "gain_on_sale_of_security": _safe_get(latest, "Gain On Sale Of Security"),

            # === PRETAX INCOME ===
            "pretax_income": _safe_get(latest, "Pretax Income"),
            "tax_provision": _safe_get(latest, "Tax Provision"),
            "tax_rate_for_calcs": _safe_get(latest, "Tax Rate For Calcs"),
            "tax_effect_of_unusual_items": _safe_get(latest, "Tax Effect Of Unusual Items"),

            # === NET INCOME ===
            "net_income_common_stockholders": _safe_get(latest, "Net Income Common Stockholders"),
            "net_income": net_income,
            "net_income_continuous_operations": _safe_get(latest, "Net Income Continuous Operations"),
            "net_income_from_continuing_and_discontinued_operation": _safe_get(latest, "Net Income From Continuing And Discontinued Operation"),
            "net_income_including_noncontrolling_interests": _safe_get(latest, "Net Income Including Noncontrolling Interests"),
            "minority_interests": _safe_get(latest, "Minority Interests"),

            # === EARNINGS PER SHARE ===
            "basic_eps": _safe_get(latest, "Basic EPS"),
            "diluted_eps": _safe_get(latest, "Diluted EPS"),
            "basic_average_shares": _safe_get(latest, "Basic Average Shares"),
            "diluted_average_shares": _safe_get(latest, "Diluted Average Shares"),

            # === CALCULATED MARGINS (%) ===
            "gross_margin": _safe_divide(gross_profit, revenue, 100),
            "operating_margin": _safe_divide(operating_income, revenue, 100),
            "ebitda_margin": _safe_divide(ebitda, revenue, 100),
            "net_margin": _safe_divide(net_income, revenue, 100),
            "tax_rate": _safe_divide(_safe_get(latest, "Tax Provision"), _safe_get(latest, "Pretax Income"), 100),

            # === GROWTH RATES (YoY %) ===
            "revenue_growth": _calculate_growth(income_stmt, "Total Revenue") if len(income_stmt.columns) > 1 else None,
            "gross_profit_growth": _calculate_growth(income_stmt, "Gross Profit") if len(income_stmt.columns) > 1 else None,
            "operating_income_growth": _calculate_growth(income_stmt, "Operating Income") if len(income_stmt.columns) > 1 else None,
            "net_income_growth": _calculate_growth(income_stmt, "Net Income") if len(income_stmt.columns) > 1 else None,
            "eps_growth": _calculate_growth(income_stmt, "Diluted EPS") if len(income_stmt.columns) > 1 else None,
        }

        # Get historical data (all available periods)
        historical_data = {}
        for i, col in enumerate(income_stmt.columns):
            period_data = income_stmt.iloc[:, i]
            period_key = str(col.date()) if hasattr(col, 'date') else str(col)

            historical_data[period_key] = {
                "revenue": _safe_get(period_data, "Total Revenue"),
                "gross_profit": _safe_get(period_data, "Gross Profit"),
                "operating_income": _safe_get(period_data, "Operating Income"),
                "net_income": _safe_get(period_data, "Net Income"),
                "ebitda": _safe_get(period_data, "EBITDA"),
                "diluted_eps": _safe_get(period_data, "Diluted EPS"),
            }

        return {
            "symbol": symbol,
            "period": period,
            "periods_available": len(income_stmt.columns),
            "latest_period": str(income_stmt.columns[0].date()) if hasattr(income_stmt.columns[0], 'date') else str(income_stmt.columns[0]),
            "income_statement": income_data,
            "historical_data": historical_data,
            "full_statement": income_stmt.to_dict(),
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }
