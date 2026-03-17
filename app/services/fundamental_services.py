"""
Service for fundamental analysis using parallel agents.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import AsyncGenerator, Any

from app.agent.fundamental.graph import create_fundamental_analysis_graph, _convert_numpy_types, _build_llm_context
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

# ---------------------------------------------------------------------------
# Short per-section LLM analysis prompts (120-150 words each).
# The LLM interprets the numbers in context — sector norms, trends, quality.
# ---------------------------------------------------------------------------

_SECTION_ANALYSIS_PROMPTS = {
    "ratios": """You are a senior equity research analyst writing a professional investment note on {symbol}.

Financial data:
```json
{data}
```

Write a sharp 200–250 word valuation and quality analysis. Structure it as flowing prose, not bullet points.

Your analysis must:
1. **Valuation**: State the PE ratio and whether it is attractive, fair, or stretched relative to sector norms (Indian IT sector trades at ~18–25x PE; consumer at ~30–50x; banking at ~10–15x; pharma at ~20–35x). If the PE is elevated, argue whether the ROE/growth justify it. Comment on P/B and EV/EBITDA if available.
2. **Profitability quality**: Interpret ROE (>25% = exceptional, 15–25% = good, <15% = below average). Are margins sector-leading? Is ROA indicating asset-light or capital-heavy model?
3. **Financial health**: Comment on D/E (debt-free or leveraged), liquidity (current ratio), and whether the dividend is sustainable given earnings and cash flows.
4. **One-line verdict at the end** (bold, standalone): **Ratios: [Attractive / Fair / Stretched] — [specific reason with a number]**

Rules: ₹ for Indian stocks (.NS/.BO), $ for US. Quote specific numbers. Be opinionated — avoid "it depends" hedging.""",

    "pnl": """You are a senior equity research analyst writing a professional investment note on {symbol}.

Financial data:
```json
{data}
```

Write a sharp 200–250 word income statement analysis. Structure it as flowing prose.

Your analysis must:
1. **Revenue trend**: Cite the YoY growth rate and compare to the prior 2–3 years from the historical data. Is growth accelerating, stable, or decelerating? What does the trajectory imply?
2. **Margin analysis**: Examine gross → EBITDA → net margin waterfall. Are margins expanding or compressing year-over-year? What's driving the change (operating leverage or cost pressure)? Compare margins to typical sector levels.
3. **Earnings quality**: Does net income growth outpace or lag revenue growth? Any signs of one-off boosts (unusual items)? What is the EPS trajectory — is the business compounding shareholder value?
4. **One-line verdict at the end** (bold, standalone): **P&L: [Exceptional / Strong / Adequate / Deteriorating] — [specific reason with a number]**

Rules: ₹ for Indian stocks (.NS/.BO), $ for US. Quote specific numbers. Be opinionated.""",

    "cashflow": """You are a senior equity research analyst writing a professional investment note on {symbol}.

Financial data:
```json
{data}
```

Write a sharp 200–250 word cash flow analysis. Structure it as flowing prose.

Your analysis must:
1. **Earnings quality check**: Compare OCF to net income. OCF/NI > 1.0 signals high-quality earnings (accruals are converting to cash). OCF/NI < 0.8 is a yellow flag. Cite the actual ratio.
2. **Free cash flow**: Is FCF positive and growing? Calculate FCF as a % of revenue if possible. Positive and growing FCF is the gold standard for quality businesses.
3. **Capital intensity**: What % of OCF is consumed by capex? (<20% = asset-light, >50% = capital-heavy). Is the company investing for growth or just maintaining existing assets?
4. **Financing behaviour**: Is the company returning cash (dividends, buybacks) or raising capital? A self-financing business that pays dividends from FCF is significantly higher quality.
5. **One-line verdict at the end** (bold, standalone): **Cash Flow: [Exceptional / Strong / Adequate / Concerning] — [specific reason with a number]**

Rules: ₹ for Indian stocks (.NS/.BO), $ for US. Quote specific numbers. Be opinionated.""",

    "balance_sheet": """You are a senior equity research analyst writing a professional investment note on {symbol}.

Financial data:
```json
{data}
```

Write a sharp 200–250 word balance sheet analysis. Structure it as flowing prose.

