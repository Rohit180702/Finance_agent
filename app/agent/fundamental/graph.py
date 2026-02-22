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


def ratio_agent(state: FundamentalAnalysisState) -> FundamentalAnalysisState:
    """Agent to fetch fundamental ratios"""
    try:
        result = get_fundamental_ratios.invoke({"symbol": state["symbol"]})
        state["ratio_analysis"] = result
    except Exception as e:
        state["errors"].append(f"Ratio Agent Error: {str(e)}")
        state["ratio_analysis"] = {"error": str(e), "success": False}
    return state


def cashflow_agent(state: FundamentalAnalysisState) -> FundamentalAnalysisState:
    """Agent to fetch cash flow statement"""
    try:
        result = get_cashflow_statement.invoke({"symbol": state["symbol"], "period": "annual"})
        state["cashflow_analysis"] = result
    except Exception as e:
        state["errors"].append(f"Cashflow Agent Error: {str(e)}")
        state["cashflow_analysis"] = {"error": str(e), "success": False}
    return state


def balance_sheet_agent(state: FundamentalAnalysisState) -> FundamentalAnalysisState:
    """Agent to fetch balance sheet"""
    try:
        result = get_balance_sheet.invoke({"symbol": state["symbol"], "period": "annual"})
        state["balance_sheet_analysis"] = result
    except Exception as e:
        state["errors"].append(f"Balance Sheet Agent Error: {str(e)}")
        state["balance_sheet_analysis"] = {"error": str(e), "success": False}
    return state


def pnl_agent(state: FundamentalAnalysisState) -> FundamentalAnalysisState:
    """Agent to fetch P&L statement"""
    try:
        result = get_income_statement.invoke({"symbol": state["symbol"], "period": "annual"})
        state["pnl_analysis"] = result
    except Exception as e:
        state["errors"].append(f"P&L Agent Error: {str(e)}")
        state["pnl_analysis"] = {"error": str(e), "success": False}
    return state


def consolidator_agent(state: FundamentalAnalysisState) -> FundamentalAnalysisState:
    """Consolidate all results into a comprehensive report"""

    symbol = state["symbol"]

    # Build consolidated report
    report_parts = [f"# Fundamental Analysis Report for {symbol}\n"]

    # Ratios Section
    if state.get("ratio_analysis") and state["ratio_analysis"].get("success"):
        ratios = state["ratio_analysis"]["ratios"]
        report_parts.append("\n## 📊 Key Ratios")
        report_parts.append(f"- PE Ratio: {ratios.get('pe_ratio')}")
        report_parts.append(f"- ROE: {ratios.get('roe')}")
        report_parts.append(f"- Debt/Equity: {ratios.get('debt_to_equity')}")
        report_parts.append(f"- Current Ratio: {ratios.get('current_ratio')}")

    # Cash Flow Section
    if state.get("cashflow_analysis") and state["cashflow_analysis"].get("success"):
        cf = state["cashflow_analysis"]["cashflow"]
        report_parts.append("\n## 💰 Cash Flow")
        report_parts.append(f"- Operating Cash Flow: {cf.get('operating_cashflow')}")
        report_parts.append(f"- Free Cash Flow: {cf.get('free_cashflow')}")
        report_parts.append(f"- Capital Expenditure: {cf.get('capital_expenditure')}")

    # Balance Sheet Section
    if state.get("balance_sheet_analysis") and state["balance_sheet_analysis"].get("success"):
        bs = state["balance_sheet_analysis"]["balance_sheet"]
        report_parts.append("\n## 🏦 Balance Sheet")
        report_parts.append(f"- Total Assets: {bs.get('total_assets')}")
        report_parts.append(f"- Total Liabilities: {bs.get('total_liabilities')}")
        report_parts.append(f"- Total Equity: {bs.get('total_equity')}")

    # P&L Section
    if state.get("pnl_analysis") and state["pnl_analysis"].get("success"):
        pnl = state["pnl_analysis"]["income_statement"]
        report_parts.append("\n## 📈 Profit & Loss")
        report_parts.append(f"- Revenue: {pnl.get('total_revenue')}")
        report_parts.append(f"- Operating Income: {pnl.get('operating_income')}")
        report_parts.append(f"- Net Income: {pnl.get('net_income')}")
        report_parts.append(f"- Net Margin: {pnl.get('net_margin'):.2f}%" if pnl.get('net_margin') else "- Net Margin: N/A")

    # Errors
    if state.get("errors"):
        report_parts.append("\n## ⚠️ Errors")
        for error in state["errors"]:
            report_parts.append(f"- {error}")

    state["consolidated_report"] = "\n".join(report_parts)
    state["timestamp"] = datetime.now().isoformat()

    return state


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

    # Add Redis checkpointer for conversation memory
    # Use Redis client with decode_responses=False (RedisSaver needs bytes)
    redis_client = get_redis_checkpointer_client()
    checkpointer = RedisSaver(redis_client=redis_client)

    return workflow.compile(checkpointer=checkpointer)
