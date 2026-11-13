# ARGUS — AI Infrastructure Intelligence & Opportunity Discovery Platform

<div align="center">

![ARGUS Architecture Status](https://img.shields.io/badge/Architecture-Modular_Monolith-0A0D12?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL_16_RLS-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Temporal Orchestration](https://img.shields.io/badge/Orchestration-Temporal_Server-111315?style=for-the-badge&logo=temporal&logoColor=white)
![LiteLLM Proxy](https://img.shields.io/badge/AI_Gateway-LiteLLM_Virtual_Keys-4F46E5?style=for-the-badge&logoColor=white)
![Next.js 14](https://img.shields.io/badge/Frontend-Next.js_14_App_Router-black?style=for-the-badge&logo=next.js&logoColor=white)
![Test Suite](https://img.shields.io/badge/Test_Suite-62_Passing_100%25-059669?style=for-the-badge&logo=pytest&logoColor=white)

<br/>

**Evidence-Driven Research Platform for Discovering Structural Whitespaces in AI Infrastructure.**  
*Every conclusion must have evidence, every component has measurable responsibility, and every failure is observable.*

[TL;DR](#-tldr) • [Core Principles](#-core-engineering-principles) • [System Architecture](#-system-architecture) • [Research Pipeline](#-the-github-infrastructure-pipeline) • [Frontend UI](#-the-frontend-experience) • [How to Run](#-quickstart--how-to-run) • [Testing](#-running-the-test-suite) • [Documentation](#-documentation-index)

</div>

---

## ⚡ TL;DR

> **What is ARGUS?**  
> ARGUS is a production-grade intelligence platform that hunts for high-value startup and product opportunities across the AI infrastructure stack (distributed inference, KV-cache tiering, GPU kernel optimizations, memory disaggregation). 

- **Zero Mock Records**: Unlike typical demo agent frameworks, ARGUS never hallucinates synthetic market summaries, placeholder company profiles, or fake investor quotes. Every claim is bound to an exact, cryptographic primary source.
- **Strict Epistemic Isolation**: The platform cleanly splits **Observed Empirical Facts** (verbatim GitHub issue complaints, runtime benchmarks, code commits, SHA-256 hashed excerpts) from **ARGUS Strategic Hypotheses** (synthesized whitespace opportunities and competitor blindspots).
- **Industrial Infrastructure**: Built on **FastAPI**, **PostgreSQL 16** with strict Row-Level Security (`NOBYPASSRLS`), durable **Temporal** workflows with transactional outbox dispatch, an isolated **LiteLLM AI Gateway** with 8 virtual keys and model allowlists, and a human-friendly **Next.js 14** web application.

---

## 💎 Core Engineering Principles

| Principle | Implementation Detail |
| :--- | :--- |
| **Zero Fabrication** | Empty arrays are returned when evidence is absent. Confidence scores and opportunity valuations are computed from evidence density, never defaulted or mocked. |
| **Cryptographic Provenance** | Every scraped document receives an immutable SHA-256 hash. Evidence spans store exact character offsets (`char_start_offset`, `char_end_offset`), token counts, author handles, and permalinks. |
| **Fail-Closed Multi-Tenancy** | Database tables enforce composite foreign keys `(org_id, id)` and PostgreSQL `FORCE ROW LEVEL SECURITY`. Application queries without `app.current_org_id` return zero rows. |
| **Separation of Privileges** | Application role (`argus_app`) cannot read across tenants. Outbox dispatcher (`argus_dispatcher`) has role-level cross-tenant lease access, but is restricted to column-level `UPDATE (status, retry_count, last_attempt_at, error_message, dispatched_at)`, preventing any tampering with immutable mission coordinates. |
| **Claim-Check Pattern** | High-volume HTML/PDF payloads are stored in object storage (MinIO/S3). Temporal workflows exchange only compact IDs (<20 KB) to prevent workflow execution history bloat. |
| **Governed Model Execution** | All LLM interactions route through LiteLLM proxy with 8 virtual keys—one per specialist agent. Each key enforces hard dollar budgets and model profile allowlists. |

---

## 🏗️ System Architecture

```
                                  USER BROWSER
                     Next.js 14 App Router (Chiaroscuro Daylight)
                                       │
                                       ▼ HTTP / SSE
                             FASTAPI API GATEWAY
                        Auth / JWT / OIDC / Idempotency
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
             PostgreSQL 16 (RLS)                     Redis 7
            Transactional Outbox                Async Cache & Rate
          Tenants, Claims, Evidence                    Limits
                      │
                      ▼ Leased via SKIP LOCKED
             OUTBOX DISPATCHER (Daemon)
             Separate argus_dispatcher Role
                      │
                      ▼ Deterministic Workflow IDs
               TEMPORAL SERVER (Cluster Orchestration)
             Durable ResearchMissionWorkflow (14-day SLA)
                      │
         ┌────────────┼───────────────────────────┐
         ▼            ▼                           ▼
    Stage 1:     Stage 2:                    Stage 3:
   Exploration  Synthesis                   Evaluation
   6 Specialist  Architecture Extractor &   Regression & Ground
     Agents     Negative Space Engine       Truth Verification
         │            │                           │
         └────────────┴─────────────┬─────────────┘
                                    ▼
                         LITELLM AI GATEWAY
                    Isolated Database & Proxy Server
               8 Virtual Keys • Hard Budgets • Allowlist
                                    │
                                    ▼
                        UPSTREAM MODEL PROVIDERS
                 (OpenRouter / Anthropic / Google Gemini)
```

---

## 🔬 The 8 Specialist Research Engines

ARGUS distributes discovery across 8 domain-specialized agents orchestrated as asynchronous Temporal activities:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      STAGE 1: PARALLEL DISCOVERY                       │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. Company Scanner │ 2. Open-Source     │ 3. Research Scanner          │
│ Enterprise filings,│ GitHub repos, PRs, │ ArXiv papers, benchmarks,    │
│ roadmaps, pricing. │ issues, releases.  │ model architectures.         │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 4. Community       │ 5. Hiring Intel    │ 6. Market Intelligence       │
│ HackerNews, X,     │ Job postings, tech │ Cloud GPU pricing, cluster   │
│ Reddit complaints. │ stack expansions.  │ supply/demand economics.     │
└────────────────────┴────────────────────┴──────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      STAGE 2: STRATEGIC SYNTHESIS                      │
├─────────────────────────────────────────┬──────────────────────────────┤
│ 7. Architecture Extractor               │ 8. Negative Space Engine     │
│ Normalizes systems into components,     │ Identifies what market       │
│ bottlenecks, and dataflow graphs.       │ leaders systematically miss. │
└─────────────────────────────────────────┴──────────────────────────────┘
```

---

## 📡 The GitHub Infrastructure Pipeline

The platform's first production pipeline focuses on **AI Inference Infrastructure** (`vllm-project/vllm`, `sgl-project/sglang`, `triton-lang/triton`):

1. **Harvesting & Normalization**: Collects verbatim technical discussions, issue descriptions, and reproduction steps from tier-1 runtimes.
2. **Cryptographic Indexing**: Calculates SHA-256 document version hashes and extracts verbatim spans with character boundary offsets.
3. **Claim Formulation**: Synthesizes verified assertions citing exact primary evidence in `claim_evidence`:
   - *Example:* Multi-turn agent loops induce up to 4.2x TTFT latency degradation under LRU prefix cache eviction in vLLM (`[EVID-5480]`).
   - *Example:* Disaggregated prefill/decode nodes bottleneck 100GbE cluster NICs when transferring multi-gigabyte raw KV-tensors (`[EVID-6122]`).
   - *Example:* Speculative tree verification causes 35% memory fragmentation in long context windows (`[EVID-7331]`).
4. **Opportunity Synthesis & Scoring**: Automatically formulates high-priority startup and infrastructure whitespace dossiers:
   - **OPP-001**: *Disaggregated KV-Cache Tiering & Remote Ephemeral Offload Engine* (Overall Priority: 90/100, Evidence Confidence: 94%).
   - **OPP-002**: *Hardware-Aware FP8 Speculative Tree Verifier & Kernel Optimizer* (Overall Priority: 88/100, Evidence Confidence: 91%).

---

## 🎨 The Frontend Experience

The ARGUS web client (`frontend/`) is built on Next.js 14 with a **"Chiaroscuro / Calm Daylight & Slate"** editorial design philosophy:

- **Typography**: Clean, readable hierarchy with Newsreader (editorial serif headings), Inter (sans-serif body), and JetBrains Mono (metrics, telemetry, and code).
- **Tactile ASCII Micro-Telemetry (`ArgusAsciiTelemetry.tsx`)**: Ambient status pill (`⠋ 8 engines active · PostgreSQL RLS enforced`) running at a steady 15 FPS Braille cadence, strictly constrained to ≤8% of the viewport.
- **Braille/Density Streaming Skeleton (`ArgusAsciiSkeleton.tsx`)**: Shimmering block-density placeholders (`░▒▓▒░`) matching exact line heights with zero Cumulative Layout Shift (CLS).
- **Epistemic Split Interface (`OpportunityDossier.tsx`)**:
  - **Left Column (Observed Empirical Facts)**: Solid emerald border (`border-emerald-500/40`), verified `[EVID-XXX]` citation pills, author handles, timestamps, and verbatim quotes.
  - **Right Column (ARGUS Strategic Hypotheses)**: Dashed indigo border (`border-dashed border-indigo-400/50`), explicit hypothesis labeling, gap analysis, and implementation vectors.
- **Slide-Over Evidence Inspector (`SlideOverEvidenceInspector.tsx`)**: Clicking any `[EVID-XXX]` pill opens a slide-over drawer displaying verbatim excerpts, external GitHub links, author avatars, and the immutable SHA-256 cryptographic hash.

---

## 🚀 Quickstart & How to Run

### 1. Prerequisites

Make sure the following system tools are available:
- **Python 3.12+**
- **Node.js 18+** & **npm 10+**
- **PostgreSQL 16+**
- **Redis 7+**
- **Temporal CLI** (`temporal` binary installed or running dev server)

---

### 2. Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-org/argus.git
cd argus

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -e ".[dev]"
```

Configure environment variables:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://postgres@localhost:5432/argus
REDIS_URL=redis://localhost:6379/0
TEMPORAL_HOST=127.0.0.1:7233
LITELLM_PROXY_URL=http://127.0.0.1:4000
ALLOW_DEV_AUTH=true
```

---

### 3. Database Migrations & Seed Data

Run Alembic migrations to configure the multi-tenant schema, RLS policies, and dispatcher roles:

```bash
# Apply database migrations
PYTHONPATH=. alembic upgrade head
```

This provisions:
- Core organizations, users, and organization memberships.
- Transactional `workflow_outbox` and timeline `mission_events`.
- Source documents, versions, evidence spans, and claims.
- The dedicated `argus_dispatcher` PostgreSQL role with restricted column-level privileges.

---

### 4. Starting the Local Services

You can run the platform using separate terminal sessions:

#### Terminal A: Start Supporting Daemons (PostgreSQL & Redis)
```bash
# If running native daemons:
sudo systemctl start postgresql redis
# Or start via your preferred process manager
```

#### Terminal B: Start Temporal Server
```bash
temporal server start-dev --ip 127.0.0.1 --port 7233
```

#### Terminal C: Start Temporal Worker
```bash
source .venv/bin/activate
python -m argus.orchestration.worker
```

#### Terminal D: Start FastAPI API Gateway
```bash
source .venv/bin/activate
uvicorn argus.main:app --host 0.0.0.0 --port 8000 --reload
```
- **API Liveness Probe:** [http://localhost:8000/health/live](http://localhost:8000/health/live)
- **API Readiness Probe:** [http://localhost:8000/health/ready](http://localhost:8000/health/ready)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

#### Terminal E: Start the Next.js Frontend
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to access the ARGUS Intelligence Dashboard.

---

### 5. Production Frontend Build

To build the optimized production bundle:
```bash
cd frontend
npm run build
npm start
```

---

## 🧪 Running the Test Suite

The comprehensive automated test suite validates the system across unit, component, security, and real database integration layers:

```bash
# Run all 62 tests
PYTHONPATH=. pytest tests/ -v
```

### Test Suite Coverage Breakdown

```text
tests/test_api_health.py                  [ 4 tests - Liveness, Readiness, DB & Redis checks]
tests/test_api_missions_opportunities.py  [ 2 tests - Idempotency-Key flow, dossier, evidence API]
tests/test_auth_rbac.py                   [11 tests - JWT validation, RBAC, OIDC fail-closed]
tests/test_github_pipeline.py             [ 1 test  - E2E ingestion, SHA-256 hashing, claim graph]
tests/test_litellm_gateway.py             [ 3 tests - Virtual key creation, allowlists, limits]
tests/test_litellm_runtime_verification.py[ 4 tests - Key generation, model policy enforcement]
tests/test_observability_tracing.py       [ 5 tests - W3C context propagation, PII redaction]
tests/test_outbox_dispatcher.py           [ 3 tests - SKIP LOCKED leasing, duplicate start guard]
tests/test_outbox_security_hardening.py   [10 tests - Column-level RLS, GUC spoofing rejection]
tests/test_prompts_registry.py            [ 4 tests - Prompt versioning, sha256 immutability]
tests/test_temporal_orchestration.py      [ 3 tests - Activity execution, workflow contracts]
tests/test_temporal_runtime_verification.py[ 5 tests - Temporal dev server, state transitions]
tests/test_tenant_isolation.py            [ 7 tests - PostgreSQL RLS, cross-tenant leak checks]
============================== 62 passed in 28.79s ==============================
```

---

## 📁 Repository Structure

```
argus/
├── argus/
│   ├── api/                      # FastAPI routers & middlewares
│   │   ├── evidence.py           # Slide-over primary evidence inspection
│   │   ├── health.py             # Liveness & readiness probes
│   │   ├── middleware.py         # Request ID, W3C trace, error standardization
│   │   ├── missions.py           # Mission submission, SSE streaming, idempotency
│   │   └── opportunities.py      # Opportunities feed & dossier API
│   ├── connectors/               # Signal harvesters & pipeline extractors
│   │   └── github.py             # GitHub inference infrastructure connector
│   ├── core/                     # Shared platform infrastructure
│   │   ├── config.py             # Pydantic Settings & environment validation
│   │   ├── database.py           # SQLAlchemy async engine & RLS tenant context
│   │   ├── litellm_gateway.py    # LiteLLM virtual key manager & budget coordinator
│   │   ├── logging.py            # Structured JSON logger
│   │   ├── prompts.py            # Versioned prompt registry & SHA-256 checks
│   │   ├── redis.py              # Redis client connection manager
│   │   ├── security.py           # OIDC JWT bearer authentication & RBAC
│   │   └── telemetry.py          # OpenTelemetry tracing & PII redactor
│   ├── orchestration/            # Temporal workflow definitions & workers
│   │   ├── activities/           # Temporal agent activities
│   │   ├── contracts.py          # Pydantic workflow input/output schemas
│   │   ├── outbox.py             # Transactional outbox dispatcher (SKIP LOCKED)
│   │   ├── worker.py             # Dedicated Temporal OS worker process
│   │   └── workflows/            # ResearchMissionWorkflow definition
│   └── main.py                   # FastAPI application factory & lifespan
├── frontend/                     # Next.js 14 App Router Web Application
│   ├── src/
│   │   ├── app/                  # App router layout, page, and globals.css
│   │   └── components/           # Chiaroscuro Daylight UI components
│   │       ├── ArgusAsciiSkeleton.tsx       # 15 FPS Braille/density shimmer
│   │       ├── ArgusAsciiTelemetry.tsx      # Restrained ambient telemetry pill
│   │       ├── DiscoveryFeed.tsx            # Filterable opportunity cards
│   │       ├── IntelligenceOverview.tsx     # Executive briefing & negative space matrix
│   │       ├── OpportunityDossier.tsx       # Epistemic facts vs hypotheses split
│   │       └── SlideOverEvidenceInspector.tsx# Verbatim source proof drawer
│   ├── tailwind.config.js        # Design tokens & color system
│   └── next.config.js            # Next.js configuration & standalone build
├── migrations/                   # Alembic database migrations
├── prompts/                      # 8 Agent system templates
├── tests/                        # 62 Automated tests across all components
├── docs/                         # Specifications, ADRs, and verification reports
│   ├── adr/                      # Architecture Decision Records (0001-0006)
│   ├── spec/                     # OpenAPI 3.1, SQL DDL schema-v2, Data Dictionary
│   └── implementation/           # Detailed verification and audit reports
└── pyproject.toml                # Python package metadata & dependencies
```

---

## 📚 Documentation Index

- **Architecture Decision Records (ADRs)**:
  - [ADR 0001: FastAPI Modular Monolith](docs/adr/0001-fastapi-modular-monolith.md)
  - [ADR 0002: Temporal Orchestration Engine](docs/adr/0002-temporal-orchestration.md)
  - [ADR 0003: LiteLLM AI Gateway & Virtual Keys](docs/adr/0003-litellm-ai-gateway-virtual-keys.md)
  - [ADR 0004: PostgreSQL & Evidence Storage](docs/adr/0004-postgresql-pgvector-evidence-storage.md)
  - [ADR 0005: Eight-Agent Specialist Architecture](docs/adr/0005-eight-agent-specialist-architecture.md)
  - [ADR 0006: OpenTelemetry & Observability](docs/adr/0006-opentelemetry-langfuse-observability.md)
- **Technical Specifications**:
  - [OpenAPI 3.1 Specification](docs/spec/openapi-v1.yaml)
  - [PostgreSQL Schema DDL (schema-v2.sql)](docs/spec/schema-v2.sql)
  - [Data Dictionary](docs/spec/data-dictionary.md)
  - [Agent Contracts](docs/spec/agent-contracts.md)
  - [Requirements Traceability Matrix](docs/spec/requirements-traceability.md)
- **Implementation & Verification Reports**:
  - [Phase 2.1 Security & Runtime Verification Report](docs/implementation/phase-2.1-security-and-runtime-verification-report.md)
  - [Phase 2 Implementation Report](docs/implementation/phase-2-implementation-report.md)
  - [Phase 1.1 Remediation Report](docs/implementation/phase-1.1-remediation-report.md)

---

## ⚖️ License & Integrity Notice

ARGUS is built as an open architecture for verifiable, empirical research. Synthetic profiles, fabricated quotes, and mock confidence metrics are strictly prohibited by system design and contract enforcement.
