"""
Stock API endpoints.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict
from app.services.stock_service import (
    get_all_stocks,
    get_popular_stocks,
    search_stocks,
    get_stock_by_symbol
)

router = APIRouter()


@router.get("/popular", summary="Get Popular Stocks")
async def get_popular_stocks_endpoint():
    """
    Get NIFTY 50 stocks (popular stocks).

    Returns:
        dict: Response with popular stocks
    """
    # Call get_popular_stocks()
    stocks = get_popular_stocks()

    # Return response
    return {
        "success": True,
        "count": len(stocks),
        "stocks": stocks
    }


@router.get("/all", summary="Get All Stocks")
async def get_all_stocks_endpoint():
    """
    Get all NSE stocks.

    Returns:
        dict: Response with all stocks and metadata
    """
    # Call get_all_stocks()
    data = get_all_stocks()

    # Return response
    return {
        "success": True,
        "metadata": data['metadata'],
        "stocks": data['all']
    }


@router.get("/search", summary="Search Stocks")
async def search_stocks_endpoint(
    q: str = Query(..., description="Search query (symbol or company name)", min_length=1),
    limit: int = Query(20, ge=1, le=100, description="Maximum results to return")
):
    """
    Search stocks by symbol or company name.

    Args:
        q: Search query
        limit: Max results (1-100)

    Returns:
        dict: Response with matching stocks
    """
    # Call search_stocks(q, limit)
    results = search_stocks(q, limit)

    # Return response
    return {
        "success": True,
        "query": q,
        "count": len(results),
        "stocks": results
    }


@router.get("/{symbol}", summary="Get Stock by Symbol")
async def get_stock_endpoint(symbol: str):
    """
    Get detailed info about a specific stock.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE.NS" or "RELIANCE")

    Returns:
        dict: Stock information

    Raises:
        HTTPException: 404 if stock not found
    """
    # Call get_stock_by_symbol(symbol)
    stock = get_stock_by_symbol(symbol)

    # If stock is None, raise 404
    if stock is None:
        raise HTTPException(status_code=404, detail=f"Stock '{symbol}' not found")

    # Return response
    return {
        "success": True,
        "stock": stock
    }
