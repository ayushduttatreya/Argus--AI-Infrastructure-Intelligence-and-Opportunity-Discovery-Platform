# ARGUS — AI Infrastructure Intelligence & Opportunity Discovery Platform

ARGUS is a real, evidence-driven research platform powered by 8 specialist agents, durable Temporal workflow orchestration, LiteLLM gateway governance, and PostgreSQL pgvector hybrid search.

Every conclusion must have evidence, every component has measurable responsibility, and every failure is observable.

---

## Architecture Overview

```
                      ARGUS WEB APPLICATION
                     Next.js / TypeScript
                              │
                              ▼
                     FASTAPI API GATEWAY
                     Auth / RBAC / Probes
                   ┌──────────┴──────────┐
                   ▼                     ▼
              PostgreSQL 16           Redis 7
            pgvector + RLS          Async Cache
                   │
                   ▼
            TEMPORAL SERVER
            Durable Workflow
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
Agents 1-6      Agent 7        Agent 8
Concurrent    Architecture   Negative Space
Discovery      Extractor        Engine
                   │              │
                   └──────┬───────┘
                          ▼
                  EVIDENCE PROVENANCE
               pgvector + Full-Text Search
```

---

## Core Engineering Principles

1. **Zero Dummy Data**: No synthetic records, no placeholder startup profiles, no hardcoded confidence defaults. Empty arrays are valid results.
2. **Structural Multi-Tenancy**: Composite foreign keys `(org_id, id)` prevent cross-organization entity relationships. PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`) enforces data isolation at the engine level.
3. **Claim-Check Pattern**: Large scraped HTML and PDF documents are stored in object storage (MinIO/S3). Temporal workflow activities exchange only lightweight IDs (<20 KB payloads).
4. **Deterministic Level 1 Auditing**: Granular SQL tables for `prompt_versions`, `model_calls`, `tool_calls`, and `mission_events`.
5. **Least Privilege AI Gateway**: LiteLLM proxy assigns independent virtual keys to each agent with explicit model allowlists and hard dollar spend budgets.

---

## Quickstart & Local Development

### 1. Prerequisites
- Python 3.12+
- PostgreSQL 16+
- Redis 7+

### 2. Setup Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### 3. Database & Migrations
```bash
# Configure local database URL in .env
cp .env.example .env

# Run database migrations
PYTHONPATH=. alembic upgrade head
```

### 4. Run the API Server
```bash
uvicorn argus.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Liveness probe**: `http://localhost:8000/health/live`
- **Readiness probe**: `http://localhost:8000/health/ready`
- **OpenAPI documentation**: `http://localhost:8000/docs`

### 5. Running the Automated Test Suite
```bash
# Run all tests (including tenant isolation & RLS tests)
PYTHONPATH=. pytest tests/ -v
```

---

## Documentation Index

- **Architecture Decisions**: [docs/adr/](docs/adr/)
- **API Specification (OpenAPI 3.1)**: [docs/spec/openapi-v1.yaml](docs/spec/openapi-v1.yaml)
- **Database Schema DDL**: [docs/spec/schema-v2.sql](docs/spec/schema-v2.sql)
- **Data Dictionary**: [docs/spec/data-dictionary.md](docs/spec/data-dictionary.md)
- **Agent Contracts**: [docs/spec/agent-contracts.md](docs/spec/agent-contracts.md)
- **Requirements Matrix**: [docs/spec/requirements-traceability.md](docs/spec/requirements-traceability.md)
- **Phase 1 Implementation Report**: [docs/implementation/phase-1-implementation-report.md](docs/implementation/phase-1-implementation-report.md)
- **Phase 1.1 Remediation Report**: [docs/implementation/phase-1.1-remediation-report.md](docs/implementation/phase-1.1-remediation-report.md)
- **Phase 2 Implementation Report**: [docs/implementation/phase-2-implementation-report.md](docs/implementation/phase-2-implementation-report.md)
- **Database Setup Guide**: [docs/implementation/database-setup.md](docs/implementation/database-setup.md)
- **Security & Access Control Guide**: [docs/implementation/security-setup.md](docs/implementation/security-setup.md)
- **Temporal Setup Guide**: [docs/implementation/temporal-setup.md](docs/implementation/temporal-setup.md)
- **LiteLLM AI Gateway Guide**: [docs/implementation/litellm-setup.md](docs/implementation/litellm-setup.md)
- **Observability Setup Guide**: [docs/implementation/observability-setup.md](docs/implementation/observability-setup.md)
