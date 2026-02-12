"""
Stock service for loading and searching NSE stocks.
"""

import json
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Optional


@lru_cache(maxsize=1)
def load_stock_data():
    """
    Load stock data from JSON file.
    Cached to avoid repeated file reads.

    Returns:
        dict: Stock data with 'metadata', 'popular', 'all' keys
    """
    # Get path to app/data/nse_stocks.json
    path_to_stock_data = Path("app/data/nse_stocks.json")

    # Open and read JSON file
    with open(path_to_stock_data, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Return parsed JSON
    return data

def get_all_stocks() -> Dict:
    """
    Get all stocks data.

    Returns:
        dict: Contains 'metadata', 'popular', 'all'
    """
    # Call load_stock_data()
    data = load_stock_data()

    # Return the data
    return data


def get_popular_stocks() -> List[Dict]:
    """
    Get NIFTY 50 stocks.

    Returns:
        list: List of NIFTY 50 stock dicts
    """
    # Load stock data
    data = load_stock_data()

    # Return 'popular' key
    return data['popular']

def search_stocks(query: str, limit: int = 20) -> List[Dict]:
    """
    Search stocks by symbol or name.

    Args:
        query: Search term (e.g., "reliance", "tcs")
        limit: Maximum results to return

    Returns:
        list: List of matching stocks
    """
    # Load stock data
    data = load_stock_data()

    # Get 'all' stocks
    all_stocks = data['all']

    # Convert query to lowercase
    query_lower = query.lower()

    # Filter stocks where query in symbol (lowercase) OR query in name (lowercase)
    results = [
        stock for stock in all_stocks
        if query_lower in stock['symbol'].lower() or query_lower in stock['name'].lower()
    ]

    # Return first 'limit' results
    return results[:limit]


def get_stock_by_symbol(symbol: str) -> Optional[Dict]:
    """
    Get stock info by symbol.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE.NS" or "RELIANCE")

    Returns:
        dict: Stock info or None if not found
    """
    # Load stock data
    data = load_stock_data()

    # Get 'all' stocks
    all_stocks = data['all']

    # Normalize symbol (add .NS if not present)
    if not symbol.endswith('.NS'):
        symbol = f"{symbol}.NS"

    # Search for stock with matching symbol
    for stock in all_stocks:
        if stock['symbol'].upper() == symbol.upper():
            return stock

    # Return None if not found
    return None
