"""
Integration tests for ARGUS OpenTelemetry Distributed Tracing & Secret Redaction.
Validates TracerProvider, W3C traceparent propagation, and credential redaction.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from opentelemetry import trace
from argus.main import app
from argus.core.telemetry import (
    get_tracer,
    inject_trace_context,
    extract_trace_context,
    in_memory_exporter,
    setup_telemetry,
)


@pytest.fixture(autouse=True)
def clear_exporter():
    in_memory_exporter.clear()
    setup_telemetry()
    yield
    in_memory_exporter.clear()


def test_tracer_initialization_and_span_creation():
    """Verify tracer creates spans exported to memory exporter."""
    tracer = get_tracer("test_tracer")
    with tracer.start_as_current_span("test_span", attributes={"test.attr": "value"}):
        pass

    spans = in_memory_exporter.get_finished_spans()
    assert len(spans) >= 1
    span = spans[-1]
    assert span.name == "test_span"
    assert span.attributes.get("test.attr") == "value"


def test_trace_context_injection_and_extraction():
    """Verify W3C traceparent header injection and roundtrip extraction."""
    tracer = get_tracer("context_test")
    carrier = {}

    with tracer.start_as_current_span("parent_span") as parent_span:
        inject_trace_context(carrier)

    assert "traceparent" in carrier
    traceparent = carrier["traceparent"]
    assert traceparent.startswith("00-")

    # Extract back
    ctx = extract_trace_context(carrier)
    extracted_span = trace.get_current_span(ctx)
    extracted_span_ctx = extracted_span.get_span_context()

    assert format(extracted_span_ctx.trace_id, "032x") in traceparent


def test_redacting_span_processor_scrubs_secrets():
    """
    Verify RedactingSpanProcessor strictly scrubs API keys, authorization tokens,
    and sensitive user secrets from exported spans.
    """
    tracer = get_tracer("security_test")
    raw_api_key = "sk-live-abcdef12345678901234567890"
    raw_bearer = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret"

    with tracer.start_as_current_span(
        "credential_span",
        attributes={
            "api_key": raw_api_key,
            "Authorization": raw_bearer,
            "service.user_query": f"Fetch data using key {raw_api_key}",
            "normal_attribute": "safe_value",
        },
    ):
        pass

    spans = in_memory_exporter.get_finished_spans()
    assert len(spans) >= 1
    span = spans[-1]

    # Explicit assertions that sensitive data was redacted
    assert span.attributes["api_key"] == "[REDACTED]"
    assert span.attributes["Authorization"] == "[REDACTED]"
    assert raw_api_key not in span.attributes["service.user_query"]
    assert "[REDACTED]" in span.attributes["service.user_query"]
    assert span.attributes["normal_attribute"] == "safe_value"


@pytest.mark.asyncio
async def test_fastapi_trace_propagation():
    """Verify incoming requests create trace spans with request context."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health/ready")
        assert resp.status_code == 200
        assert "X-Request-ID" in resp.headers


def test_end_to_end_distributed_trace_context_propagation():
    """
    Verify complete distributed trace context propagation across pipeline boundaries:
    FastAPI API Span -> Transactional Outbox Event -> Temporal Workflow ->
    Activity Execution -> LiteLLM Gateway Span.
    All spans must share the exact same trace_id, and RedactingSpanProcessor must scrub secrets.
    """
    tracer = get_tracer("argus.pipeline")

    # 1. API Boundary (FastAPI request span)
    with tracer.start_as_current_span("fastapi.post_mission") as api_span:
        api_trace_id = format(api_span.get_span_context().trace_id, "032x")
        carrier = {}
        inject_trace_context(carrier)

        # 2. Outbox Boundary (context serialized into JSON payload)
        outbox_payload = {
            "mission_id": "m-123",
            "target_topic": "Quantum Computing",
            "trace_context": carrier,
        }

        # 3. Temporal Workflow Boundary (deserialized and extracted)
        extracted_ctx = extract_trace_context(outbox_payload["trace_context"])
        with tracer.start_as_current_span("temporal.workflow.ResearchMissionWorkflow", context=extracted_ctx) as wf_span:
            wf_trace_id = format(wf_span.get_span_context().trace_id, "032x")

            # 4. Activity Boundary
            with tracer.start_as_current_span("temporal.activity.execute_stage") as act_span:
                act_trace_id = format(act_span.get_span_context().trace_id, "032x")

                # 5. LiteLLM Gateway Span with sensitive credentials
                with tracer.start_as_current_span(
                    "litellm.completion",
                    attributes={
                        "llm.model": "anthropic/claude-3.5-sonnet",
                        "api_key": "sk-secret-agent-key",
                        "Authorization": "Bearer sk-litellm-master-key",
                    },
                ) as llm_span:
                    llm_trace_id = format(llm_span.get_span_context().trace_id, "032x")

    # Verify all stages share the exact same distributed trace ID
    assert api_trace_id == wf_trace_id == act_trace_id == llm_trace_id

    # Verify RedactingSpanProcessor scrubbed sensitive credentials in exported spans
    spans = in_memory_exporter.get_finished_spans()
    llm_exported = next(s for s in spans if s.name == "litellm.completion")
    assert llm_exported.attributes["api_key"] == "[REDACTED]"
    assert llm_exported.attributes["Authorization"] == "[REDACTED]"
