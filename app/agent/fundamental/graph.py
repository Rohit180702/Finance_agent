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
import json
import os


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


def _build_llm_context(symbol: str, state: FundamentalAnalysisState) -> dict:
    """Extract the structured data from all agents, excluding large raw/full dumps."""
    ctx = {}

    if state.get("ratio_analysis") and state["ratio_analysis"].get("success"):
        data = state["ratio_analysis"].get("data", {})
        # Exclude raw_info — it's 164+ fields and adds no extra value for the LLM
        ctx["company_info"] = data.get("company_info", {})
        ctx["valuation_ratios"] = data.get("valuation_ratios", {})
        ctx["profitability_ratios"] = data.get("profitability_ratios", {})
        ctx["liquidity_ratios"] = data.get("liquidity_ratios", {})
        ctx["leverage_ratios"] = data.get("leverage_ratios", {})
        ctx["dividend_metrics"] = data.get("dividend_metrics", {})
        ctx["growth_rates"] = data.get("growth_rates", {})
        ctx["per_share_metrics"] = data.get("per_share_metrics", {})
        ctx["market_metrics"] = data.get("market_metrics", {})
        ctx["price_metrics"] = data.get("price_metrics", {})
        ctx["analyst_data"] = data.get("analyst_data", {})
        ctx["governance_risk"] = data.get("governance_risk", {})

    if state.get("cashflow_analysis") and state["cashflow_analysis"].get("success"):
        ctx["cash_flow"] = state["cashflow_analysis"].get("cashflow", {})
        ctx["cash_flow_historical"] = state["cashflow_analysis"].get("historical_data", {})

    if state.get("balance_sheet_analysis") and state["balance_sheet_analysis"].get("success"):
        ctx["balance_sheet"] = state["balance_sheet_analysis"].get("balance_sheet", {})
        ctx["balance_sheet_historical"] = state["balance_sheet_analysis"].get("historical_data", {})

    if state.get("pnl_analysis") and state["pnl_analysis"].get("success"):
        ctx["income_statement"] = state["pnl_analysis"].get("income_statement", {})
        ctx["income_historical"] = state["pnl_analysis"].get("historical_data", {})

    return ctx


def _build_fallback_report(symbol: str, state: FundamentalAnalysisState) -> str:
    """Simple formatted report used as a fallback if LLM call fails."""
    parts = [f"# Fundamental Analysis Report for {symbol}\n"]

    if state.get("ratio_analysis") and state["ratio_analysis"].get("success"):
        data = state["ratio_analysis"].get("data", {})
        info = data.get("company_info", {})
        if info.get("long_name"):
            parts += [
                "\n## 🏢 Company Information",
                f"- **Name**: {info.get('long_name')}",
                f"- **Sector**: {info.get('sector')}",
                f"- **Industry**: {info.get('industry')}",
                f"- **Country**: {info.get('country')}",
            ]
            if info.get("full_time_employees"):
                parts.append(f"- **Employees**: {info['full_time_employees']:,}")

        val = data.get("valuation_ratios", {})
        prof = data.get("profitability_ratios", {})
        liq = data.get("liquidity_ratios", {})
        lev = data.get("leverage_ratios", {})
        parts.append("\n## 📊 Key Ratios")
        if val.get("trailing_pe"):
            parts.append(f"- PE Ratio (TTM): {val['trailing_pe']:.2f}")
        if val.get("forward_pe"):
            parts.append(f"- Forward PE: {val['forward_pe']:.2f}")
        if val.get("price_to_book"):
            parts.append(f"- Price/Book: {val['price_to_book']:.2f}")
        if prof.get("return_on_equity"):
            parts.append(f"- ROE: {prof['return_on_equity']*100:.2f}%")
        if prof.get("profit_margins"):
            parts.append(f"- Net Margin: {prof['profit_margins']*100:.2f}%")
        if liq.get("current_ratio"):
            parts.append(f"- Current Ratio: {liq['current_ratio']:.2f}")
        if lev.get("debt_to_equity"):
            parts.append(f"- Debt/Equity: {lev['debt_to_equity']:.2f}")

    if state.get("cashflow_analysis") and state["cashflow_analysis"].get("success"):
        cf = state["cashflow_analysis"]["cashflow"]
        parts.append("\n## 💰 Cash Flow Analysis")
        if cf.get("operating_cash_flow"):
            parts.append(f"- Operating Cash Flow: ₹{cf['operating_cash_flow']:,.0f}")
        if cf.get("free_cash_flow"):
            parts.append(f"- Free Cash Flow: ₹{cf['free_cash_flow']:,.0f}")

    if state.get("balance_sheet_analysis") and state["balance_sheet_analysis"].get("success"):
        bs = state["balance_sheet_analysis"]["balance_sheet"]
        parts.append("\n## 🏦 Balance Sheet")
        if bs.get("total_assets"):
            parts.append(f"- Total Assets: ₹{bs['total_assets']:,.0f}")

    if state.get("pnl_analysis") and state["pnl_analysis"].get("success"):
        pnl = state["pnl_analysis"]["income_statement"]
        parts.append("\n## 📈 Profit & Loss")
        if pnl.get("total_revenue"):
            parts.append(f"- Total Revenue: ₹{pnl['total_revenue']:,.0f}")
        if pnl.get("net_income"):
            parts.append(f"- Net Income: ₹{pnl['net_income']:,.0f}")

    return "\n".join(parts)


