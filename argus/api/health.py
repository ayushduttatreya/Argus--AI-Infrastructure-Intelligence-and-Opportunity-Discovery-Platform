"""
Health and Readiness Probes for ARGUS.
Provides liveness (/health/live) and dependency readiness (/health/ready and /api/v1/health).
"""
from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from argus.core.config import settings
from argus.core.database import check_database_health
from argus.core.redis import check_redis_health

router = APIRouter(tags=["Health"])


class ServiceStatus(BaseModel):
    database: str
    redis: str
    temporal: str
    litellm: str


class HealthResponse(BaseModel):
    status: str
    version: str
    services: ServiceStatus


@router.get("/health/live", summary="Liveness Probe")
async def liveness_probe() -> dict[str, str]:
    """Lightweight check verifying the process event loop is responsive."""
    return {"status": "alive", "version": settings.APP_VERSION}


@router.get("/health/ready", summary="Readiness Probe", response_model=HealthResponse)
@router.get("/api/v1/health", summary="API v1 Health Endpoint", response_model=HealthResponse)
async def readiness_probe(response: Response) -> HealthResponse:
    """
    Evaluates real connectivity to PostgreSQL and Redis.
    Fails readiness (HTTP 503) if database is unavailable.
    """
    db_healthy = await check_database_health()
    redis_healthy = await check_redis_health()

    db_str = "connected" if db_healthy else "disconnected"
    redis_str = "connected" if redis_healthy else "disconnected"
    temporal_str = "standby"
    litellm_str = "standby"

    overall_healthy = db_healthy and redis_healthy

    if not db_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        overall_status = "unhealthy"
    elif not redis_healthy:
        response.status_code = status.HTTP_200_OK
        overall_status = "degraded"
    else:
        response.status_code = status.HTTP_200_OK
        overall_status = "healthy"

    return HealthResponse(
        status=overall_status,
        version=settings.APP_VERSION,
        services=ServiceStatus(
            database=db_str,
            redis=redis_str,
            temporal=temporal_str,
            litellm=litellm_str,
        )
    )
