"""
Tool for fetching cash flow statement data.
Enhanced to fetch all 47+ line items from Yahoo Finance.
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
def get_cashflow_statement(symbol: str, period: str = "annual") -> dict:
    """
    Get comprehensive cash flow statement for a stock.

    Returns ALL 47+ line items including Operating Cash Flow, Free Cash Flow,
    Investing/Financing activities, and 5-year historical data.

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')
        period: 'annual' or 'quarterly'

    Returns:
        Dictionary containing comprehensive cash flow data with:
        - Latest period metrics (47+ fields)
        - Historical data (up to 5 years)
        - Calculated metrics and growth rates
        - Full statement for custom analysis
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

        # Extract key metrics for calculations
        operating_cf = _safe_get(latest, "Operating Cash Flow")
        capex = _safe_get(latest, "Capital Expenditure")
        free_cf = _safe_get(latest, "Free Cash Flow")
        net_income = _safe_get(latest, "Net Income From Continuing Operations")

        # Build comprehensive cash flow data
        cashflow_data = {
            # === OPERATING ACTIVITIES ===
            "operating_cash_flow": operating_cf,
            "net_income_from_continuing_operations": net_income,

            # Adjustments to reconcile net income to cash flow
            "depreciation_depletion_and_amortization": _safe_get(latest, "Depreciation Depletion And Amortization"),
            "depreciation_and_amortization": _safe_get(latest, "Depreciation And Amortization"),
            "depreciation": _safe_get(latest, "Depreciation"),
            "amortization_of_intangibles": _safe_get(latest, "Amortization Of Intangibles"),
            "amortization_cash_flow": _safe_get(latest, "Amortization Cash Flow"),
            "deferred_tax": _safe_get(latest, "Deferred Tax"),
            "deferred_income_tax": _safe_get(latest, "Deferred Income Tax"),
            "stock_based_compensation": _safe_get(latest, "Stock Based Compensation"),

            # Changes in working capital
            "change_in_working_capital": _safe_get(latest, "Change In Working Capital"),
            "change_in_receivables": _safe_get(latest, "Change In Receivables"),
            "changes_in_account_receivables": _safe_get(latest, "Changes In Account Receivables"),
            "change_in_inventory": _safe_get(latest, "Change In Inventory"),
            "change_in_prepaid_assets": _safe_get(latest, "Change In Prepaid Assets"),
            "change_in_payables_and_accrued_expense": _safe_get(latest, "Change In Payables And Accrued Expense"),
            "change_in_payable": _safe_get(latest, "Change In Payable"),
            "change_in_account_payable": _safe_get(latest, "Change In Account Payable"),
            "change_in_tax_payable": _safe_get(latest, "Change In Tax Payable"),
            "change_in_income_tax_payable": _safe_get(latest, "Change In Income Tax Payable"),
            "change_in_dividend_payable": _safe_get(latest, "Change In Dividend Payable"),
            "change_in_accrued_expense": _safe_get(latest, "Change In Accrued Expense"),
            "change_in_other_working_capital": _safe_get(latest, "Change In Other Working Capital"),
            "change_in_other_current_assets": _safe_get(latest, "Change In Other Current Assets"),
            "change_in_other_current_liabilities": _safe_get(latest, "Change In Other Current Liabilities"),

            # Other operating items
            "other_non_cash_items": _safe_get(latest, "Other Non Cash Items"),
            "gain_loss_on_investment_securities": _safe_get(latest, "Gain Loss On Investment Securities"),
            "gain_loss_on_sale_of_ppe": _safe_get(latest, "Gain Loss On Sale Of PPE"),
            "earnings_losses_from_equity_investments": _safe_get(latest, "Earnings Losses From Equity Investments"),
            "provision_and_write_off_of_assets": _safe_get(latest, "Provision And Write Off Of Assets"),
            "asset_impairment_charge": _safe_get(latest, "Asset Impairment Charge"),

            # === INVESTING ACTIVITIES ===
            "investing_cash_flow": _safe_get(latest, "Investing Cash Flow"),
            "capital_expenditure": capex,
            "net_ppe_purchase_and_sale": _safe_get(latest, "Net PPE Purchase And Sale"),
            "purchase_of_ppe": _safe_get(latest, "Purchase Of PPE"),
            "sale_of_ppe": _safe_get(latest, "Sale Of PPE"),
            "net_investment_purchase_and_sale": _safe_get(latest, "Net Investment Purchase And Sale"),
            "purchase_of_investment": _safe_get(latest, "Purchase Of Investment"),
            "sale_of_investment": _safe_get(latest, "Sale Of Investment"),
            "net_business_purchase_and_sale": _safe_get(latest, "Net Business Purchase And Sale"),
            "purchase_of_business": _safe_get(latest, "Purchase Of Business"),
            "sale_of_business": _safe_get(latest, "Sale Of Business"),
            "net_intangibles_purchase_and_sale": _safe_get(latest, "Net Intangibles Purchase And Sale"),
            "purchase_of_intangibles": _safe_get(latest, "Purchase Of Intangibles"),
            "sale_of_intangibles": _safe_get(latest, "Sale Of Intangibles"),
            "net_other_investing_changes": _safe_get(latest, "Net Other Investing Changes"),

            # === FINANCING ACTIVITIES ===
            "financing_cash_flow": _safe_get(latest, "Financing Cash Flow"),
            "cash_dividends_paid": _safe_get(latest, "Cash Dividends Paid"),
            "common_stock_dividend_paid": _safe_get(latest, "Common Stock Dividend Paid"),
            "preferred_stock_dividend_paid": _safe_get(latest, "Preferred Stock Dividend Paid"),
            "net_common_stock_issuance": _safe_get(latest, "Net Common Stock Issuance"),
            "common_stock_issuance": _safe_get(latest, "Common Stock Issuance"),
            "common_stock_payments": _safe_get(latest, "Common Stock Payments"),
            "net_preferred_stock_issuance": _safe_get(latest, "Net Preferred Stock Issuance"),
            "preferred_stock_issuance": _safe_get(latest, "Preferred Stock Issuance"),
            "preferred_stock_payments": _safe_get(latest, "Preferred Stock Payments"),
            "net_issuance_payments_of_debt": _safe_get(latest, "Net Issuance Payments Of Debt"),
            "net_short_term_debt_issuance": _safe_get(latest, "Net Short Term Debt Issuance"),
            "short_term_debt_issuance": _safe_get(latest, "Short Term Debt Issuance"),
            "short_term_debt_payments": _safe_get(latest, "Short Term Debt Payments"),
            "net_long_term_debt_issuance": _safe_get(latest, "Net Long Term Debt Issuance"),
            "long_term_debt_issuance": _safe_get(latest, "Long Term Debt Issuance"),
            "long_term_debt_payments": _safe_get(latest, "Long Term Debt Payments"),
            "repayment_of_debt": _safe_get(latest, "Repayment Of Debt"),
            "issuance_of_debt": _safe_get(latest, "Issuance Of Debt"),
            "repurchase_of_capital_stock": _safe_get(latest, "Repurchase Of Capital Stock"),
            "net_other_financing_charges": _safe_get(latest, "Net Other Financing Charges"),

            # === CASH POSITION ===
            "free_cash_flow": free_cf,
            "beginning_cash_position": _safe_get(latest, "Beginning Cash Position"),
            "end_cash_position": _safe_get(latest, "End Cash Position"),
            "changes_in_cash": _safe_get(latest, "Changes In Cash"),
            "effect_of_exchange_rate_changes": _safe_get(latest, "Effect Of Exchange Rate Changes"),

            # === CALCULATED METRICS ===
            "operating_cf_to_net_income": _safe_divide(operating_cf, net_income) if net_income else None,
            "free_cf_to_operating_cf": _safe_divide(free_cf, operating_cf, 100) if operating_cf else None,
            "capex_to_operating_cf": _safe_divide(abs(capex) if capex else None, operating_cf, 100) if operating_cf else None,

            # === GROWTH RATES (YoY %) ===
            "operating_cf_growth": _calculate_growth(cashflow, "Operating Cash Flow") if len(cashflow.columns) > 1 else None,
            "free_cf_growth": _calculate_growth(cashflow, "Free Cash Flow") if len(cashflow.columns) > 1 else None,
            "capex_growth": _calculate_growth(cashflow, "Capital Expenditure") if len(cashflow.columns) > 1 else None,
        }

        # Get historical data (all available periods)
        historical_data = {}
        for i, col in enumerate(cashflow.columns):
            period_data = cashflow.iloc[:, i]
            period_key = str(col.date()) if hasattr(col, 'date') else str(col)

            historical_data[period_key] = {
                "operating_cash_flow": _safe_get(period_data, "Operating Cash Flow"),
                "free_cash_flow": _safe_get(period_data, "Free Cash Flow"),
                "investing_cash_flow": _safe_get(period_data, "Investing Cash Flow"),
                "financing_cash_flow": _safe_get(period_data, "Financing Cash Flow"),
                "capital_expenditure": _safe_get(period_data, "Capital Expenditure"),
                "end_cash_position": _safe_get(period_data, "End Cash Position"),
            }

        return {
            "symbol": symbol,
            "period": period,
            "periods_available": len(cashflow.columns),
            "latest_period": str(cashflow.columns[0].date()) if hasattr(cashflow.columns[0], 'date') else str(cashflow.columns[0]),
            "cashflow": cashflow_data,
            "historical_data": historical_data,
            "full_statement": cashflow.to_dict(),
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }
