"""
Service for fundamental analysis using parallel agents.
"""

import json
import os
from datetime import datetime

from app.agent.fundamental.graph import create_fundamental_analysis_graph, _convert_numpy_types
from app.agent.fundamental.state import FundamentalAnalysisState
from app.agent.tools.fundamental_ratios import get_fundamental_ratios
from app.agent.tools.fundamental_cashflow import get_cashflow_statement
from app.agent.tools.fundamental_balance_sheet import get_balance_sheet
from app.agent.tools.fundamental_income import get_income_statement


# ---------------------------------------------------------------------------
# Deep-dive prompts per component
# ---------------------------------------------------------------------------

_COMPONENT_PROMPTS = {
    "ratios": """You are a senior equity analyst. Perform a deep-dive valuation and quality analysis for {symbol}.
Use the data below — do NOT fabricate numbers not present.

## DATA:
```json
{data}
```

Write a detailed Markdown report with these sections (use exact headers):

## 🏢 Company Information
Name, sector, industry, country, employees, one-paragraph business summary.

## 📊 Valuation
Analyse PE (TTM & Forward), PEG, Price/Book, Price/Sales, EV/EBITDA.
State whether each metric looks **Attractive / Fair / Stretched** vs typical sector norms. Explain why.

## 💹 Profitability
ROE, ROA, Net Margin, Operating Margin, Gross Margin, EBITDA Margin.
Comment on trend, sustainability, and what drives the margins.

## 🏦 Financial Health
Current Ratio, Quick Ratio, Debt/Equity, Total Debt vs Cash.
Is the balance sheet conservative or leveraged? Any liquidity concerns?

## 📈 Growth & Per-Share Metrics
Revenue growth, earnings growth, EPS (TTM & Forward), Book Value per share.
Is growth accelerating or decelerating?

## 💰 Dividends
Yield, payout ratio, 5-year average yield. Is the dividend safe and growing?

## 🎯 Analyst Consensus
Target high/low/mean price, recommendation key, number of analysts.
How much upside/downside from current price?

## 🔍 Deep-Dive Verdict
3–5 bullet investment thesis:
- Key strengths in the ratios
- Red flags or concerns
- **Overall verdict**: Strong Buy / Buy / Hold / Avoid — one-line rationale

Rules:
- Use ₹ for Indian stocks (.NS/.BO), $ for US stocks.
- Format large numbers as Cr for India, B/M for US.
- If data is missing, say "Not available."
- Be direct and opinionated.""",

    "balance_sheet": """You are a senior equity analyst specialising in balance sheet forensics. Deep-dive the balance sheet for {symbol}.
Use the data below — do NOT fabricate numbers not present.

## DATA:
```json
{data}
```

Write a detailed Markdown report with these sections (use exact headers):

## 🏢 Company Information
Name, sector, industry — one line each.

## 🏦 Asset Quality
Total assets breakdown: current vs non-current, tangible vs intangible, goodwill.
Flag any large goodwill or intangible assets (impairment risk).
Is the asset base growing? Comment on asset turnover quality.

## 💧 Liquidity Analysis
Current ratio, quick ratio, cash & equivalents, short-term investments.
Can the company comfortably meet near-term obligations?

## 📋 Debt Structure
Total debt: short-term vs long-term split, net debt position (debt minus cash).
Debt-to-equity trend YoY. Is leverage increasing or decreasing?
Flag if debt is concentrated in short-term maturities (refinancing risk).

## 🔄 Working Capital
Receivables, inventory, payables — calculate days outstanding if data available.
Is working capital healthy? Rising receivables or inventory can signal trouble.

## 📊 Equity & Retained Earnings
Total equity, retained earnings trend. Is the company accumulating or eroding equity?
Book value per share trend.

## 📅 Year-over-Year Changes
Compare the latest period vs prior periods from historical data.
Highlight any sudden jumps in liabilities, sharp drops in equity, or cash depletion.

## 🔍 Balance Sheet Verdict
3–5 bullet assessment:
- Balance sheet strengths
- Concerns or red flags
- **Overall assessment**: Fortress / Healthy / Adequate / Stretched / Distressed

Rules:
- Use ₹ for Indian stocks (.NS/.BO), $ for US stocks.
- Format large numbers as Cr for India, B/M for US.
- If data is missing, say "Not available."
- Be forensic and specific — not generic.""",

    "cashflow": """You are a senior equity analyst specialising in cash flow analysis. Deep-dive the cash flows for {symbol}.
Use the data below — do NOT fabricate numbers not present.

## DATA:
```json
{data}
```

Write a detailed Markdown report with these sections (use exact headers):

## 🏢 Company Information
Name, sector — one line each.

## 💰 Operating Cash Flow Quality
Operating cash flow vs net income — high OCF/Net Income ratio (>1) signals quality earnings.
Working capital changes: are receivables/inventory consuming cash?
Non-cash adjustments: D&A, stock-based compensation.
Is OCF consistent and growing?

## 🔁 Free Cash Flow
FCF = OCF − Capex. Calculate FCF yield if market cap is available.
FCF/Sales ratio. Is FCF positive and sustainable?
FCF growth YoY.

## 🏗️ Capital Expenditure
Capex levels: maintenance vs growth capex.
Capex/OCF ratio — how much of operating cash is being reinvested?
Capex/Depreciation — >1 means expanding asset base, <1 means under-investing.

## 📤 Investing Activities
Net investment purchases/sales, acquisitions, divestments.
Is the company deploying capital productively?

## 💳 Financing Activities
Debt raised or repaid, dividends paid, buybacks.
Is the company self-funding or reliant on external financing?

## 📅 Historical Trend (3–5 Years)
Table or bullets showing OCF, FCF, Capex for each available year.
Identify trend: improving, stable, or deteriorating.

## 🔍 Cash Flow Verdict
3–5 bullets:
- Cash generation strengths
- Concerns (negative FCF, high capex burn, working capital deterioration)
- **Overall verdict**: Exceptional / Strong / Adequate / Weak / Concerning

Rules:
- Use ₹ for Indian stocks (.NS/.BO), $ for US stocks.
- Format large numbers as Cr for India, B/M for US.
- If data is missing, say "Not available."
- Be specific about numbers.""",

    "income": """You are a senior equity analyst specialising in P&L analysis. Deep-dive the income statement for {symbol}.
Use the data below — do NOT fabricate numbers not present.

## DATA:
```json
{data}
```

Write a detailed Markdown report with these sections (use exact headers):

## 🏢 Company Information
Name, sector, industry — one line each.

## 📈 Revenue Analysis
Total revenue, revenue per share, revenue growth (YoY %).
Is growth accelerating or decelerating? Comment on revenue quality and predictability.

## 💹 Gross Profitability
Gross profit and gross margin. Is the margin expanding or contracting?
What drives COGS — raw materials, labour, or services?

## ⚙️ Operating Performance
EBIT / Operating income, operating margin.
Operating leverage: does revenue growth translate to disproportionate profit growth?
R&D and SG&A as a percentage of revenue (if available).

## 📊 EBITDA
EBITDA and EBITDA margin. How does it compare to peers?
D&A as a percentage of revenue.

## 🏁 Bottom Line
Net income, net margin, EPS (TTM & Forward).
Tax rate — is it sustainable or benefiting from one-time items?
Non-recurring items that may inflate/deflate reported profit.

## 📅 Historical Trend (3–5 Years)
Revenue, gross margin, EBITDA margin, net margin for each available year.
Summarise the trend in a few bullets.

## 🔍 P&L Verdict
3–5 bullets:
- Revenue and margin strengths
- Red flags (margin compression, earnings quality concerns, one-offs)
- **Overall verdict**: Exceptional / Strong / Adequate / Weak / Deteriorating

Rules:
- Use ₹ for Indian stocks (.NS/.BO), $ for US stocks.
- Format large numbers as Cr for India, B/M for US.
- If data is missing, say "Not available."
- Be direct and analytical.""",
}

_COMPONENT_TOOLS = {
    "ratios": get_fundamental_ratios,
    "balance_sheet": get_balance_sheet,
    "cashflow": get_cashflow_statement,
    "income": get_income_statement,
}

_COMPONENT_TOOL_ARGS = {
    "ratios": lambda symbol: {"symbol": symbol},
    "balance_sheet": lambda symbol: {"symbol": symbol, "period": "annual"},
    "cashflow": lambda symbol: {"symbol": symbol, "period": "annual"},
    "income": lambda symbol: {"symbol": symbol, "period": "annual"},
}

# Map component → the key(s) in the tool result that carry the deep data
_COMPONENT_DATA_KEYS = {
    "ratios": ["data", "raw_info"],          # raw_info excluded below
    "balance_sheet": ["balance_sheet", "historical_data"],
    "cashflow": ["cashflow", "historical_data"],
    "income": ["income_statement", "historical_data"],
}


def _extract_component_data(component: str, raw_result: dict) -> dict:
    """Pull the meaningful keys from a tool result for a given component."""
    if component == "ratios":
        data = raw_result.get("data", {})
        # Exclude raw_info — it duplicates everything already structured
        return {k: v for k, v in data.items()}
    else:
        keys = _COMPONENT_DATA_KEYS.get(component, [])
        return {k: raw_result.get(k) for k in keys if k in raw_result}


