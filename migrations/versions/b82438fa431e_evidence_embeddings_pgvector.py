"""evidence_embeddings_pgvector

Revision ID: b82438fa431e
Revises: a71329da290d
Create Date: 2026-11-13 21:04:10.000000

"""
from typing import Sequence, Union
from alembic import op
from sqlalchemy.util.concurrency import await_only

# revision identifiers, used by Alembic.
revision: str = 'b82438fa431e'
down_revision: Union[str, None] = 'd58b1932ea40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VECTOR_SCHEMA_SQL = """
-- Extension Prerequisite
CREATE EXTENSION IF NOT EXISTS "vector";

-- Pinned Vector Embeddings (Separated for Multi-Model Versioning Support)
CREATE TABLE IF NOT EXISTS evidence_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    evidence_span_id UUID NOT NULL,
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    embedding_dimensions INT NOT NULL DEFAULT 1536,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_embeddings_span FOREIGN KEY (org_id, evidence_span_id) 
        REFERENCES evidence_spans(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_span_model_version UNIQUE (org_id, evidence_span_id, embedding_model, embedding_version)
);

-- HNSW Vector Index with Cosine Distance (pgvector 0.8.0+)
CREATE INDEX IF NOT EXISTS idx_evidence_hnsw_cosine 
    ON evidence_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Force RLS on evidence_embeddings
ALTER TABLE evidence_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_embeddings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON evidence_embeddings;
CREATE POLICY tenant_isolation_policy ON evidence_embeddings
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
"""


def upgrade() -> None:
    connection = op.get_bind()
    raw_connection = connection.connection.driver_connection

    # Strict check: Is pgvector actually installed in PostgreSQL available extensions?
    has_vector = await_only(raw_connection.fetchval(
        "SELECT 1 FROM pg_available_extensions WHERE name = 'vector';"
    ))
    if not has_vector:
        raise RuntimeError(
            "ENVIRONMENT BLOCKED: The real pgvector extension is not installed in the PostgreSQL instance.\n"
            "Host package required: postgresql-16-pgvector (pgvector 0.8.0+).\n"
            "Install command (requires host root/sudo): sudo apt-get update && sudo apt-get install -y postgresql-16-pgvector\n"
            "This migration is blocked to prevent fake type substitution or schema drift."
        )

    await_only(raw_connection.execute(VECTOR_SCHEMA_SQL))


def downgrade() -> None:
    connection = op.get_bind()
    raw_connection = connection.connection.driver_connection
    drop_sql = """
    DROP TABLE IF EXISTS evidence_embeddings CASCADE;
    DROP EXTENSION IF EXISTS "vector" CASCADE;
    """
    await_only(raw_connection.execute(drop_sql))
