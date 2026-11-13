# ARGUS — Phase 1.1 Foundation Remediation & Verification Report

**Date:** November 13, 2026  
**Auditor:** Senior Backend Engineer & Platform Security Architect  
**Status:** COMPLETE — CONDITIONAL GO FOR PHASE 2  
**Target Environment:** PostgreSQL 16.15 (Native Unix Socket), Redis 7.0.15 (Native Unix Socket), Python 3.12.3  

---

## 1. Executive Summary

During Phase 1 execution, a temporary domain workaround (`CREATE DOMAIN vector AS double precision[]`) was introduced because the native PostgreSQL extension `pgvector` was not available in the container sandbox.

**This Phase 1.1 Remediation successfully audits, eradicates, and replaces that workaround with an uncompromising, production-grade architecture:**
1. **Fake Vector Type Eradicated:** The custom domain `vector` has been entirely purged from the canonical SQL schema (`docs/spec/schema-v2.sql`), the Alembic migration history, and the active PostgreSQL instance.
2. **Strict Native pgvector Requirement:** Vector embeddings are now strictly typed as native `vector(1536)` with an HNSW cosine index. A dedicated, gated migration (`b82438fa431e_evidence_embeddings_pgvector.py`) enforces this prerequisite; it halts with an explicit `RuntimeError` and host installation instructions if `pgvector` is not present, completely preventing silent type substitution or schema drift.
3. **Core Schema Operational:** All 25 core tables (tenancy, users, missions, events, transactional outbox, agents, prompts, executions, raw source documents, versions, evidence spans, entities, relationships, claims, opportunities, and evaluations) are fully migrated under Alembic revision `a71329da290d`.
4. **Hardened RLS & Tenant Isolation:** 7 comprehensive security tests verify that the non-owner runtime role `argus_app` (`NOBYPASSRLS`) fails closed on missing context, enforces strict CRUD isolation (SELECT, UPDATE, DELETE, and INSERT WITH CHECK), prevents context leakage across connection-pooled sessions, cleanly resets on transaction rollback, and enforces composite foreign keys across tenant boundaries.
5. **Robust OIDC & RBAC Enforcement:** 11 authentication tests confirm fail-closed security for token expiration, signature forgery, mismatched issuer/audience, unsigned tokens (`alg: none`), missing/malformed tenant claims, RBAC role gating, and production-time assertion denying development tokens.
6. **Telemetry Realism:** Telemetry documentation has been audited to accurately reflect in-process W3C `traceparent` extraction and structured JSON logging, distinguishing it from full distributed tracing (OpenTelemetry collector/Langfuse), which is scheduled for Phase 2.

**Verdict: CONDITIONAL GO FOR PHASE 2.**  
Core platform, data isolation, and API foundations are verified and production-ready. The condition for enabling vector similarity search in Phase 2/3 is the installation of `postgresql-16-pgvector` on the host database.

---

## 2. Audit Findings: Identification & Eradication of Fake Vector Type

### 2.1 File Inspection Results

| Component | File Path | Previous State | Remediated State |
|:---|:---|:---|:---|
| **Canonical SQL** | `docs/spec/schema-v2.sql` | Contained fallback: `DO $$ BEGIN ... CREATE DOMAIN vector AS double precision[]; ... END $$;` | Fallback removed. Enforces `CREATE EXTENSION IF NOT EXISTS "vector";`, `embedding vector(1536) NOT NULL`, and `USING hnsw (embedding vector_cosine_ops)`. |
| **Alembic Baseline** | `migrations/versions/a71329da290d_baseline_schema_v2.py` | Contained `CREATE DOMAIN vector` fallback and embedded `evidence_embeddings` table creation. | Purged all domain references and `evidence_embeddings`. Manages the 25 core tables. |
| **Alembic Vector** | `migrations/versions/b82438fa431e_evidence_embeddings_pgvector.py` | Did not exist. | Newly created. Checks `pg_available_extensions` for `vector`. Fails closed if missing. |
| **PostgreSQL Database** | Active `argus` DB | Domain `public.vector` existed with `typtype = 'd'`. | Database dropped and recreated cleanly. `SELECT typname FROM pg_type WHERE typname = 'vector'` returns 0 rows. |

### 2.2 Proof of Eradication in Database

Execution of the type query against the active database:
```sql
SELECT n.nspname, t.typname, t.typtype
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'vector';
```
**Output:**
```
 nspname | typname | typtype 
---------+---------+---------
(0 rows)
```
No fake vector types, domains, or aliases exist anywhere in the system.

