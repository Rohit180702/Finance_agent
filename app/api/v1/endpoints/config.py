from fastapi import APIRouter, HTTPException
from app.models.response import ConfigResponse, ErrorResponse
from app.config.market_data import get_config_for_frontend
from app.services.indicator_service import get_all_indicators_from_pandas_ta

router = APIRouter()


@router.get(
    "/config",
    response_model=ConfigResponse,
    summary="Get Market Data Configuration",
    description="Returns available periods, intervals, indicators, and strategy presets for market data"
)
async def get_config():
    """
    Get market data configuration including:
    - Available data periods (1d, 5d, 1mo, etc.)
    - Available intervals (1m, 5m, 1h, 1d, etc.)
    - Popular indicators (curated list)
    - All available indicators from pandas-ta (200+)
    """
    try:
        # Get static configuration
        static_config = get_config_for_frontend()

        # Get all indicators dynamically from pandas-ta
        all_indicators = get_all_indicators_from_pandas_ta()

        # Combine static config with dynamic indicators
        config = {
            **static_config,
            'indicators': {
                'popular': static_config['popular_indicators'],
                'all': all_indicators
            }
        }

        # Remove the popular_indicators key (now in indicators.popular)
        config.pop('popular_indicators', None)

        return ConfigResponse(success=True, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

