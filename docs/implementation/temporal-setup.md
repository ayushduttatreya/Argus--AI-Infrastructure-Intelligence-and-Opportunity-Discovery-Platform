# ARGUS — Temporal Orchestration Setup Guide

This document details the configuration, deployment, lifecycle mechanics, and local execution of the Temporal workflow orchestration engine within the ARGUS AI Intelligence Platform.

---

## 1. Architectural Role

Temporal acts as the durable workflow engine for ARGUS research missions. It guarantees that long-running multi-agent research tasks survive worker crashes, network timeouts, and model rate limits without corrupting database state.

### Core Principles
1. **Deterministic Workflows:** Workflows in `argus/orchestration/workflows/mission_workflow.py` are strictly deterministic. They contain no direct database queries, no external HTTP network requests, and no unseeded random number generation.
2. **I/O in Activities:** All database updates, event streaming (`mission_events`), and external model invocations are executed inside bounded Temporal Activities (`argus/orchestration/activities/mission_activities.py`).
3. **Claim-Check Pattern:** Payloads passed to workflows and activities contain lightweight identifiers (`org_id`, `mission_id`) and small metadata. Large document contents and raw scraped evidence remain in PostgreSQL or MinIO object storage.
4. **Deterministic Workflow IDs:** Workflow instances are keyed by:
   ```
   argus-mission-{org_id}-{mission_id}
   ```
   This prevents concurrent duplicate workflow executions for the same mission.

---

## 2. Local Development & Native Execution

ARGUS supports running against a native Temporal development server without Docker.

### 2.1 Starting Local Dev Server
The Temporal CLI is installed at `.venv/bin/temporal`:

```bash
# Start native Temporal development server (persisted in SQLite)
.venv/bin/temporal server start-dev \
    --ip 127.0.0.1 \
    --port 7233 \
    --db-filename /tmp/temporal_data.db \
    --headless
```

### 2.2 Verifying Cluster Health
```bash
.venv/bin/temporal operator cluster health --address 127.0.0.1:7233
```

---

## 3. Worker Configuration & Concurrency Limits

The worker runner is located in `argus/orchestration/worker.py`.

```python
from argus.orchestration.worker import run_worker
import asyncio

asyncio.run(run_worker())
```

### Concurrency Budgets
To prevent exhausting PostgreSQL connection pools and CPU resources:
- `max_concurrent_activities = 10`
- `max_concurrent_workflow_tasks = 10`
- Task Queue: `argus-research-tasks`

---

## 4. Retry Policies & Timeout Configuration

Activities use bounded exponential backoff to avoid retry multiplication with external services:

| Parameter | Value | Rationale |
|:---|:---|:---|
| **Initial Interval** | 1.0 second | Immediate transient recovery |
| **Backoff Coefficient** | 2.0 | Exponential delay growth |
| **Maximum Interval** | 15.0 seconds | Caps delay to prevent prolonged stalls |
| **Maximum Attempts** | 3 attempts | Prevents infinite retry loops |
| **Non-Retryable Errors** | `NonRetryableMissionError` | Fails fast on invalid missions or missing tenant context |
| **Heartbeat Timeout** | 10.0 seconds | Detects dead or stalled workers |

---

## 5. Cancellation Handling

When a workflow receives a cancellation signal or external cancel request:
1. Catches `asyncio.CancelledError`.
2. Uses `await asyncio.shield(...)` to guarantee compensation activities run.
3. Updates `research_missions.status = 'cancelled'` in PostgreSQL under tenant context.
4. Emits `mission_cancelled` in `mission_events`.
