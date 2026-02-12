"""
Market Data Configuration for yfinance
Simplified - only essential data and constraints
"""

# Valid periods for yfinance
PERIODS = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]

# Intervals with their data availability limits (in days)
# None means unlimited historical data
INTERVAL_LIMITS = {
    # Intraday - limited history
    "1m": 7,
    "2m": 7,
    "5m": 60,
    "15m": 60,
    "30m": 60,
    "1h": 60,
    "90m": 60,
    # Daily and above - full history
    "1d": None,
    "5d": None,
    "1wk": None,
    "1mo": None,
    "3mo": None,
}

# Curated popular indicators (most commonly used)
POPULAR_INDICATORS = {
    'Momentum': [
        {'value': 'rsi', 'label': 'RSI - Relative Strength Index'},
        {'value': 'macd', 'label': 'MACD - Moving Average Convergence Divergence'},
        {'value': 'stoch', 'label': 'Stochastic Oscillator'},
        {'value': 'cci', 'label': 'CCI - Commodity Channel Index'},
        {'value': 'roc', 'label': 'ROC - Rate of Change'},
        {'value': 'willr', 'label': 'Williams %R'},
    ],
    'Trend': [
        {'value': 'sma', 'label': 'SMA - Simple Moving Average'},
        {'value': 'ema', 'label': 'EMA - Exponential Moving Average'},
        {'value': 'wma', 'label': 'WMA - Weighted Moving Average'},
        {'value': 'vwap', 'label': 'VWAP - Volume Weighted Average Price'},
        {'value': 'adx', 'label': 'ADX - Average Directional Index'},
    ],
    'Volatility': [
        {'value': 'bbands', 'label': 'Bollinger Bands'},
        {'value': 'atr', 'label': 'ATR - Average True Range'},
        {'value': 'kc', 'label': 'Keltner Channels'},
        {'value': 'donchian', 'label': 'Donchian Channels'},
    ],
    'Volume': [
        {'value': 'obv', 'label': 'OBV - On Balance Volume'},
        {'value': 'ad', 'label': 'AD - Accumulation/Distribution'},
        {'value': 'cmf', 'label': 'CMF - Chaikin Money Flow'},
        {'value': 'mfi', 'label': 'MFI - Money Flow Index'},
    ],
}

# Period to days mapping (approximate)
PERIOD_TO_DAYS = {
    "1d": 1,
    "5d": 5,
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
    "10y": 3650,
    "ytd": 365,  # Approximate
    "max": 10000,  # Arbitrary large number
}


def validate_period_interval_combination(period, interval):
    """
    Validate if period/interval combination is valid for yfinance.

    Args:
        period: Period string (e.g., '1d', '1mo', '1y')
        interval: Interval string (e.g., '1m', '5m', '1d')

    Returns:
        dict: {'valid': bool, 'error': str or None, 'warning': str or None}
    """
    if period not in PERIODS:
        return {'valid': False, 'error': f'Invalid period: {period}', 'warning': None}

    if interval not in INTERVAL_LIMITS:
        return {'valid': False, 'error': f'Invalid interval: {interval}', 'warning': None}

    # Check if intraday interval exceeds its limit
    limit = INTERVAL_LIMITS[interval]
    if limit is not None:
        period_days = PERIOD_TO_DAYS.get(period, 0)
        if period_days > limit:
            return {
                'valid': False,
                'error': f'{interval} interval is limited to {limit} days. Period {period} ({period_days} days) is too long.',
                'warning': None
            }
        # Add warning for intraday intervals
        warning = f"Note: {interval} data limited to last {limit} days"
        return {'valid': True, 'error': None, 'warning': warning}

    return {'valid': True, 'error': None, 'warning': None}


def get_config_for_frontend():
    """
    Return static configuration for frontend.
    Only includes periods, intervals, and popular indicators.
    All indicators are fetched dynamically by the API endpoint.
    """
    return {
        'periods': [{'value': p} for p in PERIODS],
        'intervals': [
            {
                'value': interval,
                'limitation': f"Limited to {limit} days" if limit else None
            }
            for interval, limit in INTERVAL_LIMITS.items()
        ],
        'popular_indicators': POPULAR_INDICATORS
    }

