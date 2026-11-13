# ADR 0006: Observability with OpenTelemetry and Langfuse

## Status
Accepted

## Context
When an AI agent produces an inaccurate claim, takes an inefficient reasoning path, or fails during tool invocation, debugging requires full visibility into the execution tree: prompts, system instructions, model latency, token consumption, tool parameters, raw responses, and retry attempts.

## Decision
Implement dual-layer observability across all ARGUS workflows:
1. **OpenTelemetry (OTel)**: Distributed tracing across the FastAPI backend, Temporal activities, HTTP source connectors, and database queries using standard GenAI semantic conventions.
2. **Langfuse**: Detailed LLM tracing, prompt version management, generation latency tracking, token usage, cost attribution per agent virtual key, and offline evaluation datasets.
3. **Structured Tool Audit Logging**: Every tool execution must record:
   - Tool name & version
   - Invoking Agent identity
   - Mission ID
   - Redacted request arguments
   - Response status & latency
   - Evidence IDs generated or referenced
4. **Deterministic Evaluation (Level 1)** on every execution + **Quality Evaluation (Level 2)** via offline benchmark suites (Ragas, faithfulness tests) without doubling runtime inference costs.

## Consequences
- **Positive**: Instant diagnosis of regressions, clear tracking of token spending per agent, versioned prompts, observable failure modes.
- **Negative**: Instrumentation overhead; care must be taken to sanitize PII and sensitive API keys from trace payloads.
