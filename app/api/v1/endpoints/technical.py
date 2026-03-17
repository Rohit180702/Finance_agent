from fastapi import APIRouter, HTTPException, Query
from app.models.request import CalculateIndicatorRequest, AnalyzeRequest
from app.models.response import CalculateIndicatorResponse, AnalyzeResponse, ErrorResponse
from app.services.agent_service import AgentService
from app.config.market_data import validate_period_interval_combination
import asyncio
import pandas as pd

router = APIRouter()
agent_service = AgentService()

_OVERLAY_INDICATORS = {
    'sma', 'ema', 'wma', 'dema', 'tema', 'hma', 'vwap', 'vwma',
    'zlma', 'kama', 'fwma', 'pwma', 'trima', 'midpoint', 'midprice',
}
_BBANDS_INDICATORS = {'bbands', 'kc', 'donchian'}
_MACD_INDICATORS = {'macd', 'ppo', 'trix'}


def _classify_indicator(indicator: str) -> str:
    ind = indicator.lower()
    if ind in _OVERLAY_INDICATORS:
        return "overlay"
    if ind in _BBANDS_INDICATORS:
        return "bbands"
    if ind in _MACD_INDICATORS:
        return "macd"
    return "oscillator"


@router.get(
    "/chart-data",
    summary="Get OHLCV + full indicator series for charting",
)
async def get_chart_data(
    symbol: str = Query(...),
    indicator: str = Query(...),
    interval: str = Query("1d"),
    data_period: str = Query("6mo"),
    indicator_period: int = Query(14),
):
    try:
        import yfinance as yf
        import pandas_ta as ta

        def _fetch():
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=data_period, interval=interval)
            return df

        df = await asyncio.get_event_loop().run_in_executor(None, _fetch)

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        indicator_func = getattr(df.ta, indicator.lower(), None)
        if indicator_func is None:
            raise HTTPException(status_code=400, detail=f"Unknown indicator: {indicator}")

        ind_result = indicator_func(length=indicator_period)
        if ind_result is None:
            raise HTTPException(status_code=400, detail=f"Indicator {indicator} returned no data")

        def _fmt_date(idx):
            return idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]

        ohlcv = [
            {
                "date": _fmt_date(idx),
                "open":  round(float(row['Open']),   2),
                "high":  round(float(row['High']),   2),
                "low":   round(float(row['Low']),    2),
                "close": round(float(row['Close']),  2),
                "volume": int(row['Volume']),
            }
            for idx, row in df.iterrows()
        ]

        if isinstance(ind_result, pd.DataFrame):
            cols = list(ind_result.columns)
            indicator_series = []
            for idx, row in ind_result.iterrows():
                entry = {"date": _fmt_date(idx)}
                for col in cols:
                    v = row[col]
                    entry[col] = round(float(v), 4) if pd.notna(v) else None
                indicator_series.append(entry)
        else:
            col_name = ind_result.name or indicator.upper()
            cols = [col_name]
            indicator_series = []
            for idx, val in ind_result.items():
                indicator_series.append({
                    "date": _fmt_date(idx),
                    col_name: round(float(val), 4) if pd.notna(val) else None,
                })

        return {
            "symbol": symbol.upper(),
            "indicator": indicator,
            "interval": interval,
            "data_period": data_period,
            "indicator_period": indicator_period,
            "indicator_type": _classify_indicator(indicator),
            "indicator_columns": cols,
            "ohlcv": ohlcv,
            "indicator_series": indicator_series,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

