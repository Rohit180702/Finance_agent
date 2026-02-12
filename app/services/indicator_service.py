"""
Service for managing technical indicators from pandas-ta library.
"""

from functools import lru_cache
import pandas_ta as ta


@lru_cache(maxsize=1)
def get_all_indicators_from_pandas_ta():
    """
    Get all available indicators from pandas-ta library using the built-in Category dictionary.
    Extracts full indicator names from docstrings.
    Cached to avoid repeated calls.

    Returns:
        dict: Dictionary of categories with their indicators
              Format: {
                  'Momentum': [
                      {'value': 'rsi', 'label': 'RSI - Relative Strength Index'},
                      ...
                  ],
                  ...
              }
    """
    result = {}

    # Use pandas-ta's built-in Category dictionary
    # This is the official source and always up-to-date
    categories = ta.Category

    for cat_key, indicator_names in categories.items():
        # Get display name for category (capitalize and pluralize if needed)
        cat_display = _format_category_name(cat_key)

        indicators = []
        for ind_name in indicator_names:
            # Get the indicator function from pandas_ta
            if hasattr(ta, ind_name):
                func = getattr(ta, ind_name)

                # Extract full name from docstring
                full_name = _extract_indicator_name_from_docstring(func, ind_name)

                # Create label: "RSI - Relative Strength Index"
                indicators.append({
                    'value': ind_name.lower(),
                    'label': f"{ind_name.upper()} - {full_name}"
                })

        if indicators:
            # Sort indicators alphabetically by value
            result[cat_display] = sorted(indicators, key=lambda x: x['value'])

    return result


def _format_category_name(cat_key):
    """
    Format category name for display.

    Args:
        cat_key: Category key from ta.Category (e.g., 'candle', 'momentum')

    Returns:
        str: Formatted category name (e.g., 'Candle', 'Momentum')
    """
    # Just capitalize, no pluralization
    return cat_key.capitalize()


def _extract_indicator_name_from_docstring(func, fallback_name):
    """
    Extract the full indicator name from the function's docstring.

    Args:
        func: The indicator function
        fallback_name: Name to use if docstring extraction fails

    Returns:
        str: Full indicator name
    """
    try:
        if callable(func) and hasattr(func, '__doc__') and func.__doc__:
            # Get the first line of the docstring (usually contains the full name)
            first_line = func.__doc__.strip().split('\n')[0].strip()

            # If first line is not empty and looks like a name (not too long)
            if first_line and len(first_line) < 100:
                return first_line
    except Exception:
        pass

    # Fallback: Convert snake_case to Title Case
    return fallback_name.replace('_', ' ').title()


def get_indicator_info(indicator_name):
    """
    Get detailed information about a specific indicator.

    Args:
        indicator_name: Name of the indicator (e.g., 'rsi', 'macd')

    Returns:
        dict: Indicator information including name, description, category
              Returns None if indicator not found
    """
    if not hasattr(ta, indicator_name):
        return None

    func = getattr(ta, indicator_name)

    # Extract full name
    full_name = _extract_indicator_name_from_docstring(func, indicator_name)

    # Find category
    category = None
    for cat_key, indicators in ta.Category.items():
        if indicator_name in indicators:
            category = cat_key.capitalize()
            break

    return {
        'value': indicator_name,
        'name': full_name,
        'category': category,
        'has_docstring': hasattr(func, '__doc__') and bool(func.__doc__)
    }

