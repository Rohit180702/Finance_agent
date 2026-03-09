"""
Tool for fetching comprehensive fundamental ratios and company info.
Enhanced to fetch all 164+ fields from Yahoo Finance ticker.info.
"""

from langchain.tools import tool
import yfinance as yf


def _safe_get(info_dict, key, default=None):
    """Safely get value from info dictionary"""
    try:
        val = info_dict.get(key, default)
        # Return None for empty strings or 'N/A'
        if val == '' or val == 'N/A':
            return None
        return val
    except:
        return default


@tool
def get_fundamental_ratios(symbol: str) -> dict:
    """
    Get comprehensive fundamental ratios and company information for a stock.

    Returns ALL 164+ fields from Yahoo Finance including:
    - Valuation ratios (PE, PEG, P/B, P/S, EV/EBITDA, etc.)
    - Profitability metrics (ROE, ROA, margins, etc.)
    - Liquidity ratios (Current, Quick, Cash ratios)
    - Leverage ratios (Debt/Equity, Debt/Assets, etc.)
    - Dividend metrics (Yield, Payout, 5-year avg, etc.)
    - Growth rates (Revenue, Earnings, etc.)
    - Per-share metrics (EPS, Book Value, Cash Flow, etc.)
    - Market metrics (Market Cap, Enterprise Value, Float, etc.)
    - Company information (Sector, Industry, Employees, etc.)
    - Analyst recommendations and targets

    Args:
        symbol: Stock ticker symbol (e.g., 'RELIANCE.NS', 'TCS.NS')

    Returns:
        Dictionary containing comprehensive fundamental data (164+ fields)
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        # Build comprehensive ratios and info dictionary
        comprehensive_data = {
            # === COMPANY INFORMATION ===
            "company_info": {
                "long_name": _safe_get(info, "longName"),
                "short_name": _safe_get(info, "shortName"),
                "symbol": _safe_get(info, "symbol"),
                "exchange": _safe_get(info, "exchange"),
                "quote_type": _safe_get(info, "quoteType"),
                "sector": _safe_get(info, "sector"),
                "industry": _safe_get(info, "industry"),
                "industry_key": _safe_get(info, "industryKey"),
                "sector_key": _safe_get(info, "sectorKey"),
                "country": _safe_get(info, "country"),
                "city": _safe_get(info, "city"),
                "state": _safe_get(info, "state"),
                "address": _safe_get(info, "address1"),
                "zip": _safe_get(info, "zip"),
                "website": _safe_get(info, "website"),
                "phone": _safe_get(info, "phone"),
                "full_time_employees": _safe_get(info, "fullTimeEmployees"),
                "business_summary": _safe_get(info, "longBusinessSummary"),
            },

            # === VALUATION RATIOS ===
            "valuation_ratios": {
                "trailing_pe": _safe_get(info, "trailingPE"),
                "forward_pe": _safe_get(info, "forwardPE"),
                "peg_ratio": _safe_get(info, "pegRatio"),
                "price_to_book": _safe_get(info, "priceToBook"),
                "price_to_sales_ttm": _safe_get(info, "priceToSalesTrailing12Months"),
                "enterprise_to_revenue": _safe_get(info, "enterpriseToRevenue"),
                "enterprise_to_ebitda": _safe_get(info, "enterpriseToEbitda"),
                "trailing_peg_ratio": _safe_get(info, "trailingPegRatio"),
            },

            # === PROFITABILITY RATIOS ===
            "profitability_ratios": {
                "return_on_equity": _safe_get(info, "returnOnEquity"),
                "return_on_assets": _safe_get(info, "returnOnAssets"),
                "profit_margins": _safe_get(info, "profitMargins"),
                "operating_margins": _safe_get(info, "operatingMargins"),
                "gross_margins": _safe_get(info, "grossMargins"),
                "ebitda_margins": _safe_get(info, "ebitdaMargins"),
            },

            # === LIQUIDITY RATIOS ===
            "liquidity_ratios": {
                "current_ratio": _safe_get(info, "currentRatio"),
                "quick_ratio": _safe_get(info, "quickRatio"),
            },

            # === LEVERAGE RATIOS ===
            "leverage_ratios": {
                "debt_to_equity": _safe_get(info, "debtToEquity"),
                "total_debt": _safe_get(info, "totalDebt"),
                "total_cash": _safe_get(info, "totalCash"),
                "total_cash_per_share": _safe_get(info, "totalCashPerShare"),
            },

            # === DIVIDEND METRICS ===
            "dividend_metrics": {
                "dividend_rate": _safe_get(info, "dividendRate"),
                "dividend_yield": _safe_get(info, "dividendYield"),
                "payout_ratio": _safe_get(info, "payoutRatio"),
                "five_year_avg_dividend_yield": _safe_get(info, "fiveYearAvgDividendYield"),
                "trailing_annual_dividend_rate": _safe_get(info, "trailingAnnualDividendRate"),
                "trailing_annual_dividend_yield": _safe_get(info, "trailingAnnualDividendYield"),
                "last_dividend_value": _safe_get(info, "lastDividendValue"),
                "last_dividend_date": _safe_get(info, "lastDividendDate"),
                "ex_dividend_date": _safe_get(info, "exDividendDate"),
            },

            # === GROWTH RATES ===
            "growth_rates": {
                "revenue_growth": _safe_get(info, "revenueGrowth"),
                "earnings_growth": _safe_get(info, "earningsGrowth"),
                "earnings_quarterly_growth": _safe_get(info, "earningsQuarterlyGrowth"),
                "revenue_per_share": _safe_get(info, "revenuePerShare"),
            },

            # === PER SHARE METRICS ===
            "per_share_metrics": {
                "trailing_eps": _safe_get(info, "trailingEps"),
                "forward_eps": _safe_get(info, "forwardEps"),
                "book_value": _safe_get(info, "bookValue"),
                "operating_cashflow_per_share": _safe_get(info, "operatingCashflow"),
                "free_cashflow_per_share": _safe_get(info, "freeCashflow"),
            },

            # === MARKET METRICS ===
            "market_metrics": {
                "market_cap": _safe_get(info, "marketCap"),
                "enterprise_value": _safe_get(info, "enterpriseValue"),
                "shares_outstanding": _safe_get(info, "sharesOutstanding"),
                "float_shares": _safe_get(info, "floatShares"),
                "shares_short": _safe_get(info, "sharesShort"),
                "shares_short_prior_month": _safe_get(info, "sharesShortPriorMonth"),
                "shares_short_previous_month_date": _safe_get(info, "sharesShortPreviousMonthDate"),
                "short_ratio": _safe_get(info, "shortRatio"),
                "short_percent_of_float": _safe_get(info, "shortPercentOfFloat"),
                "held_percent_insiders": _safe_get(info, "heldPercentInsiders"),
                "held_percent_institutions": _safe_get(info, "heldPercentInstitutions"),
                "implied_shares_outstanding": _safe_get(info, "impliedSharesOutstanding"),
            },

            # === PRICE METRICS ===
            "price_metrics": {
                "current_price": _safe_get(info, "currentPrice"),
                "previous_close": _safe_get(info, "previousClose"),
                "open": _safe_get(info, "open"),
                "day_low": _safe_get(info, "dayLow"),
                "day_high": _safe_get(info, "dayHigh"),
                "regular_market_previous_close": _safe_get(info, "regularMarketPreviousClose"),
                "regular_market_open": _safe_get(info, "regularMarketOpen"),
                "regular_market_day_low": _safe_get(info, "regularMarketDayLow"),
                "regular_market_day_high": _safe_get(info, "regularMarketDayHigh"),
                "fifty_two_week_low": _safe_get(info, "fiftyTwoWeekLow"),
                "fifty_two_week_high": _safe_get(info, "fiftyTwoWeekHigh"),
                "fifty_day_average": _safe_get(info, "fiftyDayAverage"),
                "two_hundred_day_average": _safe_get(info, "twoHundredDayAverage"),
            },

            # === VOLUME METRICS ===
            "volume_metrics": {
                "volume": _safe_get(info, "volume"),
                "regular_market_volume": _safe_get(info, "regularMarketVolume"),
                "average_volume": _safe_get(info, "averageVolume"),
                "average_volume_10days": _safe_get(info, "averageVolume10days"),
                "average_daily_volume_10day": _safe_get(info, "averageDailyVolume10Day"),
            },

            # === FINANCIAL METRICS (TTM) ===
            "financial_metrics_ttm": {
                "total_revenue": _safe_get(info, "totalRevenue"),
                "revenue_per_share": _safe_get(info, "revenuePerShare"),
                "ebitda": _safe_get(info, "ebitda"),
                "net_income_to_common": _safe_get(info, "netIncomeToCommon"),
                "total_cash": _safe_get(info, "totalCash"),
                "total_debt": _safe_get(info, "totalDebt"),
                "operating_cashflow": _safe_get(info, "operatingCashflow"),
                "free_cashflow": _safe_get(info, "freeCashflow"),
            },

            # === ANALYST RECOMMENDATIONS ===
            "analyst_data": {
                "target_high_price": _safe_get(info, "targetHighPrice"),
                "target_low_price": _safe_get(info, "targetLowPrice"),
                "target_mean_price": _safe_get(info, "targetMeanPrice"),
                "target_median_price": _safe_get(info, "targetMedianPrice"),
                "recommendation_mean": _safe_get(info, "recommendationMean"),
                "recommendation_key": _safe_get(info, "recommendationKey"),
                "number_of_analyst_opinions": _safe_get(info, "numberOfAnalystOpinions"),
            },

            # === TRADING INFORMATION ===
            "trading_info": {
                "bid": _safe_get(info, "bid"),
                "ask": _safe_get(info, "ask"),
                "bid_size": _safe_get(info, "bidSize"),
                "ask_size": _safe_get(info, "askSize"),
                "beta": _safe_get(info, "beta"),
                "trailing_annual_dividend_rate": _safe_get(info, "trailingAnnualDividendRate"),
                "trailing_annual_dividend_yield": _safe_get(info, "trailingAnnualDividendYield"),
            },

            # === GOVERNANCE & RISK ===
            "governance_risk": {
                "audit_risk": _safe_get(info, "auditRisk"),
                "board_risk": _safe_get(info, "boardRisk"),
                "compensation_risk": _safe_get(info, "compensationRisk"),
                "shareholder_rights_risk": _safe_get(info, "shareHolderRightsRisk"),
                "overall_risk": _safe_get(info, "overallRisk"),
                "governance_epoch_date": _safe_get(info, "governanceEpochDate"),
                "compensation_as_of_epoch_date": _safe_get(info, "compensationAsOfEpochDate"),
            },
        }

        return {
            "symbol": symbol,
            "data": comprehensive_data,
            "raw_info": info,  # Include raw info for any missing fields
            "success": True
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "error": str(e),
            "success": False
        }
