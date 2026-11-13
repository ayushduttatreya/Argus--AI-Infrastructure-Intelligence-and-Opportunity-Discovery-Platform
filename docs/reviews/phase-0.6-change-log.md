# Phase 0.6 Contract Hardening & Specification Change Log

This document provides a formal audit trail of all corrections applied during Phase 0.6 to resolve the critical findings identified in Phase 0.5.

---

## 1. Summary of Changes

| Domain | Area Changed | Key Corrections Applied | Requirement |
|---|---|---|---|
| **Database** | Multi-Tenancy & Integrity | Added `org_id` to all tenant-owned tables; composite FKs `(org_id, id)` prevent cross-tenant edges; enabled RLS with NOBYPASSRLS app role. | ARG-11 |
| **Database** | Level 1 Auditing | Added `agent_definitions`, `prompt_versions`, `agent_executions`, `model_calls`, `tool_calls`, `mission_events`, and `workflow_outbox`. | ARG-02, ARG-05, ARG-13 |
| **Database** | Document Lineage | Introduced `source_documents` (canonical URL) and immutable `document_versions` (content hash, MinIO path). | ARG-01, ARG-04 |
| **Database** | Exact Provenance | Added `quote_text`, `start_offset`, `end_offset`, and `support_type` (`supports`, `refutes`, `contextualizes`) to `claim_evidence`. | ARG-04 |
| **Database** | Vector Storage | Isolated embeddings to `evidence_embeddings` with explicit `embedding_model`, `version`, and dimensions; documented pgvector 0.8.0+ iterative scans. | ARG-08 |
| **Database** | Opportunity Model | Removed hardcoded default 0.850; added `opportunity_scores` separating evidence confidence from market priority. | ARG-03 |
| **Database** | Identity Mapping | Mapped users via `oidc_issuer` and `oidc_subject` rather than transient email; separated `organization_memberships`. | ARG-10 |
| **API** | Idempotency & Replay | Made `Idempotency-Key` mandatory on `POST /research-missions`, scoped by org; added fingerprint matching and 409 conflict detection. | ARG-15 |
| **API** | Cancellation & Lifecycle | Added `POST /research-missions/{mission_id}/cancel` with 202 Accepted. | ARG-05, ARG-15 |
| **API** | SSE Event Contract | Defined structured SSE payloads (`agent.status_changed`, `heartbeat`), monotonic integer event IDs, and `Last-Event-ID` resumption. | ARG-13, ARG-15 |
| **API** | Error Observability | Added mandatory `request_id` and optional `trace_id` to standard error responses. | ARG-13 |
| **API** | Status Canonicalization | Unified canonical lowercase statuses across OpenAPI, Pydantic, and SQL (`pending`, `running`, `completed`, `partial_failure`, `failed`, `cancelled`). | ARG-02, ARG-15 |
| **Temporal** | Claim-Check Pattern | Documented <20 KB activity return threshold; raw documents stored in MinIO; transactional outbox pattern for reliable dispatch. | ARG-05 |
| **LiteLLM** | Budget Governance | Specified PostgreSQL-backed persistence for virtual key spend tracking; capped proxy retries at 1 to prevent multiplication. | ARG-06, ARG-07 |
| **Security** | SSRF & Injection | Specified connector egress validation (DNS pre-resolution, private IP blocking) and XML delimiter framing against prompt injection. | ARG-12 |

---

## 2. Detailed Change Justifications & Migration Implications

### Change 1: Structural Tenancy & Composite Foreign Keys
- **Why Needed**: The previous schema placed `org_id` on `entities` but single-column foreign keys on `relationships`. An organization could link its entity to a competitor entity belonging to another organization, causing cross-tenant data leakage.
- **Requirement Satisfied**: **ARG-11** (Authorization, RBAC & Structural RLS).
- **Migration Implication**: Any future join queries and foreign key declarations must reference composite `(org_id, id)`.
- **Test Acceptance Criteria**:
  ```sql
  -- Attempting to insert a relationship with mismatched org_ids must be rejected:
  INSERT INTO relationships (org_id, source_entity_id, target_entity_id, relation_type)
  VALUES ('org-1', 'entity-of-org-1', 'entity-of-org-2', 'competes_with');
  -- MUST FAIL with foreign key violation.
  ```

### Change 2: Removal of Opportunity Confidence Default (0.850)
- **Why Needed**: Violates the zero-dummy-data core principle (ARG-03). A generated opportunity hypothesis must have an empirically computed evidence score or remain null.
- **Requirement Satisfied**: **ARG-03** (Zero Dummy Data).
- **Migration Implication**: The column was extracted into `opportunity_scores` with multi-dimensional metrics (`evidence_confidence_score`, `market_impact_score`, `technical_feasibility_score`, `overall_priority_score`).
- **Test Acceptance Criteria**: Inserting an opportunity without an explicit score succeeds; no fabricated score is generated.

### Change 3: Document Lineage & Claim-Check Storage
- **Why Needed**: A static `UNIQUE (org_id, content_hash)` on raw documents orphaned document updates when a company's website updated. Furthermore, returning raw documents through Temporal history threatened Temporal's 2MB history limits.
- **Requirement Satisfied**: **ARG-01** (Real Source Ingestion), **ARG-04** (Evidence Provenance), **ARG-05** (Durable Execution).
- **Migration Implication**: Activities write raw payloads to MinIO and insert into `document_versions`. Temporal activities only exchange UUIDs.
- **Test Acceptance Criteria**: Activity return payloads serialized as JSON measure <20 KB.

### Change 4: Verbatim Citation Offsets
- **Why Needed**: A researcher reviewing an intelligence claim must see the exact sentence or passage supporting it rather than reading a 1,000-token chunk.
- **Requirement Satisfied**: **ARG-04** (Verifiable Evidence Provenance).
- **Migration Implication**: `claim_evidence` stores `quote_text`, `start_offset`, `end_offset`, and `support_type`.
- **Test Acceptance Criteria**: Verifying `evidence_spans.content_text[start_offset:end_offset] == quote_text`.

### Change 5: Mandatory Idempotency-Key & Scoped Deduplication
- **Why Needed**: Network retries during mission creation could spawn duplicate Temporal workflows and consume double LLM budgets.
- **Requirement Satisfied**: **ARG-15** (Versioned API Contracts & Replay).
- **Migration Implication**: The API requires `Idempotency-Key` header and stores a request fingerprint.
- **Test Acceptance Criteria**:
  - Re-submitting identical payload with same key returns original 202 response.
  - Re-submitting differing payload with same key returns 409 Conflict.
