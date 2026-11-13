"""
ARGUS Platform API Gateway Entry Point.
Modular monolith FastAPI application.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from argus.api.health import router as health_router
from argus.api.middleware import RequestContextMiddleware
from argus.core.config import settings
from argus.core.database import check_database_health
from argus.core.logging import logger, setup_logging
from argus.core.redis import close_redis
from argus.core.telemetry import instrument_fastapi_app, setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and teardown lifecycle."""
    setup_logging(level="DEBUG" if settings.DEBUG else "INFO")
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} (ENV={settings.ENV})")

    # Verify initial database connection on startup
    db_ok = await check_database_health()
    logger.info(f"Startup Database check: {'OK' if db_ok else 'UNREACHABLE'}")

    yield

    # Clean shutdown
    logger.info("Shutting down ARGUS application...")
    await close_redis()
    logger.info("ARGUS application stopped cleanly.")


def create_app() -> FastAPI:
    """Factory creating and configuring the FastAPI instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Evidence-driven AI research and opportunity discovery platform.",
        lifespan=lifespan,
    )

    # 1. Register Middlewares
    app.add_middleware(RequestContextMiddleware)

    # 2. Register OpenTelemetry Instrumentation
    instrument_fastapi_app(app)

    # 2. Register Global Exception Handlers
    @app.exception_handler(StarletteHTTPException)
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException | HTTPException):
        request_id = getattr(request.state, "request_id", None)
        trace_id = getattr(request.state, "trace_id", None)

        if isinstance(exc.detail, dict):
            error_code = exc.detail.get("error_code", f"HTTP_{exc.status_code}")
            message = exc.detail.get("message", "An error occurred.")
            details = exc.detail.get("details", None)
        else:
            error_code = f"HTTP_{exc.status_code}"
            message = str(exc.detail)
            details = None

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": error_code,
                "message": message,
                "request_id": request_id,
                "trace_id": trace_id,
                "details": details,
            },
            headers={"X-Request-ID": str(request_id), "X-Trace-ID": str(trace_id)}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", None)
        trace_id = getattr(request.state, "trace_id", None)
        return JSONResponse(
            status_code=400,
            content={
                "error_code": "VALIDATION_FAILED",
                "message": "Invalid request parameters or payload schema.",
                "request_id": request_id,
                "trace_id": trace_id,
                "details": {"errors": exc.errors()},
            },
            headers={"X-Request-ID": str(request_id), "X-Trace-ID": str(trace_id)}
        )

    # 3. Mount Routers
    app.include_router(health_router)

    return app


app = create_app()
