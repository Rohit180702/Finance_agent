"""
LangGraph workflow for parallel fundamental analysis.
"""

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.redis import RedisSaver
from app.agent.fundamental.state import FundamentalAnalysisState
from app.agent.tools.fundamental_ratios import get_fundamental_ratios
from app.agent.tools.fundamental_cashflow import get_cashflow_statement
from app.agent.tools.fundamental_balance_sheet import get_balance_sheet
from app.agent.tools.fundamental_income import get_income_statement
from app.core.redis_client import get_redis_checkpointer_client
from datetime import datetime
import numpy as np


def _convert_numpy_types(obj):
    """
    Recursively convert numpy types and non-string dict keys to native Python types for msgpack serialization.
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        # Convert dict keys to strings and recursively convert values
        return {str(key): _convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [_convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(_convert_numpy_types(item) for item in obj)
    else:
        return obj


def ratio_agent(state: FundamentalAnalysisState) -> dict:
    """Agent to fetch fundamental ratios"""
    try:
        result = get_fundamental_ratios.invoke({"symbol": state["symbol"]})
        # Convert numpy types to native Python types for serialization
        result = _convert_numpy_types(result)
        return {"ratio_analysis": result}
    except Exception as e:
        return {
            "errors": [f"Ratio Agent Error: {str(e)}"],
            "ratio_analysis": {"error": str(e), "success": False}
        }


def cashflow_agent(state: FundamentalAnalysisState) -> dict:
    """Agent to fetch cash flow statement"""
    try:
        result = get_cashflow_statement.invoke({"symbol": state["symbol"], "period": "annual"})
        # Convert numpy types to native Python types for serialization
        result = _convert_numpy_types(result)
        return {"cashflow_analysis": result}
    except Exception as e:
        return {
            "errors": [f"Cashflow Agent Error: {str(e)}"],
            "cashflow_analysis": {"error": str(e), "success": False}
        }


def balance_sheet_agent(state: FundamentalAnalysisState) -> dict:
    """Agent to fetch balance sheet"""
    try:
        result = get_balance_sheet.invoke({"symbol": state["symbol"], "period": "annual"})
        # Convert numpy types to native Python types for serialization
        result = _convert_numpy_types(result)
        return {"balance_sheet_analysis": result}
    except Exception as e:
        return {
            "errors": [f"Balance Sheet Agent Error: {str(e)}"],
            "balance_sheet_analysis": {"error": str(e), "success": False}
        }


def pnl_agent(state: FundamentalAnalysisState) -> dict:
    """Agent to fetch P&L statement"""
    try:
        result = get_income_statement.invoke({"symbol": state["symbol"], "period": "annual"})
        # Convert numpy types to native Python types for serialization
        result = _convert_numpy_types(result)
        return {"pnl_analysis": result}
    except Exception as e:
        return {
            "errors": [f"P&L Agent Error: {str(e)}"],
            "pnl_analysis": {"error": str(e), "success": False}
        }


def consolidator_agent(state: FundamentalAnalysisState) -> dict:
    """Consolidate all results into a comprehensive report"""
    symbol = state["symbol"]
    report_parts = [f"# Fundamental Analysis Report for {symbol}\n"]

    # Company Info Section
    if state.get("ratio_analysis") and state["ratio_analysis"].get("success"):
        data = state["ratio_analysis"].get("data", {})
        company_info = data.get("company_info", {})

        if company_info.get("long_name"):
            report_parts.append(f"\n## 🏢 Company Information")
            report_parts.append(f"- **Name**: {company_info.get('long_name')}")
            report_parts.append(f"- **Sector**: {company_info.get('sector')}")
            report_parts.append(f"- **Industry**: {company_info.get('industry')}")
            report_parts.append(f"- **Country**: {company_info.get('country')}")
            if company_info.get('full_time_employees'):
                report_parts.append(f"- **Employees**: {company_info.get('full_time_employees'):,}")

    # Ratios Section
    if state.get("ratio_analysis") and state["ratio_analysis"].get("success"):
        data = state["ratio_analysis"].get("data", {})
        valuation = data.get("valuation_ratios", {})
        profitability = data.get("profitability_ratios", {})
        liquidity = data.get("liquidity_ratios", {})
        leverage = data.get("leverage_ratios", {})

        report_parts.append("\n## 📊 Key Ratios")
        if valuation:
            report_parts.append("\n**Valuation:**")
            if valuation.get('trailing_pe'):
                report_parts.append(f"- PE Ratio (TTM): {valuation.get('trailing_pe'):.2f}")
            if valuation.get('forward_pe'):
                report_parts.append(f"- Forward PE: {valuation.get('forward_pe'):.2f}")
            if valuation.get('price_to_book'):
                report_parts.append(f"- Price/Book: {valuation.get('price_to_book'):.2f}")

        if profitability:
            report_parts.append("\n**Profitability:**")
            if profitability.get('return_on_equity'):
                report_parts.append(f"- ROE: {profitability.get('return_on_equity')*100:.2f}%")
            if profitability.get('return_on_assets'):
                report_parts.append(f"- ROA: {profitability.get('return_on_assets')*100:.2f}%")
            if profitability.get('profit_margins'):
                report_parts.append(f"- Net Margin: {profitability.get('profit_margins')*100:.2f}%")

        if liquidity or leverage:
            report_parts.append("\n**Financial Health:**")
            if liquidity.get('current_ratio'):
                report_parts.append(f"- Current Ratio: {liquidity.get('current_ratio'):.2f}")
            if leverage.get('debt_to_equity'):
                report_parts.append(f"- Debt/Equity: {leverage.get('debt_to_equity'):.2f}")

    # Cash Flow Section
    if state.get("cashflow_analysis") and state["cashflow_analysis"].get("success"):
        cf = state["cashflow_analysis"]["cashflow"]
        report_parts.append("\n## 💰 Cash Flow Analysis")
        if cf.get('operating_cash_flow'):
            report_parts.append(f"- Operating Cash Flow: ${cf.get('operating_cash_flow'):,.0f}")
        if cf.get('free_cash_flow'):
            report_parts.append(f"- Free Cash Flow: ${cf.get('free_cash_flow'):,.0f}")

    # Balance Sheet Section
    if state.get("balance_sheet_analysis") and state["balance_sheet_analysis"].get("success"):
        bs = state["balance_sheet_analysis"]["balance_sheet"]
        report_parts.append("\n## 🏦 Balance Sheet")
        if bs.get('total_assets'):
            report_parts.append(f"- Total Assets: ${bs.get('total_assets'):,.0f}")
        if bs.get('total_equity_gross_minority_interest'):
            report_parts.append(f"- Total Equity: ${bs.get('total_equity_gross_minority_interest'):,.0f}")

    # P&L Section
    if state.get("pnl_analysis") and state["pnl_analysis"].get("success"):
        pnl = state["pnl_analysis"]["income_statement"]
        report_parts.append("\n## 📈 Profit & Loss")
        if pnl.get('total_revenue'):
            report_parts.append(f"- Total Revenue: ${pnl.get('total_revenue'):,.0f}")
        if pnl.get('net_income'):
            report_parts.append(f"- Net Income: ${pnl.get('net_income'):,.0f}")

    return {
        "consolidated_report": "\n".join(report_parts),
        "timestamp": datetime.now().isoformat()
    }


def create_fundamental_analysis_graph():
    """Create the parallel fundamental analysis workflow"""

    workflow = StateGraph(FundamentalAnalysisState)

    # Add all agent nodes
    workflow.add_node("ratio_agent", ratio_agent)
    workflow.add_node("cashflow_agent", cashflow_agent)
    workflow.add_node("balance_sheet_agent", balance_sheet_agent)
    workflow.add_node("pnl_agent", pnl_agent)
    workflow.add_node("consolidator", consolidator_agent)

    # Parallel execution: All 4 agents run simultaneously
    workflow.add_edge(START, "ratio_agent")
    workflow.add_edge(START, "cashflow_agent")
    workflow.add_edge(START, "balance_sheet_agent")
    workflow.add_edge(START, "pnl_agent")

    # All agents feed into consolidator
    workflow.add_edge("ratio_agent", "consolidator")
    workflow.add_edge("cashflow_agent", "consolidator")
    workflow.add_edge("balance_sheet_agent", "consolidator")
    workflow.add_edge("pnl_agent", "consolidator")

    # Consolidator ends the workflow
    workflow.add_edge("consolidator", END)

    # Add Redis checkpointer for conversation memory (optional)
    # If Redis is not available, compile without checkpointer
    try:
        redis_client = get_redis_checkpointer_client()
        redis_client.ping()  # Test connection
        checkpointer = RedisSaver(redis_client=redis_client)

        # CRITICAL: Must call setup() to initialize internal structures
        checkpointer.setup()

        print("✅ Fundamental analysis graph compiled with Redis checkpointer")
        return workflow.compile(checkpointer=checkpointer)
    except Exception as e:
        print(f"⚠️  Redis not available, compiling without checkpointer: {e}")
        return workflow.compile()
