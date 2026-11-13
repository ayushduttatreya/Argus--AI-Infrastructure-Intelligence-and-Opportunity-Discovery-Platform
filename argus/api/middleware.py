"""
HTTP Middleware for ARGUS API Gateway.
Provides Request ID tracking, W3C trace context, and standardized error schemas.
"""
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from argus.core.logging import logger


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Ensures every request has a unique request_id and captures W3C trace context.
    Adds X-Request-ID and X-Trace-ID headers to responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        # 1. Resolve or generate Request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # 2. Extract W3C traceparent if present
        traceparent = request.headers.get("traceparent")
        trace_id = None
        if traceparent:
            parts = traceparent.split("-")
            if len(parts) >= 2:
                trace_id = parts[1]
        if not trace_id:
            trace_id = uuid.uuid4().hex
        request.state.trace_id = trace_id

        # Attach to logger context
        extra = {"request_id": request_id, "trace_id": trace_id}

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Attach headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Trace-ID"] = trace_id

            logger.info(
                f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.2f}ms)",
                extra=extra
            )
            return response

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"Unhandled exception during {request.method} {request.url.path}: {exc}",
                exc_info=True,
                extra=extra
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error_code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred processing your request.",
                    "request_id": request_id,
                    "trace_id": trace_id,
                    "details": None,
                },
                headers={"X-Request-ID": request_id, "X-Trace-ID": trace_id}
            )
