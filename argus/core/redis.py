"""
Redis Connection & Lifecycle Management for ARGUS.
Supports TCP and Unix domain sockets with health verification.
"""
from typing import Optional
import redis.asyncio as aioredis
from argus.core.config import settings
from argus.core.logging import logger

_redis_client: Optional[aioredis.Redis] = None


def get_redis_client() -> aioredis.Redis:
    """Returns the global async Redis client instance."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            socket_timeout=settings.REDIS_TIMEOUT_SECONDS,
            socket_connect_timeout=settings.REDIS_TIMEOUT_SECONDS,
            decode_responses=True,
        )
    return _redis_client


async def check_redis_health() -> bool:
    """Sends a PING command to verify Redis connectivity within timeout."""
    try:
        client = get_redis_client()
        pong = await client.ping()
        return pong is True
    except Exception as exc:
        logger.error(f"Redis health check failed: {exc}")
        return False


async def close_redis() -> None:
    """Closes the Redis client connection gracefully."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception as exc:
            logger.warning(f"Error closing Redis client: {exc}")
        finally:
            _redis_client = None