Your analysis must:
1. **Net cash vs net debt**: Calculate (total debt − cash). A net cash position is a quality indicator — cite the amount. Net debt requires scrutiny of debt servicing capacity.
2. **Asset quality**: What portion of assets are current vs non-current? Is goodwill/intangibles significant (impairment risk)? Comment on asset turnover quality.
3. **Working capital health**: Is working capital positive and stable? Rising receivables or inventory faster than revenue growth is a red flag. Flag if working capital is being squeezed.
4. **Equity trajectory**: Are retained earnings growing (compounding equity) or flat/declining? Is the company eroding its book value?
5. **One-line verdict at the end** (bold, standalone): **Balance Sheet: [Fortress / Healthy / Adequate / Stretched] — [specific reason with a number]**

Rules: ₹ for Indian stocks (.NS/.BO), $ for US. Quote specific numbers. Be opinionated.""",
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


def _extract_curated_section_data(section_name: str, result: dict) -> dict:
    """Return a small, display-ready subset of each section's raw tool result.

    This is embedded in the section_complete SSE event so the frontend can
    render structured metric cards without waiting for the full LLM response.
    """
    if not result or not result.get("success"):
        return {}
    try:
        if section_name == "ratios":
            d = result.get("data", {})
            company = d.get("company_info", {})
            val = d.get("valuation_ratios", {})
            prof = d.get("profitability_ratios", {})
            liq = d.get("liquidity_ratios", {})
            lev = d.get("leverage_ratios", {})
            div = d.get("dividend_metrics", {})
            analyst = d.get("analyst_data", {})
            price = d.get("price_metrics", {})
            market = d.get("market_metrics", {})
            gr = d.get("growth_rates", {})
            trading = d.get("trading_info", {})
            return {
                "company": {
                    "name": company.get("long_name"),
                    "sector": company.get("sector"),
                    "industry": company.get("industry"),
                    "country": company.get("country"),
                    "employees": company.get("full_time_employees"),
                    "website": company.get("website"),
                    "summary": (company.get("business_summary") or "")[:400],
                    "market_cap": market.get("market_cap"),
                    "current_price": price.get("current_price"),
                    "week52_high": price.get("fifty_two_week_high"),
                    "week52_low": price.get("fifty_two_week_low"),
                    "beta": trading.get("beta"),
                },
                "valuation": {
                    "pe": val.get("trailing_pe"),
                    "forward_pe": val.get("forward_pe"),
                    "pb": val.get("price_to_book"),
                    "ps": val.get("price_to_sales_ttm"),
                    "ev_ebitda": val.get("enterprise_to_ebitda"),
                    "peg": val.get("peg_ratio"),
                },
                "profitability": {
                    "roe": prof.get("return_on_equity"),
                    "roa": prof.get("return_on_assets"),
                    "net_margin": prof.get("profit_margins"),
                    "op_margin": prof.get("operating_margins"),
                    "gross_margin": prof.get("gross_margins"),
                    "ebitda_margin": prof.get("ebitda_margins"),
                },
                "liquidity": {
                    "current_ratio": liq.get("current_ratio"),
                    "quick_ratio": liq.get("quick_ratio"),
                    "total_cash": lev.get("total_cash"),
                    "total_debt": lev.get("total_debt"),
                    "debt_equity": lev.get("debt_to_equity"),
                },
                "dividend": {
                    "yield": div.get("dividend_yield"),
                    "rate": div.get("dividend_rate"),
                    "payout_ratio": div.get("payout_ratio"),
                    "five_year_avg": div.get("five_year_avg_dividend_yield"),
                },
                "growth": {
                    "revenue_growth": gr.get("revenue_growth"),
                    "earnings_growth": gr.get("earnings_growth"),
                },
                "analyst": {
                    "recommendation": analyst.get("recommendation_key"),
                    "target_mean": analyst.get("target_mean_price"),
                    "target_high": analyst.get("target_high_price"),
                    "target_low": analyst.get("target_low_price"),
                    "num_analysts": analyst.get("number_of_analyst_opinions"),
                    "rec_score": analyst.get("recommendation_mean"),
                    "current_price": price.get("current_price"),
                },
            }

        elif section_name == "balance_sheet":
            bs = result.get("balance_sheet", {})
            ta = bs.get("total_assets")
            ca = bs.get("current_assets")
            cl = bs.get("current_liabilities")
            td = bs.get("total_debt")
            cash = bs.get("cash_and_equivalents")
            return {
                "total_assets": ta,
                "current_assets": ca,
                "non_current_assets": (ta - ca) if (ta and ca) else None,
                "total_liabilities": bs.get("total_liabilities"),
                "current_liabilities": cl,
                "total_equity": bs.get("total_equity"),
                "total_debt": td,
                "cash": cash,
                "net_debt": (td - cash) if (td is not None and cash is not None) else None,
                "working_capital": (ca - cl) if (ca and cl) else None,
                "retained_earnings": bs.get("retained_earnings"),
                "inventory": bs.get("inventory"),
                "accounts_receivable": bs.get("accounts_receivable"),
            }

        elif section_name == "cashflow":
            cf = result.get("cashflow", {})
            hist = result.get("historical_data", {})
            historical = []
            if isinstance(hist, dict):
                for k in sorted(hist.keys(), reverse=True)[:5]:
                    v = hist[k]
                    if isinstance(v, dict):
                        historical.append({
                            "year": str(k)[:4],
                            "ocf": v.get("operating_cash_flow"),
                            "fcf": v.get("free_cash_flow"),
                            "capex": v.get("capital_expenditure"),
                        })
                historical.reverse()
            return {
                "ocf": cf.get("operating_cash_flow"),
                "fcf": cf.get("free_cash_flow"),
                "capex": cf.get("capital_expenditure"),
                "investing_cf": cf.get("investing_cash_flow"),
                "financing_cf": cf.get("financing_cash_flow"),
                "dividends_paid": cf.get("cash_dividends_paid"),
                "historical": historical,
            }

        elif section_name == "pnl":
            inc = result.get("income_statement", {})
            hist = result.get("historical_data", {})
            historical = []
            if isinstance(hist, dict):
                for k in sorted(hist.keys(), reverse=True)[:5]:
                    v = hist[k]
                    if isinstance(v, dict):
                        historical.append({
                            "year": str(k)[:4],
                            "revenue": v.get("revenue"),
                            "gross_profit": v.get("gross_profit"),
                            "net_income": v.get("net_income"),
                            "ebitda": v.get("ebitda"),
                        })
                historical.reverse()
            return {
                "revenue": inc.get("total_revenue"),
                "gross_profit": inc.get("gross_profit"),
                "ebitda": inc.get("ebitda"),
                "net_income": inc.get("net_income"),
                "eps_diluted": inc.get("diluted_eps"),
                "gross_margin": inc.get("gross_margin"),
                "ebitda_margin": inc.get("ebitda_margin"),
                "net_margin": inc.get("net_margin"),
                "revenue_growth": inc.get("revenue_growth"),
                "net_income_growth": inc.get("net_income_growth"),
                "historical": historical,
            }
    except Exception:
        return {}
    return {}


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

    async def stream_analyze(
        self, symbol: str, user_query: str = "", component: str = ""
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream fundamental analysis as Server-Sent Events.

        Full analysis event sequence:
          {"type":"start",            "symbol":str, "mode":"full"}
          {"type":"section_start",    "section": one of ratios/cashflow/balance_sheet/pnl}  × 4
          {"type":"section_complete", "section": ...}  as each finishes
          {"type":"consolidating"}
          {"type":"token",            "content": str}  × many
          {"type":"done",             "individual_results":{...}, "errors":[...], "timestamp":str}

        Component deep-dive event sequence:
          {"type":"start",     "symbol":str, "mode":"component", "section":str}
          {"type":"fetching",  "section": str}
          {"type":"analyzing"}
          {"type":"token",     "content": str}  × many
          {"type":"done",      "individual_results":{...}, "errors":[], "timestamp":str}

        Error events:
          {"type":"error", "message": str}
        """
        if not component or component == "all":
            async for event in self._stream_full_analysis(symbol, user_query):
                yield event
        else:
            async for event in self._stream_component_analysis(symbol, component, user_query):
                yield event

    # ------------------------------------------------------------------
    # Streaming: full parallel analysis
    # ------------------------------------------------------------------

    async def _stream_full_analysis(
        self, symbol: str, user_query: str
    ) -> AsyncGenerator[dict[str, Any], None]:
        from langchain.chat_models import init_chat_model
        from app.core.config import settings

        yield {"type": "start", "symbol": symbol, "mode": "full"}

        # Announce all four sections up front so the UI can show them as pending
        for section in ("ratios", "cashflow", "balance_sheet", "pnl"):
            yield {"type": "section_start", "section": section}

        loop = asyncio.get_event_loop()

        async def _run(section_name: str, fn, args: dict):
            result = await loop.run_in_executor(None, lambda: fn.invoke(args))
            return section_name, _convert_numpy_types(result)

        tasks = {
            "ratios":        _run("ratios",        get_fundamental_ratios,    {"symbol": symbol}),
            "cashflow":      _run("cashflow",       get_cashflow_statement,   {"symbol": symbol, "period": "annual"}),
            "balance_sheet": _run("balance_sheet",  get_balance_sheet,        {"symbol": symbol, "period": "annual"}),
            "pnl":           _run("pnl",            get_income_statement,     {"symbol": symbol, "period": "annual"}),
        }

        results: dict[str, Any] = {}
        errors: list[str] = []

        for coro in asyncio.as_completed(list(tasks.values())):
            try:
                section_name, result = await coro
                results[section_name] = result
                yield {
                    "type": "section_complete",
                    "section": section_name,
                    "data": _extract_curated_section_data(section_name, result),
                }
            except Exception as exc:
                errors.append(str(exc))

        # Run 4 focused per-section LLM analyses sequentially.
        # Each streams its reasoning directly below the section's data cards
        # in the UI — the LLM interprets numbers, compares to sector norms,
        # and gives a one-line verdict per section.
        os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
        llm = init_chat_model("claude-sonnet-4-5-20250929", temperature=0, streaming=True)

        for section_name in ("ratios", "pnl", "cashflow", "balance_sheet"):
            section_result = results.get(section_name)
            prompt_template = _SECTION_ANALYSIS_PROMPTS.get(section_name)
            if not section_result or not prompt_template:
                continue

            curated = _extract_curated_section_data(section_name, section_result)
            extra = f"\n\nUser query: {user_query}" if user_query else ""
            prompt = prompt_template.format(
                symbol=symbol,
                data=json.dumps(curated, indent=2, default=str),
            ) + extra

            yield {"type": "section_analysis_start", "section": section_name}
            try:
                async for chunk in llm.astream(prompt):
                    content = chunk.content
                    if isinstance(content, str) and content:
                        yield {"type": "token", "section": section_name, "content": content}
                    elif isinstance(content, list):
                        for block in content:
                            text = ""
                            if isinstance(block, dict) and block.get("type") == "text":
                                text = block.get("text", "")
                            elif hasattr(block, "type") and block.type == "text":
                                text = getattr(block, "text", "")
                            if text:
                                yield {"type": "token", "section": section_name, "content": text}
            except Exception as exc:
                errors.append(f"LLM error for {section_name}: {exc}")
            yield {"type": "section_analysis_done", "section": section_name}

        yield {
            "type": "done",
            "errors": errors,
            "timestamp": datetime.now().isoformat(),
        }

    # ------------------------------------------------------------------
    # Streaming: single-component deep dive
    # ------------------------------------------------------------------

    async def _stream_component_analysis(
        self, symbol: str, component: str, user_query: str
    ) -> AsyncGenerator[dict[str, Any], None]:
        from langchain.chat_models import init_chat_model
        from app.core.config import settings

        if component not in _COMPONENT_TOOLS:
            yield {"type": "error", "message": f"Unknown component '{component}'."}
            return

        yield {"type": "start", "symbol": symbol, "mode": "component", "section": component}
        yield {"type": "fetching", "section": component}

        loop = asyncio.get_event_loop()
        tool = _COMPONENT_TOOLS[component]
        tool_args = _COMPONENT_TOOL_ARGS[component](symbol)

        try:
            raw_result = await loop.run_in_executor(None, lambda: tool.invoke(tool_args))
            raw_result = _convert_numpy_types(raw_result)
        except Exception as exc:
            yield {"type": "error", "message": str(exc)}
            return

        if not raw_result.get("success"):
            yield {"type": "error", "message": raw_result.get("error", "Unknown error")}
            return

        ctx = _extract_component_data(component, raw_result)
        if user_query:
            ctx["user_query"] = user_query

        prompt_template = _COMPONENT_PROMPTS[component]
        prompt = prompt_template.format(
            symbol=symbol,
            data=json.dumps(ctx, indent=2, default=str),
        )

        yield {"type": "analyzing"}

        try:
            os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
            llm = init_chat_model("claude-sonnet-4-5-20250929", temperature=0, streaming=True)
            async for chunk in llm.astream(prompt):
                content = chunk.content
                if isinstance(content, str) and content:
                    yield {"type": "token", "content": content}
                elif isinstance(content, list):
                    for block in content:
                        text = ""
                        if isinstance(block, dict) and block.get("type") == "text":
                            text = block.get("text", "")
                        elif hasattr(block, "type") and block.type == "text":
                            text = getattr(block, "text", "")
                        if text:
                            yield {"type": "token", "content": text}
        except Exception as exc:
            yield {"type": "error", "message": str(exc)}
            return

        yield {
            "type": "done",
            "errors": [],
            "timestamp": datetime.now().isoformat(),
        }

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
