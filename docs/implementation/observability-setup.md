# ARGUS — Distributed Observability & OpenTelemetry Setup Guide

This document details the OpenTelemetry architecture, span lifecycle, context propagation, and secret redaction rules implemented in ARGUS.

---

## 1. Observability Architecture

```
                       INCOMING REQUEST
                              │
                    ┌─────────▼─────────┐
                    │ FastAPI Middleware │  --> TraceContext (X-Request-ID, W3C traceparent)
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  TracerProvider   │  --> Service: ARGUS Intelligence Platform
                    └─────────┬─────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
    [RedactingSpanProcessor]     [InMemorySpanExporter / OTLP]
    Scans & scrubs secrets       Exports sanitized spans
               │
      ┌────────┴────────┐
      ▼                 ▼
[Outbox Dispatch] [Temporal Worker]
Propagates trace  Parent/Child span
to workflow queue correlation
```

---

## 2. Distributed Trace Context Propagation

ARGUS implements W3C standard trace context propagation across all network and service boundaries:
- **FastAPI HTTP Layer:** Middleware extracts `traceparent` headers (`00-{trace_id}-{span_id}-01`). If absent, fresh identifiers are generated.
- **Transactional Outbox:** Context is serialized into outbox payload metadata.
- **Temporal Orchestration:** Worker and workflow activities restore the parent span context from the input metadata.
- **Outbound HTTP / Model Gateway:** `inject_trace_context(headers)` adds `traceparent` to HTTPX requests sent to LiteLLM or external APIs.

---

## 3. Strict Secret Redaction Engine

To prevent accidental data leakage into log aggregation platforms and distributed tracing backends, `RedactingSpanProcessor` filters every span before export:

### 3.1 Key-Based Redaction
Any attribute whose key matches the pattern below is replaced with `"[REDACTED]"`:
```regex
(?i)(authorization|api[-_]?key|secret|token|password|bearer|auth|cookie)
```

### 3.2 Value-Based Pattern Matching
Any string attribute value containing credential signatures is scrubbed:
```regex
(sk-[a-zA-Z0-9_\-]{20,}|Bearer\s+[a-zA-Z0-9_\-\.]+)
```

---

## 4. Local Testing & Exporter Configuration

By default, an `InMemorySpanExporter` is active during testing and local development, allowing assertion of spans in automated test suites without requiring a running OpenTelemetry collector.

To configure an external OTLP collector in production:
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"
```
