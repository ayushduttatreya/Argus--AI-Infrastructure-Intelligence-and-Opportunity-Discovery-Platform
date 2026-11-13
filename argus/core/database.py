"""
Async Database Engine & Session Management for ARGUS.
Implements bounded connection pooling and transaction-local tenant context (RLS).
"""
import uuid
from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from argus.core.config import settings
from argus.core.logging import logger

# Bounded engine with explicit connection budgets
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    echo=settings.DB_ECHO,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def check_database_health() -> bool:
    """Executes a simple query to verify database connectivity."""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        return False


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding standard database sessions."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def set_tenant_context(session: AsyncSession, org_id: uuid.UUID | str) -> None:
    """
    Sets the transaction-local tenant context required by PostgreSQL RLS.
    Must be called inside an active transaction.
    """
    tenant_str = str(org_id)
    # Using text bind parameter to avoid SQL injection
    await session.execute(
        text("SELECT set_config('app.current_org_id', :org_id, true)"),
        {"org_id": tenant_str}
    )
    logger.debug(f"Transaction tenant context set to org_id: {tenant_str}")
