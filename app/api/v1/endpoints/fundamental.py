"""
Fundamental analysis endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.fundamental_services import fundamental_service


router = APIRouter()


class FundamentalRequest(BaseModel):
    """Request for fundamental analysis"""
    symbol: str
    query: str = ""


class FundamentalResponse(BaseModel):
    """Response from fundamental analysis"""
    success: bool
    symbol: str
    consolidated_report: str
    individual_results: dict
    errors: list[str]
    timestamp: str


@router.post(
    "/analyze",
    response_model=FundamentalResponse,
    summary="Fundamental Analysis",
    description="Run parallel fundamental analysis on a stock"
)
async def analyze_fundamentals(request: FundamentalRequest):
    """
    Analyze stock fundamentals using 4 parallel agents:
    - Ratio Agent (PE, ROE, Debt/Equity, etc.)
    - Cash Flow Agent (OCF, FCF, etc.)
    - Balance Sheet Agent (Assets, Liabilities, Equity)
    - P&L Agent (Revenue, Profit, Margins)

    Returns consolidated report + individual agent results.
    """
    try:
        result = await fundamental_service.analyze(
            symbol=request.symbol,
            user_query=request.query
        )

        return FundamentalResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
