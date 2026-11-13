# ARGUS Database Architecture & Setup Guide

This document describes the PostgreSQL 16+ database architecture, role separation, Row-Level Security (RLS) enforcement, composite foreign key design, and connection pool budgeting.

---

## 1. Database Roles & Separation of Privilege

To prevent table owners from accidentally bypassing Row-Level Security, ARGUS separates the migration owner from the runtime application:

| Role Name | Privileges | Bypass RLS? | Purpose |
|---|---|---|---|
| `argus_migrator` | `LOGIN`, `SUPERUSER` or `ALL ON DATABASE` | Yes (Owns tables) | Runs Alembic schema migrations and DDL statements. |
| `argus_app` | `LOGIN`, `NOBYPASSRLS`, `CONNECT`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` | **NO** (Strictly enforced) | Used by FastAPI backend and worker processes for runtime queries. |

### Role Creation Commands
```sql
CREATE ROLE argus_migrator LOGIN PASSWORD 'secure_migrator_pass';
CREATE ROLE argus_app LOGIN PASSWORD 'secure_app_pass' NOBYPASSRLS;

GRANT ALL ON DATABASE argus TO argus_migrator;
GRANT CONNECT ON DATABASE argus TO argus_app;
```

---

## 2. Row-Level Security (RLS) Mechanics

Every tenant-owned table in `schema-v2.sql` has both `ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` enabled:

```sql
ALTER TABLE research_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_missions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON research_missions
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
```

### Session Tenant Context
Runtime database connections must initialize the transaction-local tenant context prior to executing any tenant queries:

```python
await session.execute(
    text("SELECT set_config('app.current_org_id', :org_id, true)"),
    {"org_id": str(tenant_uuid)}
)
```

- When `app.current_org_id` is unset or empty, the policy evaluates to `org_id = NULL`, which **fails closed** (returns 0 rows).
- Setting `is_local = true` ensures that when the transaction completes (commit or rollback), the tenant setting is automatically discarded, preventing connection pool pollution.

---

## 3. Structural Tenancy via Composite Foreign Keys

Single-column foreign keys can permit cross-tenant entity relationships. ARGUS eliminates this attack vector structurally by using composite foreign keys:

```sql
-- Entity unique constraint includes org_id:
CONSTRAINT uq_entities_org_id UNIQUE (org_id, id);

-- Relationship foreign keys enforce identical org_id:
CONSTRAINT fk_rel_source FOREIGN KEY (org_id, source_entity_id) 
    REFERENCES entities(org_id, id) ON DELETE CASCADE,
CONSTRAINT fk_rel_target FOREIGN KEY (org_id, target_entity_id) 
    REFERENCES entities(org_id, id) ON DELETE CASCADE
```

Any attempt to link an entity belonging to Organization A with an entity belonging to Organization B is rejected by PostgreSQL's foreign key constraint engine.

---

## 4. Connection Pool Budgeting

To prevent connection exhaustion when 8 concurrent agents and API requests execute, connection pools are strictly budgeted:

| Component | Base Pool | Max Overflow | Max Concurrent Connections |
|---|---|---|---|
| **FastAPI Backend** | 10 | 5 | 15 |
| **Temporal Worker Pool** | 15 | 5 | 20 |
| **LiteLLM Proxy State** | 5 | 2 | 7 |
| **Admin & Migration** | 2 | 1 | 3 |
| **Total Allocation** | **32** | **13** | **45** (Within PostgreSQL limit of 50–100) |


---

## 5. Native pgvector Prerequisite & Gated Migrations

ARGUS uses the native PostgreSQL `pgvector` extension for storing and searching vector embeddings (`vector(1536)` with HNSW indexing).

### Staged Migration Model
To prevent silent type degradation or schema drift:
1. `migrations/versions/a71329da290d_baseline_schema_v2.py`: Migrates all 25 core relational tables without vector dependencies.
2. `migrations/versions/b82438fa431e_evidence_embeddings_pgvector.py`: Gated migration. Queries `pg_available_extensions` for `vector`.
   - If missing: Raises an explicit `RuntimeError` and transactionally aborts.
   - If present: Executes `CREATE EXTENSION IF NOT EXISTS "vector"`, creates `evidence_embeddings` table, and builds the HNSW cosine index `idx_evidence_hnsw_cosine`.

### Host Extension Installation
```bash
sudo apt-get update && sudo apt-get install -y postgresql-16-pgvector
alembic upgrade head
```
