"""
Simple script to fetch NSE stock list and save as JSON.
Run manually when you want to update the stock list.

Usage:
    python scripts/generate_stock_list.py
"""

import pandas as pd
import json
from pathlib import Path
from datetime import datetime


# Step 1: Define URLs
NSE_ALL_STOCKS_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
NIFTY50_URL = "https://archives.nseindia.com/content/indices/ind_nifty50list.csv"


def fetch_all_nse_stocks():
    """
    Fetch all NSE stocks from NSE website.

    Returns:
        list: List of stock dicts with symbol, name, sector, isin
    """
    print("📥 Fetching all NSE stocks...")

    # Read CSV from URL using pandas
    df = pd.read_csv(NSE_ALL_STOCKS_URL)

    # Clean column names (strip spaces)
    df.columns = df.columns.str.strip()

    # Create list to store stocks
    stocks = []

    # Loop through rows and create list of dicts
    for _, row in df.iterrows():
        stock = {
            'symbol': f"{row['SYMBOL']}.NS",           # Add .NS suffix for yfinance
            'nse_symbol': row['SYMBOL'],                # Original NSE symbol
            'name': row['NAME OF COMPANY'],             # Company name
            'series': row['SERIES'],                    # Series (EQ, BE, etc.)
            'isin': row['ISIN NUMBER']                  # ISIN code
        }
        stocks.append(stock)

    print(f"✅ Found {len(stocks)} stocks")

    return stocks


def fetch_nifty50():
    """
    Fetch NIFTY 50 stocks from NSE website.

    Returns:
        list: List of NIFTY 50 stock dicts
    """
    print("📥 Fetching NIFTY 50 stocks...")

    # Read CSV from URL using pandas
    df = pd.read_csv(NIFTY50_URL)

    # Clean column names (strip spaces)
    df.columns = df.columns.str.strip()

    # Create list to store stocks
    stocks = []

    # Loop through rows and create list of dicts
    for _, row in df.iterrows():
        stock = {
            'symbol': f"{row['Symbol']}.NS",            # Add .NS suffix for yfinance
            'nse_symbol': row['Symbol'],                # Original NSE symbol
            'name': row['Company Name'],                # Company name
            'sector': row['Industry'],                  # Sector/Industry
            'isin': row['ISIN Code'],                   # ISIN code
            'series': row['Series']                     # Series (EQ)
        }
        stocks.append(stock)

    print(f"✅ Found {len(stocks)} stocks")

    return stocks


def save_to_json(all_stocks, nifty50_stocks):
    """
    Save stocks to JSON file.

    Args:
        all_stocks: List of all NSE stocks
        nifty50_stocks: List of NIFTY 50 stocks
    """
    print("💾 Saving to JSON file...")

    # Create data structure with metadata, popular, all
    data = {
        "metadata": {
            "last_updated": datetime.now().isoformat(),
            "total_stocks": len(all_stocks),
            "nifty50_count": len(nifty50_stocks),
            "source": "NSE India",
            "version": "1.0"
        },
        "popular": nifty50_stocks,
        "all": all_stocks
    }

    # Create app/data directory if it doesn't exist
    output_path = Path("app/data/nse_stocks.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Save to app/data/nse_stocks.json with indent=2
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved to {output_path}")


def main():
    """Main function"""
    print("=" * 80)
    print("NSE Stock List Generator")
    print("=" * 80)
    print()

    # Fetch data
    all_stocks = fetch_all_nse_stocks()
    nifty50_stocks = fetch_nifty50()

    # Save to file
    save_to_json(all_stocks, nifty50_stocks)

    # Print summary
    print()
    print("=" * 80)
    print("✅ Done!")
    print(f"Total stocks: {len(all_stocks)}")
    print(f"NIFTY 50: {len(nifty50_stocks)}")
    print(f"Saved to: app/data/nse_stocks.json")
    print("=" * 80)


if __name__ == "__main__":
    main()
