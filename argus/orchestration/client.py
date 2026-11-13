"""
Temporal Client Connection and Health Check Module for ARGUS.
"""
from temporalio.client import Client
from argus.core.config import settings
from argus.core.logging import logger

_cached_client: Client | None = None


async def get_temporal_client(target_host: str | None = None) -> Client:
    """
    Returns an async Temporal client connected to the configured Temporal server.
    """
    global _cached_client
    host = target_host or settings.TEMPORAL_HOST
    if _cached_client is None:
        logger.info(f"Connecting to Temporal server at {host} (namespace: {settings.TEMPORAL_NAMESPACE})")
        _cached_client = await Client.connect(
            host,
            namespace=settings.TEMPORAL_NAMESPACE,
        )
    return _cached_client


async def check_temporal_health(target_host: str | None = None) -> bool:
    """
    Validates that the Temporal cluster is reachable and responsive.
    """
    try:
        client = await get_temporal_client(target_host=target_host)
        # Verify cluster readiness by listing namespaces or fetching system info
        await client.service_client.check_health()
        return True
    except Exception as exc:
        logger.warning(f"Temporal health check failed: {exc}")
        return False
