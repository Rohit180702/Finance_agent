"""
Tool for fetching balance sheet data.
Enhanced to fetch all 77+ line items from Yahoo Finance.
"""

from langchain.tools import tool
import yfinance as yf
import pandas as pd


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


@tool
def get_balance_sheet(symbol: str, period: str = "annual") -> dict:
    """
    Get comprehensive balance sheet for a stock.

    Returns ALL 77+ line items including Total Assets, Liabilities, Equity,
    Current Assets/Liabilities, and 5-year historical data.

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')
        period: 'annual' or 'quarterly'

    Returns:
        Dictionary containing comprehensive balance sheet data with:
        - Latest period metrics (77+ fields)
        - Historical data (up to 5 years)
        - Calculated ratios and growth rates
        - Full statement for custom analysis
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

        # Extract key metrics for calculations
        total_assets = _safe_get(latest, "Total Assets")
        current_assets = _safe_get(latest, "Current Assets")
        current_liabilities = _safe_get(latest, "Current Liabilities")
        total_liabilities = _safe_get(latest, "Total Liabilities Net Minority Interest")
        total_equity = _safe_get(latest, "Total Equity Gross Minority Interest")
        total_debt = _safe_get(latest, "Total Debt")
        cash = _safe_get(latest, "Cash And Cash Equivalents")
        inventory = _safe_get(latest, "Inventory")

        # Build comprehensive balance sheet data
        balance_data = {
            # === TOTAL ASSETS ===
            "total_assets": total_assets,

            # === CURRENT ASSETS ===
            "current_assets": current_assets,
            "cash_and_cash_equivalents": cash,
            "cash_cash_equivalents_and_short_term_investments": _safe_get(latest, "Cash Cash Equivalents And Short Term Investments"),
            "cash_financial": _safe_get(latest, "Cash Financial"),
            "other_short_term_investments": _safe_get(latest, "Other Short Term Investments"),
            "receivables": _safe_get(latest, "Receivables"),
            "accounts_receivable": _safe_get(latest, "Accounts Receivable"),
            "gross_accounts_receivable": _safe_get(latest, "Gross Accounts Receivable"),
            "allowance_for_doubtful_accounts_receivable": _safe_get(latest, "Allowance For Doubtful Accounts Receivable"),
            "other_receivables": _safe_get(latest, "Other Receivables"),
            "inventory": inventory,
            "raw_materials": _safe_get(latest, "Raw Materials"),
            "work_in_process": _safe_get(latest, "Work In Process"),
            "finished_goods": _safe_get(latest, "Finished Goods"),
            "other_inventories": _safe_get(latest, "Other Inventories"),
            "prepaid_assets": _safe_get(latest, "Prepaid Assets"),
            "restricted_cash": _safe_get(latest, "Restricted Cash"),
            "assets_held_for_sale_current": _safe_get(latest, "Assets Held For Sale Current"),
            "hedging_assets_current": _safe_get(latest, "Hedging Assets Current"),
            "other_current_assets": _safe_get(latest, "Other Current Assets"),

            # === NON-CURRENT ASSETS ===
            "total_non_current_assets": _safe_get(latest, "Total Non Current Assets"),
            "net_ppe": _safe_get(latest, "Net PPE"),
            "gross_ppe": _safe_get(latest, "Gross PPE"),
            "accumulated_depreciation": _safe_get(latest, "Accumulated Depreciation"),
            "land_and_improvements": _safe_get(latest, "Land And Improvements"),
            "buildings_and_improvements": _safe_get(latest, "Buildings And Improvements"),
            "machinery_furniture_equipment": _safe_get(latest, "Machinery Furniture Equipment"),
            "construction_in_progress": _safe_get(latest, "Construction In Progress"),
            "leases": _safe_get(latest, "Leases"),
            "goodwill": _safe_get(latest, "Goodwill"),
            "goodwill_and_other_intangible_assets": _safe_get(latest, "Goodwill And Other Intangible Assets"),
            "other_intangible_assets": _safe_get(latest, "Other Intangible Assets"),
            "investments_and_advances": _safe_get(latest, "Investments And Advances"),
            "long_term_equity_investment": _safe_get(latest, "Long Term Equity Investment"),
            "investmentin_financial_assets": _safe_get(latest, "Investmentin Financial Assets"),
            "available_for_sale_securities": _safe_get(latest, "Available For Sale Securities"),
            "non_current_deferred_assets": _safe_get(latest, "Non Current Deferred Assets"),
            "non_current_deferred_taxes_assets": _safe_get(latest, "Non Current Deferred Taxes Assets"),
            "other_non_current_assets": _safe_get(latest, "Other Non Current Assets"),

            # === TOTAL LIABILITIES ===
            "total_liabilities_net_minority_interest": total_liabilities,

            # === CURRENT LIABILITIES ===
            "current_liabilities": current_liabilities,
            "payables_and_accrued_expenses": _safe_get(latest, "Payables And Accrued Expenses"),
            "payables": _safe_get(latest, "Payables"),
            "accounts_payable": _safe_get(latest, "Accounts Payable"),
            "total_tax_payable": _safe_get(latest, "Total Tax Payable"),
            "income_tax_payable": _safe_get(latest, "Income Tax Payable"),
            "dividends_payable": _safe_get(latest, "Dividends Payable"),
            "interest_payable": _safe_get(latest, "Interest Payable"),
            "pension_and_other_post_retirement_benefit_plans_current": _safe_get(latest, "Pensionand Other Post Retirement Benefit Plans Current"),
            "current_accrued_expenses": _safe_get(latest, "Current Accrued Expenses"),
            "current_debt": _safe_get(latest, "Current Debt"),
            "current_debt_and_capital_lease_obligation": _safe_get(latest, "Current Debt And Capital Lease Obligation"),
            "current_capital_lease_obligation": _safe_get(latest, "Current Capital Lease Obligation"),
            "current_deferred_liabilities": _safe_get(latest, "Current Deferred Liabilities"),
            "current_deferred_revenue": _safe_get(latest, "Current Deferred Revenue"),
            "other_current_liabilities": _safe_get(latest, "Other Current Liabilities"),

            # === NON-CURRENT LIABILITIES ===
            "total_non_current_liabilities_net_minority_interest": _safe_get(latest, "Total Non Current Liabilities Net Minority Interest"),
            "long_term_debt": _safe_get(latest, "Long Term Debt"),
            "long_term_debt_and_capital_lease_obligation": _safe_get(latest, "Long Term Debt And Capital Lease Obligation"),
            "long_term_capital_lease_obligation": _safe_get(latest, "Long Term Capital Lease Obligation"),
            "non_current_deferred_liabilities": _safe_get(latest, "Non Current Deferred Liabilities"),
            "non_current_deferred_taxes_liabilities": _safe_get(latest, "Non Current Deferred Taxes Liabilities"),
            "non_current_deferred_revenue": _safe_get(latest, "Non Current Deferred Revenue"),
            "tradeand_other_payables_non_current": _safe_get(latest, "Tradeand Other Payables Non Current"),
            "non_current_pension_and_other_postretirement_benefit_plans": _safe_get(latest, "Non Current Pension And Other Postretirement Benefit Plans"),
            "other_non_current_liabilities": _safe_get(latest, "Other Non Current Liabilities"),

            # === TOTAL DEBT ===
            "total_debt": total_debt,

            # === STOCKHOLDERS' EQUITY ===
            "stockholders_equity": _safe_get(latest, "Stockholders Equity"),
            "total_equity_gross_minority_interest": total_equity,
            "common_stock_equity": _safe_get(latest, "Common Stock Equity"),
            "common_stock": _safe_get(latest, "Common Stock"),
            "preferred_stock": _safe_get(latest, "Preferred Stock"),
            "additional_paid_in_capital": _safe_get(latest, "Additional Paid In Capital"),
            "retained_earnings": _safe_get(latest, "Retained Earnings"),
            "treasury_stock": _safe_get(latest, "Treasury Stock"),
            "gains_losses_not_affecting_retained_earnings": _safe_get(latest, "Gains Losses Not Affecting Retained Earnings"),
            "other_equity_adjustments": _safe_get(latest, "Other Equity Adjustments"),
            "minority_interest": _safe_get(latest, "Minority Interest"),

            # === CALCULATED RATIOS ===
            "current_ratio": _safe_divide(current_assets, current_liabilities),
            "quick_ratio": _safe_divide(
                (current_assets - inventory) if current_assets and inventory else None,
                current_liabilities
            ),
            "cash_ratio": _safe_divide(cash, current_liabilities),
            "debt_to_equity": _safe_divide(total_debt, total_equity),
            "debt_to_assets": _safe_divide(total_debt, total_assets),
            "equity_ratio": _safe_divide(total_equity, total_assets),
            "working_capital": (current_assets - current_liabilities) if current_assets and current_liabilities else None,
            "net_debt": (total_debt - cash) if total_debt and cash else None,

            # === GROWTH RATES (YoY %) ===
            "total_assets_growth": _calculate_growth(balance_sheet, "Total Assets") if len(balance_sheet.columns) > 1 else None,
            "total_equity_growth": _calculate_growth(balance_sheet, "Total Equity Gross Minority Interest") if len(balance_sheet.columns) > 1 else None,
            "total_debt_growth": _calculate_growth(balance_sheet, "Total Debt") if len(balance_sheet.columns) > 1 else None,
        }

        # Get historical data (all available periods)
        historical_data = {}
        for i, col in enumerate(balance_sheet.columns):
            period_data = balance_sheet.iloc[:, i]
            period_key = str(col.date()) if hasattr(col, 'date') else str(col)

            historical_data[period_key] = {
                "total_assets": _safe_get(period_data, "Total Assets"),
                "current_assets": _safe_get(period_data, "Current Assets"),
                "total_liabilities": _safe_get(period_data, "Total Liabilities Net Minority Interest"),
                "current_liabilities": _safe_get(period_data, "Current Liabilities"),
                "total_equity": _safe_get(period_data, "Total Equity Gross Minority Interest"),
                "total_debt": _safe_get(period_data, "Total Debt"),
                "cash": _safe_get(period_data, "Cash And Cash Equivalents"),
            }

        return {
            "symbol": symbol,
            "period": period,
            "periods_available": len(balance_sheet.columns),
            "latest_period": str(balance_sheet.columns[0].date()) if hasattr(balance_sheet.columns[0], 'date') else str(balance_sheet.columns[0]),
            "balance_sheet": balance_data,
            "historical_data": historical_data,
            "full_statement": balance_sheet.to_dict(),
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }
