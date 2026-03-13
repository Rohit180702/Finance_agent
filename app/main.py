import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


# ── Lifespan (replaces deprecated @app.on_event) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks, yield for requests, then run shutdown tasks."""

    # ── 1. Run Alembic migrations ──────────────────────────────────────────────
    try:
        from alembic.config import Config
        from alembic import command
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ DB migrations applied (alembic upgrade head)")
    except Exception as e:
        logger.error("❌ Alembic migration failed: %s", e)

    # ── 2. LangGraph checkpointer → Postgres ──────────────────────────────────
    from app.core.checkpointer import set_checkpointer
    try:
        import psycopg
        from langgraph.checkpoint.postgres import PostgresSaver

        conn = psycopg.connect(
            settings.DATABASE_URL.replace("+psycopg2", ""),
            autocommit=True,
        )
        checkpointer = PostgresSaver(conn)
        checkpointer.setup()   # creates LangGraph checkpoint tables if absent
        set_checkpointer(checkpointer)
        logger.info("✅ LangGraph checkpointer → Postgres initialized")
    except Exception as e:
        logger.error("❌ Postgres checkpointer init failed: %s", e)
        logger.warning("Falling back to Redis checkpointer…")
        try:
            from langgraph.checkpoint.redis import RedisSaver
            from app.core.redis_client import get_redis_checkpointer_client
            redis_client = get_redis_checkpointer_client()
            checkpointer = RedisSaver(redis_client=redis_client)
            checkpointer.setup()
            set_checkpointer(checkpointer)
            logger.info("✅ LangGraph checkpointer → Redis (fallback)")
        except Exception as e2:
            logger.error("❌ Redis checkpointer fallback also failed: %s", e2)
            set_checkpointer(None)

    # ── 3. Stock metrics cache job ─────────────────────────────────────────────
    try:
        from sqlalchemy import text
        from app.db.engine import SyncSessionLocal
        from app.jobs.stock_cache_job import (
            refresh_stock_cache, get_cache_meta, backfill_postgres_from_redis,
        )

        _scheduler.add_job(
            refresh_stock_cache,
            trigger="cron",
            hour=6, minute=0,
            id="stock_cache_refresh",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        _scheduler.start()
        logger.info("✅ Stock cache scheduler started (daily 06:00 IST)")

        loop = asyncio.get_event_loop()

        # Check Postgres row count
        with SyncSessionLocal() as db:
            pg_count = db.execute(
                text("SELECT COUNT(*) FROM stock_metrics_history")
            ).scalar() or 0

        redis_meta = get_cache_meta()

        if pg_count == 0 and redis_meta and redis_meta.get("ok", 0) > 0:
            # Postgres empty but Redis warm → fast backfill (no yfinance)
            logger.info(
                "📥 Postgres empty, Redis has %d stocks — backfilling…",
                redis_meta["ok"],
            )
            loop.run_in_executor(None, backfill_postgres_from_redis)

        elif pg_count == 0 and (redis_meta is None or redis_meta.get("ok", 0) == 0):
            # Both caches cold → full refresh (slow, hits yfinance)
            logger.info("📊 Both caches cold — triggering full stock refresh…")
            loop.run_in_executor(None, refresh_stock_cache)

        else:
            logger.info(
                "📊 Postgres has %d stock rows, Redis meta ok=%s — skipping refresh",
                pg_count, redis_meta.get("ok", "?") if redis_meta else "none",
            )

    except Exception as e:
        logger.error("❌ Stock cache scheduler failed to start: %s", e)

    yield  # ← application runs here

    # ── Shutdown ───────────────────────────────────────────────────────────────
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Finance Agent API",
        "version": settings.VERSION,
        "status":  "running",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
