"""
FastAPI Health, Readiness & Middleware Integration Tests.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from argus.main import app


@pytest.mark.asyncio
async def test_liveness():
    """Verify /health/live returns 200 with alive status."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health/live")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "alive"
        assert "version" in data
        assert "X-Request-ID" in resp.headers
        assert "X-Trace-ID" in resp.headers


@pytest.mark.asyncio
async def test_readiness_healthy():
    """Verify /health/ready and /api/v1/health report healthy database and redis."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["services"]["database"] == "connected"
        assert data["services"]["redis"] == "connected"

        # Check /api/v1/health endpoint
        v1_resp = await client.get("/api/v1/health")
        assert v1_resp.status_code == 200
        assert v1_resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_request_id_propagation():
    """Verify custom X-Request-ID and traceparent are propagated."""
    custom_id = "custom-uuid-12345"
    trace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    headers = {"X-Request-ID": custom_id, "traceparent": trace}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health/live", headers=headers)
        assert resp.headers["X-Request-ID"] == custom_id
        assert resp.headers["X-Trace-ID"] == "4bf92f3577b34da6a3ce929d0e0e4736"


@pytest.mark.asyncio
async def test_standardized_error_format():
    """Verify 404 errors adhere to the OpenAPI ErrorResponse schema."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/non-existent-route")
        assert resp.status_code == 404
        data = resp.json()
        assert "error_code" in data
        assert "message" in data
        assert "request_id" in data
        assert "trace_id" in data
        assert resp.headers.get("X-Request-ID") == data["request_id"]
