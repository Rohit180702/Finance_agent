"""
Tool for fundamental analysis - integrates with chat agent.
"""

from langchain.tools import tool
from app.agent.tools.fundamental_ratios import get_fundamental_ratios
from app.agent.tools.fundamental_cashflow import get_cashflow_statement
from app.agent.tools.fundamental_balance_sheet import get_balance_sheet
from app.agent.tools.fundamental_income import get_income_statement


@tool
def analyze_fundamentals(
    symbol: str,
    analysis_type: str = "all"
) -> dict:
    """
    Perform fundamental analysis on a stock.
    
    Can run specific analysis or all analyses based on what user asks for.
    
    Args:
        symbol: Stock ticker (e.g., 'RELIANCE.NS', 'TCS.NS')
        analysis_type: Type of analysis to run:
            - 'all': Run all 4 analyses (ratios, cashflow, balance_sheet, income)
            - 'ratios': Only fundamental ratios (PE, ROE, Debt/Equity, etc.)
            - 'cashflow': Only cash flow statement
            - 'balance_sheet': Only balance sheet
            - 'income': Only income statement (P&L)
    
    Returns:
        Dictionary with requested analysis results
    
    Examples:
        - "What's the PE ratio of RELIANCE?" → analysis_type='ratios'
        - "Show me balance sheet of TCS" → analysis_type='balance_sheet'
        - "Analyze INFY fundamentals" → analysis_type='all'
    """
    
    results = {
        "symbol": symbol,
        "analysis_type": analysis_type,
        "success": True,
        "data": {}
    }
    
    try:
        if analysis_type == "all":
            # Run all 4 analyses
            results["data"]["ratios"] = get_fundamental_ratios.invoke({"symbol": symbol})
            results["data"]["cashflow"] = get_cashflow_statement.invoke({"symbol": symbol})
            results["data"]["balance_sheet"] = get_balance_sheet.invoke({"symbol": symbol})
            results["data"]["income"] = get_income_statement.invoke({"symbol": symbol})
            
        elif analysis_type == "ratios":
            results["data"]["ratios"] = get_fundamental_ratios.invoke({"symbol": symbol})
            
        elif analysis_type == "cashflow":
            results["data"]["cashflow"] = get_cashflow_statement.invoke({"symbol": symbol})
            
        elif analysis_type == "balance_sheet":
            results["data"]["balance_sheet"] = get_balance_sheet.invoke({"symbol": symbol})
            
        elif analysis_type == "income" or analysis_type == "pnl":
            results["data"]["income"] = get_income_statement.invoke({"symbol": symbol})
            
        else:
            results["success"] = False
            results["error"] = f"Invalid analysis_type: {analysis_type}. Use 'all', 'ratios', 'cashflow', 'balance_sheet', or 'income'"
    
    except Exception as e:
        results["success"] = False
        results["error"] = str(e)
    
    return results

