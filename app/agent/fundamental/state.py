"""
State definition for fundamental analysis multi-agent system.
"""

from typing import TypedDict, Annotated
import operator


class FundamentalAnalysisState(TypedDict):
    """State for fundamental analysis workflow"""

    # Input
    symbol: str
    user_query: str
    component: str  # "" or "all" = full analysis; "ratios"|"balance_sheet"|"cashflow"|"income" = deep dive

    # Individual agent results
    ratio_analysis: dict | None
    cashflow_analysis: dict | None
    balance_sheet_analysis: dict | None
    pnl_analysis: dict | None

    # Consolidated result
    consolidated_report: str | None

    # Error tracking
    errors: Annotated[list[str], operator.add]

    # Metadata
    timestamp: str | None
