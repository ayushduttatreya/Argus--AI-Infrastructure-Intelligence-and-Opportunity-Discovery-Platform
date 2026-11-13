# ADR 0004: PostgreSQL and pgvector for Unified Multi-Tenant Evidence Storage

## Status
Accepted (Amended in Phase 0.6)

## Context
ARGUS requires relational data integrity, immutable evidence versioning, verbatim citation offsets, and vector retrieval.
Initial schema drafts suffered from critical multi-tenant isolation vulnerabilities: child tables lacked `org_id`, allowing cross-tenant entity relationships and impeding performant Row-Level Security (RLS). Furthermore, execution audit tables (`prompt_versions`, `model_calls`, `tool_calls`) and exact claim quotation offsets were missing.

## Decision
1. **Unified Storage Engine**: PostgreSQL 16+ with the `pgvector` (0.8.0+) and `pg_trgm` extensions as the single system of record.
2. **Structural Multi-Tenancy**:
   - `org_id` is present on all tenant-owned tables.
   - Composite unique keys `UNIQUE (org_id, id)` and composite foreign keys enforce that relationships, claims, evidence links, and opportunity junctions cannot cross organizational boundaries.
3. **Row-Level Security (RLS) & Role Privileges**:
   - RLS enabled across all tenant tables using `org_id = current_setting('app.current_org_id')::uuid`.
   - Application connections run as `argus_app` with `NOBYPASSRLS` and explicit table grants, preventing policy bypass.
4. **Verbatim Evidence Provenance**:
   - `source_documents` provides stable URL identity; `document_versions` tracks immutable content hashes.
   - `claim_evidence` stores exact verbatim `quote_text`, character offsets `[start, end]`, and `support_type` (`supports`, `refutes`, `contextualizes`).
5. **Level 1 Execution Auditing**:
   - Normalized tables for `agent_definitions`, `prompt_versions`, `agent_executions`, `model_calls`, `tool_calls`, and `mission_events`.
6. **Vector Retrieval & pgvector 0.8.0+**:
   - Pinned embedding profile (`text-embedding-3-small`, 1536 dims, `evidence_embeddings` table).
   - HNSW index using cosine similarity (`vector_cosine_ops`).
   - Filtered iterative scans enabled via pgvector 0.8.0+ (`SET hnsw.iterative_scan = 'relaxed_order'` or `'strict_order'`) to prevent post-filtering candidate exhaustion.

## Consequences
- **Positive**: Cryptographic and structural tenant isolation, zero cross-tenant entity edges, full verbatim provenance, reliable vector search with iterative scan support, queryable audit trail.
- **Negative**: Foreign keys are composite `(org_id, id)`, requiring slightly more verbose SQL joins; vector index performance must be measured on real datasets before introducing partitioning.