---

## 3. Extension Verification

### 3.1 PostgreSQL Extension Catalog Query Results

```sql
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE name = 'vector';
```
**Output:** `(0 rows)`

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```
**Output:** `(0 rows)`

### 3.2 Explanation & Root Cause
The operating system image is Ubuntu 24.04 (Noble) running PostgreSQL 16.15. The `postgresql-16-pgvector` package is packaged in the official PostgreSQL APT repository (`apt.postgresql.org`), but has not been installed into the OS environment. Installing binary extensions into PostgreSQL requires root privileges (`sudo apt-get install -y postgresql-16-pgvector`) and outbound network access, which are restricted inside unprivileged sandbox containers.

### 3.3 Host Installation Prerequisites
To install the real pgvector extension in staging and production:
```bash
# Add official PostgreSQL APT repository if needed
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install pgvector for PostgreSQL 16
sudo apt-get update
sudo apt-get install -y postgresql-16-pgvector

# Enable the extension in the database
psql -U postgres -d argus -c "CREATE EXTENSION vector;"
```

---

## 4. Schema & Migration Architecture

### 4.1 Staged Migration Strategy
To guarantee database integrity and prevent silent degradation, migrations are split into two decoupled revisions:

```
[a71329da290d] baseline_schema_v2
       |  (25 core relational tables, RLS policies, triggers, indexes)
       v
[b82438fa431e] evidence_embeddings_pgvector
          (Gated on real pgvector extension; creates evidence_embeddings & HNSW index)
