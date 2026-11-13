"""
OpenTelemetry Distributed Tracing & Instrumentation Module for ARGUS.
Configures TracerProvider, context propagation, and secret redaction.
Instruments FastAPI, HTTPX outbound calls, database operations, and Temporal boundaries.
"""
import re
from typing import Any, Mapping, MutableMapping
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider, ReadableSpan, SpanProcessor
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    SimpleSpanProcessor,
    ConsoleSpanExporter,
)
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from argus.core.config import settings
from argus.core.logging import logger

# In-memory exporter for testing and local trace inspection
in_memory_exporter = InMemorySpanExporter()

# Compiled regex for secret redaction
SENSITIVE_KEY_PATTERN = re.compile(
    r"(?i)(authorization|api[-_]?key|secret|token|password|bearer|auth|cookie)"
)
SECRET_VALUE_PATTERN = re.compile(
    r"(sk-[a-zA-Z0-9_\-]{20,}|Bearer\s+[a-zA-Z0-9_\-\.]+)"
)


class RedactingSpanProcessor(SpanProcessor):
    """
    SpanProcessor that redacts secrets, tokens, and authorization credentials
    from all span attributes before exporting.
    """

    def on_start(self, span, parent_context=None) -> None:
        pass

    def on_end(self, span: ReadableSpan) -> None:
        if not span.attributes:
            return

        sanitized_attrs = dict(span.attributes)
        for key, value in list(sanitized_attrs.items()):
            # 1. Redact by attribute key name
            if SENSITIVE_KEY_PATTERN.search(key):
                sanitized_attrs[key] = "[REDACTED]"
            elif isinstance(value, str):
                # 2. Redact by value pattern matching
                if SECRET_VALUE_PATTERN.search(value):
                    sanitized_attrs[key] = SECRET_VALUE_PATTERN.sub("[REDACTED]", value)

        # Mutate the internal attributes dictionary
        span._attributes = sanitized_attrs

    def shutdown(self) -> None:
        pass

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return True


_initialized: bool = False
_tracer_provider: TracerProvider | None = None
_propagator = TraceContextTextMapPropagator()


def setup_telemetry() -> TracerProvider:
    """
    Initializes the OpenTelemetry TracerProvider with redacting processor
    and memory/console exporters.
    """
    global _initialized, _tracer_provider
    if _initialized and _tracer_provider:
        return _tracer_provider

    resource = Resource.create(
        {
            "service.name": settings.APP_NAME,
            "service.version": settings.APP_VERSION,
            "deployment.environment": settings.ENV,
        }
    )

    provider = TracerProvider(resource=resource)

    # 1. Add secret redaction processor first
    provider.add_span_processor(RedactingSpanProcessor())

    # 2. Add in-memory span exporter for test inspection
    provider.add_span_processor(SimpleSpanProcessor(in_memory_exporter))

    # 3. Add console exporter in debug mode
    if settings.DEBUG:
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    _tracer_provider = provider
    _initialized = True
    logger.info("OpenTelemetry TracerProvider initialized with RedactingSpanProcessor.")
    return provider


def get_tracer(name: str = "argus") -> trace.Tracer:
    """Returns a tracer instance."""
    setup_telemetry()
    return trace.get_tracer(name, settings.APP_VERSION)


def inject_trace_context(carrier: MutableMapping[str, str]) -> None:
    """Injects current W3C trace context into an outbound headers dictionary."""
    _propagator.inject(carrier)


def extract_trace_context(carrier: Mapping[str, str]) -> trace.Context:
    """Extracts W3C trace context from incoming headers dictionary."""
    return _propagator.extract(carrier)


def instrument_fastapi_app(app) -> None:
    """Instruments FastAPI application with OpenTelemetry middleware."""
    provider = setup_telemetry()
    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=provider,
        excluded_urls="health/live,health/ready",
    )
    logger.info("Instrumented FastAPI app with OpenTelemetry.")
