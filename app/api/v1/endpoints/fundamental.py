"""
Fundamental analysis endpoints.
"""

import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.fundamental_services import fundamental_service

router = APIRouter()


class FundamentalRequest(BaseModel):
    """Request for fundamental analysis"""
    symbol: str
    query: str = ""
    component: str = ""  # "" or "all" = full analysis; "ratios"|"balance_sheet"|"cashflow"|"income" = deep dive


class FundamentalResponse(BaseModel):
    """Response from fundamental analysis"""
    success: bool
    symbol: str
    consolidated_report: str
    individual_results: dict
    errors: list[str]
    timestamp: str


@router.post(
    "/stream",
    summary="Stream Fundamental Analysis (SSE)",
    description="Run fundamental analysis and stream results as Server-Sent Events"
)
async def stream_fundamentals(request: FundamentalRequest):
    """
    Stream fundamental analysis via SSE.

    Full analysis event sequence:
      {"type":"start",            "symbol":str, "mode":"full"}
      {"type":"section_start",    "section": "ratios"|"cashflow"|"balance_sheet"|"pnl"}  ×4
      {"type":"section_complete", "section": str}  as each finishes
      {"type":"consolidating"}
      {"type":"token",            "content": str}  ×many
      {"type":"done",             "individual_results":{...}, "errors":[], "timestamp":str}

    Component deep-dive event sequence:
      {"type":"start",     "symbol":str, "mode":"component", "section":str}
      {"type":"fetching",  "section": str}
      {"type":"analyzing"}
      {"type":"token",     "content": str}  ×many
      {"type":"done",      "individual_results":{...}, "errors":[], "timestamp":str}
    """
    async def event_generator():
        try:
            async for event_data in fundamental_service.stream_analyze(
                symbol=request.symbol,
                user_query=request.query,
                component=request.component,
            ):
                yield f"data: {json.dumps(event_data)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
            user_query=request.query,
            component=request.component,
        )

        return FundamentalResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
