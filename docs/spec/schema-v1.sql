-- ==============================================================================
-- ARGUS Database Schema v1
-- PostgreSQL 16+ with pgvector extension
-- Single source of record: Relational, Evidence Graph, Vector Storage
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Identity, Organizations & RBAC
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'researcher', -- 'admin', 'researcher', 'viewer', 'service'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Research Missions & Temporal Workflow Execution
CREATE TABLE IF NOT EXISTS research_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    idempotency_key UUID UNIQUE,
    target_topic VARCHAR(255) NOT NULL,
    target_companies JSONB DEFAULT '[]'::jsonb,
    depth VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'shallow', 'standard', 'exhaustive'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'partial_failure', 'failed', 'cancelled'
    temporal_workflow_id VARCHAR(255) UNIQUE,
    temporal_run_id VARCHAR(255),
    coverage_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_missions_org_status ON research_missions(org_id, status);

CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES research_missions(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'partial', 'failed'
    model_id VARCHAR(100),
    prompt_version VARCHAR(50),
    tokens_consumed INT DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    evidence_count INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_exec_mission ON agent_executions(mission_id, agent_name);

-- 4. Ingested Documents & Raw Storage References
CREATE TABLE IF NOT EXISTS raw_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_name VARCHAR(100) NOT NULL, -- 'github', 'producthunt', 'arxiv', 'greenhouse', etc.
    source_url TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256
    storage_path TEXT, -- MinIO / S3 object key
    mime_type VARCHAR(100) DEFAULT 'text/plain',
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_raw_docs_hash UNIQUE (org_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_raw_docs_source ON raw_documents(source_name, retrieved_at);

-- 5. Evidence Spans & Vector Chunks (Provenance & RAG)
CREATE TABLE IF NOT EXISTS evidence_spans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_document_id UUID NOT NULL REFERENCES raw_documents(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES research_missions(id) ON DELETE SET NULL,
    agent_name VARCHAR(100) NOT NULL,
    chunk_index INT NOT NULL,
    section_name VARCHAR(100),
    content_text TEXT NOT NULL,
    embedding vector(1536), -- Dimension configurable for text-embedding-3-small or equivalent
    token_count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_document ON evidence_spans(raw_document_id);
-- HNSW Vector Index for dense semantic similarity
CREATE INDEX IF NOT EXISTS idx_evidence_embedding ON evidence_spans USING hnsw (embedding vector_cosine_ops);
-- GIN Index for full-text search lexical retrieval
CREATE INDEX IF NOT EXISTS idx_evidence_fts ON evidence_spans USING gin (to_tsvector('english', content_text));

-- 6. Entities & Relationships (Normalized Knowledge Graph)
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    canonical_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- 'company', 'product', 'technology', 'organization', 'person'
    description TEXT,
    website_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_entity_org_name UNIQUE (org_id, canonical_name, entity_type)
);

CREATE TABLE IF NOT EXISTS entity_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    source VARCHAR(100),
    CONSTRAINT uq_entity_alias UNIQUE (entity_id, alias_name)
);

CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL, -- 'competes_with', 'built_with', 'invested_in', 'forked_from', 'offers'
    weight NUMERIC(4, 2) DEFAULT 1.0,
    evidence_id UUID REFERENCES evidence_spans(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Claims & Opportunities (Synthesis & Intelligence Engine)
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES research_missions(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    statement TEXT NOT NULL,
    confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    claim_type VARCHAR(50) DEFAULT 'factual', -- 'factual', 'architectural', 'capability', 'limitation'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claim_evidence (
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence_spans(id) ON DELETE CASCADE,
    PRIMARY KEY (claim_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES research_missions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    gap_analysis TEXT NOT NULL,
    confidence_score NUMERIC(4, 3) DEFAULT 0.850,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opportunity_claims (
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    PRIMARY KEY (opportunity_id, claim_id)
);

-- 8. Final Intelligence Reports
CREATE TABLE IF NOT EXISTS intelligence_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID UNIQUE NOT NULL REFERENCES research_missions(id) ON DELETE CASCADE,
    executive_summary TEXT NOT NULL,
    full_report_markdown TEXT NOT NULL,
    coverage_summary JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
