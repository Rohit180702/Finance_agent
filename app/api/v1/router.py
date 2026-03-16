from fastapi import APIRouter
from app.api.v1.endpoints import config, technical, stocks, chat, fundamental, screener, news

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(config.router, tags=["Configuration"])
api_router.include_router(technical.router, prefix="/technical", tags=["Technical Analysis"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["Stocks"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(fundamental.router, prefix="/fundamental", tags=["Fundamental Analysis"])
api_router.include_router(screener.router, prefix="/screener", tags=["Screener"])
api_router.include_router(news.router, prefix="/news", tags=["News"])
