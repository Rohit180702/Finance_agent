from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from langgraph.checkpoint.redis import RedisSaver
from app.core.redis_client import get_redis_checkpointer_client
import logging

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def startup_event():
    """Initialize Redis indices on startup"""
    try:
        logger.info("Initializing Redis checkpointer indices...")
        redis_client = get_redis_checkpointer_client()
        checkpointer = RedisSaver(redis_client=redis_client)
        checkpointer.setup()
        logger.info("✅ Redis checkpointer initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Redis: {str(e)}")
        logger.warning("Application will continue, but conversation memory may not work")


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "Finance Agent API",
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