class FundamentalAnalysisService:
    """Service for fundamental analysis"""

    def __init__(self):
        self._graph = None

    @property
    def graph(self):
        if self._graph is None:
            self._graph = create_fundamental_analysis_graph()
        return self._graph

    async def analyze(self, symbol: str, user_query: str = "", component: str = "") -> dict:
        """
        Route to full parallel analysis or single-component deep dive.

        component = "" | "all"  → 4 parallel agents + Claude overview
        component = "ratios" | "balance_sheet" | "cashflow" | "income"
                                → single agent + Claude deep dive
        """
        if not component or component == "all":
            return await self._full_analysis(symbol, user_query)
        return await self._component_analysis(symbol, component, user_query)

    # ------------------------------------------------------------------
    # Full analysis (existing parallel graph)
    # ------------------------------------------------------------------

    async def _full_analysis(self, symbol: str, user_query: str) -> dict:
        import uuid

        initial_state: FundamentalAnalysisState = {
            "symbol": symbol,
            "user_query": user_query,
            "component": "",
            "ratio_analysis": None,
            "cashflow_analysis": None,
            "balance_sheet_analysis": None,
            "pnl_analysis": None,
            "consolidated_report": None,
            "errors": [],
            "timestamp": None,
        }

        thread_id = str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}
        result = self.graph.invoke(initial_state, config=config)

        return {
            "success": True,
            "symbol": symbol,
            "component": "",
            "consolidated_report": result["consolidated_report"],
            "individual_results": {
                "ratios": result["ratio_analysis"],
                "cashflow": result["cashflow_analysis"],
                "balance_sheet": result["balance_sheet_analysis"],
                "pnl": result["pnl_analysis"],
            },
            "errors": result["errors"],
            "timestamp": result["timestamp"],
        }

    # ------------------------------------------------------------------
    # Component deep-dive (single tool + Claude deep-dive prompt)
    # ------------------------------------------------------------------

    async def _component_analysis(self, symbol: str, component: str, user_query: str) -> dict:
        from langchain.chat_models import init_chat_model
        from app.core.config import settings

        if component not in _COMPONENT_TOOLS:
            raise ValueError(f"Unknown component '{component}'. Valid: {list(_COMPONENT_TOOLS)}")

        # 1. Fetch data from the relevant tool
        tool = _COMPONENT_TOOLS[component]
        tool_args = _COMPONENT_TOOL_ARGS[component](symbol)
        try:
            raw_result = tool.invoke(tool_args)
            raw_result = _convert_numpy_types(raw_result)
        except Exception as e:
            return {
                "success": False,
                "symbol": symbol,
                "component": component,
                "consolidated_report": f"# Error fetching {component} data\n\n{e}",
                "individual_results": {},
                "errors": [str(e)],
                "timestamp": datetime.now().isoformat(),
            }

        if not raw_result.get("success"):
            error_msg = raw_result.get("error", "Unknown error")
            return {
                "success": False,
                "symbol": symbol,
                "component": component,
                "consolidated_report": f"# Data unavailable\n\n{error_msg}",
                "individual_results": {component: raw_result},
                "errors": [error_msg],
                "timestamp": datetime.now().isoformat(),
            }

        # 2. Build context dict (exclude large raw dumps)
        ctx = _extract_component_data(component, raw_result)
        if user_query:
            ctx["user_query"] = user_query

        # 3. Call Claude with component-specific deep-dive prompt
        prompt_template = _COMPONENT_PROMPTS[component]
        prompt = prompt_template.format(
            symbol=symbol,
            data=json.dumps(ctx, indent=2, default=str),
        )

        try:
            os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
            llm = init_chat_model("claude-sonnet-4-5-20250929", temperature=0)
            response = llm.invoke(prompt)
            report = response.content
        except Exception as e:
            report = f"# {component.replace('_', ' ').title()} Analysis for {symbol}\n\nLLM error: {e}\n\n```json\n{json.dumps(ctx, indent=2, default=str)}\n```"

        return {
            "success": True,
            "symbol": symbol,
            "component": component,
            "consolidated_report": report,
            "individual_results": {component: raw_result},
            "errors": [],
            "timestamp": datetime.now().isoformat(),
        }


# Singleton instance
fundamental_service = FundamentalAnalysisService()
