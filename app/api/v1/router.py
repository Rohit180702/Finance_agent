from fastapi import APIRouter
from app.api.v1.endpoints import config, technical

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(config.router, tags=["Configuration"])
api_router.include_router(technical.router, prefix="/technical", tags=["Technical Analysis"])