```

1. **`a71329da290d_baseline_schema_v2.py`**:
   - Manages all tenant isolation, entities, claims, relationships, outbox, and audit logs.
   - Applies 100% cleanly without requiring any C-extensions.
   - Sets up `ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` on all 20 tenant-scoped tables.
2. **`b82438fa431e_evidence_embeddings_pgvector.py`**:
   - Executes pre-flight validation against `pg_available_extensions`.
   - If `vector` is present: executes `CREATE EXTENSION IF NOT EXISTS "vector"`, creates `evidence_embeddings` with `embedding vector(1536)`, and builds the HNSW cosine index `idx_evidence_hnsw_cosine`.
   - If `vector` is missing: aborts transactionally and raises `RuntimeError`.

### 4.2 Clean Failure Verification
Running `alembic upgrade head` when pgvector is absent produces an unambiguous failure:
```
RuntimeError: ENVIRONMENT BLOCKED: The real pgvector extension is not installed in the PostgreSQL instance.
Host package required: postgresql-16-pgvector (pgvector 0.8.0+).
Install command (requires host root/sudo): sudo apt-get update && sudo apt-get install -y postgresql-16-pgvector
This migration is blocked to prevent fake type substitution or schema drift.
```
Transactional DDL in PostgreSQL rolls back the upgrade cleanly, leaving `alembic current` intact at `a71329da290d`.

---

## 5. Tenant Isolation Verification

All 7 RLS test scenarios in `tests/test_tenant_isolation.py` were executed against the native PostgreSQL 16 instance under the dedicated runtime application role `argus_app`.

### 5.1 Runtime Role Properties
- **Role Name:** `argus_app`
- **Superuser:** `NO`
- **Bypass RLS (`rolbypassrls`):** `False` (Enforced `NOBYPASSRLS`)
- **Table Ownership:** 0 tables owned (all tables owned by `postgres`, preventing owner-bypass)

### 5.2 Test Scenarios & Results

| Test Function | What It Proves | Result |
|:---|:---|:---:|
| `test_every_tenant_table_has_rls_and_force_rls` | Validates that all 20 tenant tables have both `relrowsecurity = true` and `relforcerowsecurity = true`. Even table owners would be restricted by RLS. | **PASSED** |
| `test_runtime_role_properties` | Verifies `argus_app` exists, has `rolbypassrls = false`, and owns zero tables in the public schema. | **PASSED** |
| `test_missing_tenant_context_fails_closed` | Verifies that queries issued by `argus_app` without executing `SET LOCAL app.current_org_id` return 0 rows. Default is fail-closed. | **PASSED** |
| `test_crud_isolation_between_two_organizations` | Tests complete CRUD isolation between Org A and Org B: SELECT returns 0 cross-tenant rows; direct PK lookups return None; UPDATE affects 0 rows; DELETE affects 0 rows; INSERT with cross-tenant `org_id` raises PostgreSQL `InsufficientPrivilegeError` (RLS policy violation). | **PASSED** |
| `test_tenant_context_not_leaking_through_pooled_connections` | Verifies that `SET LOCAL app.current_org_id` is strictly transaction-scoped. A subsequent query on the same physical connection outside a transaction returns 0 rows. | **PASSED** |
| `test_transaction_rollback_clears_tenant_context` | Verifies that an explicit rollback cleanses session settings immediately. | **PASSED** |
| `test_cross_tenant_composite_foreign_key_rejection` | Validates composite foreign keys: prevents an entity from Org A linking to an entity from Org B in the `relationships` table (`fk_rel_target` and `fk_rel_source` composite integrity). | **PASSED** |

---

## 6. Authentication & Authorization Verification

All 11 authentication test scenarios in `tests/test_auth_rbac.py` passed against FastAPI endpoints protected by `get_current_user` and `require_role`.

### 6.1 Test Scenarios & Results

| Test Function | Security Principle Tested | Result |
|:---|:---|:---:|
| `test_auth_missing_token_fails_closed` | Missing `Authorization` header returns 401 `AUTH_REQUIRED`. | **PASSED** |
| `test_auth_invalid_signature_rejected` | Tampered token signature returns 401 `INVALID_CREDENTIALS`. | **PASSED** |
| `test_auth_expired_token_rejected` | Token with `exp < now` returns 401 `TOKEN_EXPIRED`. | **PASSED** |
| `test_auth_incorrect_issuer_rejected` | Mismatched `iss` claim returns 401 `INVALID_ISSUER`. | **PASSED** |
| `test_auth_incorrect_audience_rejected` | Mismatched `aud` claim returns 401 `INVALID_AUDIENCE`. | **PASSED** |
| `test_auth_unsupported_none_algorithm_rejected` | Unsigned tokens (`{"alg": "none"}`) are explicitly rejected with 401 `UNSUPPORTED_ALGORITHM`. | **PASSED** |
| `test_auth_missing_tenant_claim_rejected` | Valid token missing `org_id` claim fails closed with 401 `INVALID_CLAIMS`. | **PASSED** |
| `test_auth_malformed_uuid_in_claims_rejected` | Token with non-UUID `org_id` or `sub` fails closed with 401 `INVALID_CLAIMS`. | **PASSED** |
| `test_auth_valid_dev_token_success` | Valid signed HS256 development token authenticates and extracts user identity. | **PASSED** |
| `test_rbac_enforcement` | User with role `researcher` accessing `admin` endpoint is rejected with 403 `FORBIDDEN`. Admin user succeeds. | **PASSED** |
| `test_dev_tokens_disallowed_in_production` | Invoking `create_dev_token()` when `ENVIRONMENT = "production"` raises `RuntimeError`. | **PASSED** |

---

## 7. Telemetry & Observability Audit

### 7.1 What Exists Today
- **W3C `traceparent` Header Extraction:** `TraceContextMiddleware` in `argus/api/middleware.py` parses standard W3C `traceparent` (`00-{trace_id}-{span_id}-{flags}`) headers and stores `trace_id` and `span_id` in Python `contextvars`.
- **Request ID Tracking:** If no `X-Request-ID` is provided, a fresh UUID is generated and echoed on all HTTP responses.
- **Structured JSON Logging:** `argus/core/logging.py` formats logs as JSON containing `timestamp`, `level`, `trace_id`, `span_id`, and `request_id`.
- **Secret Redaction:** `SecretMaskingFormatter` sanitizes API keys (`sk-...`, Bearer tokens) from application logs.

### 7.2 What Does NOT Exist Today (Correction of Phase 1 Misconceptions)
- **OpenTelemetry SDK:** No `opentelemetry-sdk` or `opentelemetry-instrumentation-fastapi` package is currently initialized.
- **OTLP Exporters:** No telemetry is being transmitted over gRPC/HTTP to an external collector.
- **OpenTelemetry Collector / Langfuse:** Neither an OTel Collector nor a Langfuse instance has been deployed or connected yet.
- **Distributed Agent Tracing:** Agent execution spans across Temporal activities are planned for Phase 2.

---

## 8. Test Results Summary

```
============================= test session starts ==============================
rootdir: /home/ayush/Argus, configfile: pyproject.toml
collected 22 items

