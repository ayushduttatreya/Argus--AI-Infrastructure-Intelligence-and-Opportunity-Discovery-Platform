# ARGUS — Phase 2: Stage 1 Repository and Environment Audit

**Date:** November 13, 2026  
**Auditor:** Senior Distributed Systems Engineer & AI Platform Architect  
**Objective:** Complete pre-implementation inspection of database contracts, software packages, daemons, and execution constraints.

---

## 1. Software & Environment Inventory

| Software / Dependency | Required | Current State | Notes |
|:---|:---:|:---|:---|
| **PostgreSQL** | 16+ | PostgreSQL 16.15 (PGDG Noble) | Daemon active on `/tmp/.s.PGSQL.5432`. Database `argus` operational. |
| **pgvector Extension** | 0.8.0+ | **BLOCKED / NOT INSTALLED** | Ubuntu host package `postgresql-16-pgvector` pending. Migration `b82438fa431e` correctly blocked. |
| **Redis** | 7+ | Redis 7.0.15 | Daemon active on `/tmp/redis.sock`. Connection verified via `PONG`. |
| **Python Virtualenv** | 3.12+ | Python 3.12.3 in `/home/ayush/Argus/.venv` | Operational. |
| **Temporal CLI** | 1.10+ | `temporal version 1.10.0 (Server 1.32.2, UI 2.56.1)` | Installed at `/home/ayush/Argus/.venv/bin/temporal`. |
| **Temporal Python SDK** | 1.5+ | `temporalio 1.36.0` | Installed in virtualenv. |
| **LiteLLM** | 1.0+ | `litellm 1.109.1` | Installed in virtualenv with proxy dependencies. |
| **OpenTelemetry SDK** | 1.24+ | `opentelemetry-sdk 1.42.0`, `opentelemetry-api 1.45.2`, `opentelemetry-instrumentation-fastapi 0.63b0` | Installed in virtualenv. |
| **Model Credentials** | OpenRouter / OpenAI / Gemini | **NOT CONFIGURED** (`OPENROUTER_API_KEY` unset) | Real upstream model calls will be reported as BLOCKED until user provides keys. |

---

## 2. Database Schema & Contract Inspection

### 2.1 Alembic Revisions
- **Applied Revision:** `a71329da290d` (`baseline_schema_v2`)
  - 25 core tables created and verified.
  - RLS and `FORCE ROW LEVEL SECURITY` active on 20 tenant tables.
  - Role separation: all tables owned by `postgres`; runtime role `argus_app` (`NOBYPASSRLS`).
- **Gated Revision:** `b82438fa431e` (`evidence_embeddings_pgvector`)
  - Strictly blocked until `vector` extension is installed on PostgreSQL host.

### 2.2 Execution & Orchestration Tables
1. **`workflow_outbox`**:
   - Primary key: `id` (UUID).
   - Foreign keys: `(org_id, mission_id) -> research_missions(org_id, id) ON DELETE CASCADE`.
   - Columns: `status` (`pending`, `dispatched`, `failed`), `retry_count`, `last_attempt_at`, `error_message`, `dispatched_at`.
   - Indexes: `idx_outbox_dispatch` on `(status, created_at) WHERE status = 'pending'`.
   - Tenant isolation: RLS enabled and forced on `org_id`.
2. **`research_missions`**:
   - Columns: `id`, `org_id`, `idempotency_key`, `target_topic`, `status` (`pending`, `running`, `completed`, `partial_failure`, `failed`, `cancelled`), `temporal_workflow_id`, `temporal_run_id`, `coverage_summary`.
   - Indexes: `uq_missions_org_idempotency` on `(org_id, idempotency_key)`, `idx_missions_temporal_wf` on `(temporal_workflow_id)`.
3. **`mission_events`**:
   - Append-only event log with `(org_id, mission_id)`.
   - Index: `idx_mission_events_stream` on `(org_id, mission_id, id)`.
4. **`agent_executions`**:
   - Links to `(org_id, mission_id)` and `agent_id` (`agent_definitions`).
   - Tracks `attempt_number`, `status`, `tokens_consumed`, `cost_usd`, `error_code`, `started_at`, `finished_at`.
5. **`model_calls`**:
   - Records granular LLM invocations linked to `agent_execution_id` and `prompt_version_id`.
   - Tracks `model_name`, `provider`, `input_tokens`, `output_tokens`, `cost_usd`, `latency_ms`, `status`.
6. **`tool_calls`**:
   - Records tool executions with `input_parameters`, `output_summary`, `latency_ms`, `evidence_ids`.
7. **`prompt_versions`**:
   - Versioned prompts with `(agent_id, version_tag)` unique constraint.
   - Immutable with `sha256_hash`, `system_template`, `input_variables`, `is_active`.

---

## 3. Architecture Alignment for Phase 2 Implementation

1. **Temporal Orchestration (`argus/orchestration/`)**:
   - Clean separation of workflows (`argus/orchestration/workflows/`) and activities (`argus/orchestration/activities/`).
   - Workflows remain purely deterministic: no direct DB queries, no network calls, no UUID generation without Temporal workflow random generator.
   - Activities handle async database operations, event persistence, and bounded concurrency.
   - Workflow ID pattern: `argus-mission-{org_id}-{mission_id}`.
2. **Transactional Outbox Dispatcher (`argus/orchestration/outbox.py`)**:
   - Uses `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction.
   - Leases pending records with exponential backoff on retry.
   - Idempotently dispatches to Temporal using deterministic workflow IDs (handles `WorkflowAlreadyStartedError`).
   - Transitions outbox state to `dispatched` upon successful acknowledgement.
3. **LiteLLM Model Gateway (`argus/core/litellm_gateway.py`)**:
   - Standalone LiteLLM proxy configuration with PostgreSQL persistence.
   - Separate database (`argus_litellm`) or table namespace to isolate proxy state.
   - 8 virtual agent keys generated with per-agent budget limits and model allowlists.
   - Upstream OpenRouter routing.
4. **Prompt Registry (`argus/core/prompts.py`)**:
   - Central registry for immutable prompt versions with SHA256 integrity hashing.
   - Every model call links to an explicit `prompt_version_id`.
5. **OpenTelemetry Instrumentation (`argus/core/telemetry.py`)**:
   - OpenTelemetry TracerProvider with trace propagation across FastAPI, SQLAlchemy, HTTPX, Outbox, and Temporal activities.
   - Sensitive credential redaction in spans.

**Audit Status:** APPROVED TO PROCEED TO STAGE 2.