def consolidator_agent(state: FundamentalAnalysisState) -> dict:
    """Pass all 4 agents' data to Claude and generate a rich investment analysis report."""
    from langchain.chat_models import init_chat_model
    from app.core.config import settings

    symbol = state["symbol"]
    user_query = state.get("user_query", "")
    ctx = _build_llm_context(symbol, state)

    extra_instruction = f"\nThe user specifically asked: {user_query}" if user_query else ""

    prompt = f"""You are a senior equity research analyst specializing in Indian and global markets.
You have been given comprehensive fundamental data for {symbol} collected from Yahoo Finance.
Produce a detailed, professional investment analysis report in Markdown format.{extra_instruction}

## DATA PROVIDED:
```json
{json.dumps(ctx, indent=2, default=str)}
```

## REPORT STRUCTURE (use exactly these section headers):

### ## 🏢 Company Information
Summarize the company: name, sector, industry, country, employees, and a brief description of the business.

### ## 📊 Key Ratios
Analyse valuation (PE, PB, PEG, EV/EBITDA), profitability (ROE, ROA, margins), liquidity (current/quick ratio), and leverage (Debt/Equity). For each metric, state whether it looks attractive, fair, or stretched vs sector norms.

### ## 💰 Cash Flow Analysis
Interpret operating cash flow, free cash flow, capex trends, and FCF/OCF conversion. Comment on cash generation quality and sustainability. Include YoY growth if data is available.

### ## 🏦 Balance Sheet
Cover assets, liabilities, equity, working capital, and debt levels. Flag any concerns (high debt, negative equity, deteriorating current ratio).

### ## 📈 Profit & Loss
Analyse revenue, gross profit, EBITDA, and net income. Highlight margin trends, revenue growth, and earnings quality.

### ## 🔍 Investment Insights
Provide a concise investment thesis (3–5 bullets):
- Key strengths
- Key risks / red flags
- Overall verdict (Strong Buy / Buy / Hold / Avoid) with a one-line rationale
- Analyst consensus (if available in the data)

Rules:
- Use ₹ for Indian stocks (suffix .NS or .BO), $ for US stocks.
- Format large numbers as Cr (crore) for Indian stocks if > 10,000,000, or B/M for US stocks.
- Do NOT make up data not present in the provided JSON. If a metric is missing, say "Not available."
- Be direct and opinionated — avoid generic filler text."""

    try:
        os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
        llm = init_chat_model("claude-sonnet-4-5-20250929", temperature=0)
        response = llm.invoke(prompt)
        consolidated_report = response.content
    except Exception as e:
        print(f"⚠️  LLM call failed in consolidator, falling back to simple report: {e}")
        consolidated_report = _build_fallback_report(symbol, state)

    return {
        "consolidated_report": consolidated_report,
        "timestamp": datetime.now().isoformat(),
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
