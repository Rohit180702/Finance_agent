"""
SQLAlchemy engine + session factories.

Sync engine  → used by background jobs (APScheduler runs in threads)
Async engine → used by FastAPI endpoints (async request handlers)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings

# ── Sync (for background jobs) ─────────────────────────────────────────────────
sync_engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)


# ── Async (for FastAPI endpoints) ──────────────────────────────────────────────
async_engine = create_async_engine(
    settings.DATABASE_URL_ASYNC,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Dependency helpers ─────────────────────────────────────────────────────────

def get_sync_db() -> Session:
    """Sync session for background jobs. Use as a context manager."""
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncSession:
    """Async session for FastAPI endpoint dependencies."""
    async with AsyncSessionLocal() as session:
        yield session


def create_all_tables():
    """Create all tables (used at startup if not using Alembic)."""
    from app.db.base import Base
    import app.db.models  # noqa: F401 — ensure models are registered
    Base.metadata.create_all(bind=sync_engine)
