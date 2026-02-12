from fastapi import APIRouter, HTTPException
from app.models.request import CalculateIndicatorRequest, AnalyzeRequest
from app.models.response import CalculateIndicatorResponse, AnalyzeResponse, ErrorResponse
from app.services.agent_service import AgentService
from app.config.market_data import validate_period_interval_combination

router = APIRouter()
agent_service = AgentService()


@router.post(
    "/calculate",
    response_model=CalculateIndicatorResponse,
    summary="Calculate Technical Indicator",
    description="Calculate a technical indicator for a given stock symbol"
)
async def calculate_indicator(request: CalculateIndicatorRequest):
    """
    Calculate a technical indicator with the following parameters:
    - symbol: Stock ticker (e.g., AAPL, TSLA)
    - indicator: Indicator name (e.g., rsi, macd, sma)
    - interval: Candle timeframe (e.g., 1m, 5m, 1h, 1d)
    - data_period: Historical data range (e.g., 1d, 5d, 1mo, 6mo)
    - indicator_period: Lookback period for calculation (default: 14)
    """
    try:
        # Validate period/interval combination
        validation = validate_period_interval_combination(
            request.data_period,
            request.interval
        )

        if not validation["valid"]:
            raise HTTPException(status_code=400, detail=validation["error"])

        # Create message for agent
        message = (
            f"Calculate {request.indicator.upper()} for {request.symbol} "
            f"using {request.interval} interval, {request.data_period} of data, "
            f"and {request.indicator_period} period"
        )

        # Invoke agent
        response = await agent_service.invoke(message)

        return CalculateIndicatorResponse(
            success=True,
            response=response,
            params={
                "symbol": request.symbol,
                "indicator": request.indicator,
                "interval": request.interval,
                "data_period": request.data_period,
                "indicator_period": request.indicator_period
            },
            warning=validation.get("warning")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Natural Language Analysis",
    description="Analyze stocks using natural language queries"
)
async def analyze(request: AnalyzeRequest):
    """
    Analyze stocks using natural language.
    Example: "Calculate RSI for AAPL with 14 period"
    """
    try:
        response = await agent_service.invoke(request.message)

        return AnalyzeResponse(
            success=True,
            response=response,
            query=request.message
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

