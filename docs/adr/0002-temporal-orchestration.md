# ADR 0002: Temporal Workflow Orchestration & Reliable Dispatch

## Status
Accepted (Amended in Phase 0.6)

## Context
ARGUS research missions coordinate 8 specialist agents across diverse external sources and LLM providers. Missions run from tens of seconds to several minutes.
- Unbounded activity payloads pass through Temporal execution history, risking serialization latency and history bloat against Temporal's 2MB limit (with 256KB single-payload warnings).
- Network drops, worker restarts, and external API timeouts require durable retries without duplicating tasks or compounding rate limits.
- If an API crashes immediately after committing a mission to PostgreSQL but before calling Temporal, the mission remains stranded in `pending` indefinitely.

## Decision
1. **Durable Orchestration**: Every mission is governed by a deterministic `ResearchMissionWorkflow`.
2. **Claim-Check Pattern**: 
   - Activities must never pass raw HTML, PDFs, or large embeddings through workflow history.
   - Large payloads are stored directly in MinIO/S3 and PostgreSQL `document_versions`.
   - Activities return only lightweight identifiers (`document_id`, `version_id`, `count`, `duration_ms`) with serialized payloads strictly below 20 KB.
3. **Transactional Outbox Dispatch**:
   - The API commits mission creation and a `workflow_outbox` record in a single ACID database transaction.
   - An outbox dispatcher worker starts the Temporal workflow idempotently using `workflow_id = mission_id`.
4. **Heartbeat & Timeout Policies**:
   - Short extraction activities use `StartToCloseTimeout: 60s` with no heartbeat.
   - Long-running crawl activities (>30s) implement `HeartbeatTimeout: 30s` and invoke `activity.heartbeat()` after every pagination or processing batch.
5. **Retry Ownership & Anti-Multiplication**:
   - Temporal owns workflow-level exponential backoff with jitter.
   - Downstream clients (LiteLLM proxy, HTTP connectors) configure retry count ≤ 1 to prevent exponential retry amplification.

## Consequences
- **Positive**: Resilient state recovery, bounded workflow history size (<20KB payloads), zero stranded missions on API crash, immediate failure detection via heartbeats.
- **Negative**: Requires implementing the transactional outbox polling/listening worker and enforcing claim-check boundaries across all activity return types.
