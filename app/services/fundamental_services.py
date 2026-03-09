"""
Service for fundamental analysis using parallel agents.
"""

from app.agent.fundamental.graph import create_fundamental_analysis_graph
from app.agent.fundamental.state import FundamentalAnalysisState


class FundamentalAnalysisService:
    """Service for fundamental analysis"""

    def __init__(self):
        self._graph = None

    @property
    def graph(self):
        """Lazy-load the graph"""
        if self._graph is None:
            self._graph = create_fundamental_analysis_graph()
        return self._graph

    async def analyze(self, symbol: str, user_query: str = "") -> dict:
        """
        Run fundamental analysis on a stock using parallel agents.

        Args:
            symbol: Stock ticker (e.g., 'RELIANCE.NS')
            user_query: Optional user query for context

        Returns:
            Dictionary with consolidated report and individual agent results
        """
        import uuid

        # Initialize state
        initial_state: FundamentalAnalysisState = {
            "symbol": symbol,
            "user_query": user_query,
            "ratio_analysis": None,
            "cashflow_analysis": None,
            "balance_sheet_analysis": None,
            "pnl_analysis": None,
            "consolidated_report": None,
            "errors": [],
            "timestamp": None,
        }

        # Create a unique thread_id for this analysis session
        thread_id = str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}

        # Run the graph (parallel execution happens here!)
        result = self.graph.invoke(initial_state, config=config)

        return {
            "success": True,
            "symbol": symbol,
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


# Singleton instance
fundamental_service = FundamentalAnalysisService()
