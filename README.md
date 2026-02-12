# Finance Agent - Technical Analysis Platform

A modern, production-grade finance platform built with **FastAPI** and **React** for technical, fundamental, and sentiment analysis.

## 🚀 Tech Stack

### Backend
- **FastAPI** - Modern async web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation with type hints
- **LangGraph** - Agent orchestration
- **Claude Sonnet 4.5** - LLM by Anthropic
- **yfinance** - Market data
- **pandas-ta** - Technical indicators

### Frontend
- **React 18** - UI library
- **Vite** - Build tool & dev server
- **Axios** - HTTP client
- **CSS Modules** - Scoped styling

## 📁 Project Structure

```
Finance_agent/
├── backend/
│   └── app/
│       ├── api/v1/          # API endpoints
│       ├── models/          # Pydantic models
│       ├── services/        # Business logic
│       ├── core/            # Configuration
│       └── main.py          # FastAPI app
├── frontend/
│   └── src/
│       ├── components/      # React components
│       ├── services/        # API client
│       ├── hooks/           # Custom hooks
│       └── styles/          # CSS files
├── config/                  # Market data config
├── agent/                   # LangGraph agent
└── models/                  # Claude model
```

## 🛠️ Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Install Python dependencies (already done with uv):
```bash
uv add fastapi uvicorn pydantic pydantic-settings python-multipart
```

2. Set up environment variables:
```bash
# Create .env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## 🚀 Running the Application

### Start Backend (Terminal 1)

```bash
# From project root
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The FastAPI server will start at **http://localhost:8000**

- API Docs (Swagger): http://localhost:8000/docs
- Alternative Docs (ReDoc): http://localhost:8000/redoc

### Start Frontend (Terminal 2)

```bash
# From frontend directory
cd frontend
npm run dev
```

The React app will start at **http://localhost:5173**

## 📊 Features

### Current Features (Technical Analysis)
- ✅ 10+ Technical Indicators (RSI, MACD, SMA, EMA, Bollinger Bands, etc.)
- ✅ Dynamic market data configuration
- ✅ Period/interval validation
- ✅ Trading strategy presets
- ✅ Real-time indicator calculation
- ✅ Beautiful, responsive UI
- ✅ Automatic API documentation

### Coming Soon
- 🔜 Fundamental Analysis
- 🔜 Sentiment Analysis
- 🔜 Multi-indicator comparison
- 🔜 Historical data visualization
- 🔜 Real-time WebSocket updates
- 🔜 User authentication
- 🔜 Saved queries/favorites

## 🎯 API Endpoints

### Configuration
- `GET /api/v1/config` - Get market data configuration

### Technical Analysis
- `POST /api/v1/technical/calculate` - Calculate indicator
- `POST /api/v1/technical/analyze` - Natural language analysis

## 📝 Example Usage

### Calculate RSI for AAPL

**Request:**
```json
POST /api/v1/technical/calculate
{
  "symbol": "AAPL",
  "indicator": "rsi",
  "interval": "1d",
  "data_period": "6mo",
  "indicator_period": 14
}
```

**Response:**
```json
{
  "success": true,
  "response": "The RSI for AAPL is 65.32...",
  "params": {
    "symbol": "AAPL",
    "indicator": "rsi",
    "interval": "1d",
    "data_period": "6mo",
    "indicator_period": 14
  },
  "warning": null
}
```

## 🔧 Development

### Backend Development
- Auto-reload enabled with `uvicorn --reload`
- API docs at `/docs` for testing
- Type safety with Pydantic models

### Frontend Development
- Hot module replacement with Vite
- Component-based architecture
- Custom hooks for API calls
- Responsive design

## 📚 Documentation

- [Migration Plan](MIGRATION_PLAN.md) - Details about the FastAPI + React migration
- [Market Data Config](MARKET_DATA_CONFIG.md) - Market data configuration system
- [API Docs](http://localhost:8000/docs) - Interactive API documentation (when running)

## 📄 License

MIT License