tests/test_api_health.py::test_liveness PASSED                           [  4%]
tests/test_api_health.py::test_readiness_healthy PASSED                  [  9%]
tests/test_api_health.py::test_request_id_propagation PASSED             [ 13%]
tests/test_api_health.py::test_standardized_error_format PASSED          [ 18%]
tests/test_auth_rbac.py::test_auth_missing_token_fails_closed PASSED     [ 22%]
tests/test_auth_rbac.py::test_auth_invalid_signature_rejected PASSED     [ 27%]
tests/test_auth_rbac.py::test_auth_expired_token_rejected PASSED         [ 31%]
tests/test_auth_rbac.py::test_auth_incorrect_issuer_rejected PASSED      [ 36%]
tests/test_auth_rbac.py::test_auth_incorrect_audience_rejected PASSED    [ 40%]
tests/test_auth_rbac.py::test_auth_unsupported_none_algorithm_rejected PASSED [ 45%]
tests/test_auth_rbac.py::test_auth_missing_tenant_claim_rejected PASSED  [ 50%]
tests/test_auth_rbac.py::test_auth_malformed_uuid_in_claims_rejected PASSED [ 54%]
tests/test_auth_rbac.py::test_auth_valid_dev_token_success PASSED        [ 59%]
tests/test_auth_rbac.py::test_rbac_enforcement PASSED                    [ 63%]
tests/test_auth_rbac.py::test_dev_tokens_disallowed_in_production PASSED [ 68%]
tests/test_tenant_isolation.py::test_every_tenant_table_has_rls_and_force_rls PASSED [ 72%]
tests/test_tenant_isolation.py::test_runtime_role_properties PASSED      [ 77%]
tests/test_tenant_isolation.py::test_missing_tenant_context_fails_closed PASSED [ 81%]
tests/test_tenant_isolation.py::test_crud_isolation_between_two_organizations PASSED [ 86%]
tests/test_tenant_isolation.py::test_tenant_context_not_leaking_through_pooled_connections PASSED [ 90%]
tests/test_tenant_isolation.py::test_transaction_rollback_clears_tenant_context PASSED [ 95%]
tests/test_tenant_isolation.py::test_cross_tenant_composite_foreign_key_rejection PASSED [100%]

============================== 22 passed in 1.51s ==============================
```

### 8.1 Categorized Status Breakdown

| Category | Total | Passed | Failed | Blocked by Environment | Not Tested / Staged |
|:---|:---:|:---:|:---:|:---:|:---:|
| **API Health & Middleware** | 4 | 4 | 0 | 0 | 0 |
| **Authentication & RBAC** | 11 | 11 | 0 | 0 | 0 |
| **PostgreSQL RLS & Multitenancy** | 7 | 7 | 0 | 0 | 0 |
| **PostgreSQL Native pgvector** | 1 | 0 | 0 | 1 (`postgresql-16-pgvector` host pkg) | 0 |
| **Temporal Workflow Dispatch** | 0 | 0 | 0 | 0 | Staged for Phase 2 |
| **LiteLLM Gateway Virtual Keys** | 0 | 0 | 0 | 0 | Staged for Phase 2 |
| **TOTAL** | **23** | **22** | **0** | **1** | **0** |

---

## 9. Go / No-Go Recommendation for Phase 2

### Recommendation: **CONDITIONAL GO**

#### Rationale:
1. **The foundational infrastructure is completely solid.** All 22 automated tests pass against live PostgreSQL 16 and Redis 7 daemons.
2. **Security is strictly enforced.** The runtime role cannot bypass RLS, all tenant tables force RLS, missing tenant contexts fail closed, pooled connections cannot leak context, and cross-tenant foreign key injections are rejected at the database engine level.
3. **No deceptive fallbacks exist.** The fake vector domain has been completely eradicated. The system refuses to pretend it has vector search capabilities until `pgvector` is installed.

#### Conditions for Phase 2:
1. **Pre-RAG Vector Prerequisite:** When beginning the Vector Retrieval / RAG milestones in Phase 2/3, the host environment must have `postgresql-16-pgvector` installed via `sudo apt-get install -y postgresql-16-pgvector`, followed by running `alembic upgrade head`.
2. **Temporal & LiteLLM Integration:** Temporal workflow orchestration and LiteLLM virtual identity key management must be implemented without mock data, following the deterministic patterns established in the Phase 0 blueprint.
