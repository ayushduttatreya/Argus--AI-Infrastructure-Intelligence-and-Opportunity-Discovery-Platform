-- ==============================================================================
-- ARGUS Database Schema v2 (Hardened & Tenancy-Enforced)
-- Target Engine: PostgreSQL 16+ with pgvector 0.8.0+
-- Design Standard:
--   - Strict multi-tenant isolation via composite tenant-aware foreign keys.
--   - Row-Level Security (RLS) on all tenant-owned tables with FORCE ROW LEVEL SECURITY.
--   - Non-superuser, NOBYPASSRLS application role compatibility (separate migration owner).
--   - Full evidence provenance, immutable document versioning, and verbatim offsets.
--   - Zero mock defaults (no hardcoded opportunity confidence scores).
--   - Deterministic Level 1 execution auditing (prompts, models, tools, events).
--   - Transactional outbox for reliable Temporal workflow dispatch.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extensions
-- ------------------------------------------------------------------------------
-- Note: gen_random_uuid() is built into PostgreSQL 13+. uuid-ossp is omitted.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram fuzzy matching for entity resolution
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector 0.8.0+ for HNSW, Cosine distance and iterative scans

-- ------------------------------------------------------------------------------
-- 2. Application Role & Security Context Documentation
-- ------------------------------------------------------------------------------
-- The production application MUST connect with a non-owner, non-superuser role
-- that has NOBYPASSRLS.
-- Example deployment initialization:
--   CREATE ROLE argus_migrator LOGIN PASSWORD 'secure_migrator_pass';
--   CREATE ROLE argus_app LOGIN PASSWORD 'secure_app_pass' NOBYPASSRLS;
--   GRANT CONNECT ON DATABASE argus TO argus_app;
--   GRANT USAGE ON SCHEMA public TO argus_app;
--
-- Session Tenant Context:
-- Application connections must set tenant context within transactions:
--   SET LOCAL app.current_org_id = '00000000-0000-0000-0000-000000000000';
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 3. Identity, Organization Membership & OIDC Mapping
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oidc_issuer VARCHAR(255) NOT NULL,
    oidc_subject VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_oidc UNIQUE (oidc_issuer, oidc_subject)
);

CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'researcher', 'viewer', 'service')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_memberships UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships(user_id);

-- ------------------------------------------------------------------------------
-- 4. Research Missions & Temporal Workflow Coordination
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_fingerprint VARCHAR(64) NOT NULL, -- SHA-256 hash of payload
    target_topic VARCHAR(255) NOT NULL,
    target_companies JSONB DEFAULT '[]'::jsonb,
    depth VARCHAR(50) NOT NULL DEFAULT 'standard' CHECK (depth IN ('shallow', 'standard', 'exhaustive')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'running', 'completed', 'partial_failure', 'failed', 'cancelled')),
    temporal_workflow_id VARCHAR(255),
    temporal_run_id VARCHAR(255),
    time_window_start TIMESTAMPTZ,
    time_window_end TIMESTAMPTZ,
    max_cost_usd NUMERIC(10, 4),
    max_duration_seconds INT,
    coverage_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_missions_org_idempotency UNIQUE (org_id, idempotency_key),
    CONSTRAINT uq_missions_org_id UNIQUE (org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_missions_org_status ON research_missions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_missions_temporal_wf ON research_missions(temporal_workflow_id);

-- Persistent Event Timeline (Drives Server-Sent Events with Monotonic IDs)
CREATE TABLE IF NOT EXISTS mission_events (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- e.g. 'agent.status_changed', 'evidence.indexed', 'mission.progress'
    agent_name VARCHAR(100),
    status VARCHAR(50) CHECK (status IS NULL OR status IN ('pending', 'running', 'completed', 'partial', 'failed', 'skipped')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mission_events_mission FOREIGN KEY (org_id, mission_id) 
        REFERENCES research_missions(org_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mission_events_stream ON mission_events(org_id, mission_id, id);

-- Transactional Outbox for Reliable Temporal Workflow Dispatch
CREATE TABLE IF NOT EXISTS workflow_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    workflow_type VARCHAR(100) NOT NULL DEFAULT 'ResearchMissionWorkflow',
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'failed')),
    retry_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMPTZ,
    CONSTRAINT fk_outbox_mission FOREIGN KEY (org_id, mission_id) 
        REFERENCES research_missions(org_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outbox_dispatch ON workflow_outbox(status, created_at) WHERE status = 'pending';

-- ------------------------------------------------------------------------------
-- 5. Agent Definitions, Prompts & Execution Auditing (Level 1 Observability)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_definitions (
    id VARCHAR(100) PRIMARY KEY, -- 'company_scanner', 'research_scanner', etc.
    display_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_model_profile VARCHAR(100) NOT NULL,
    tool_allowlist JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_iterations INT NOT NULL DEFAULT 5,
    timeout_seconds INT NOT NULL DEFAULT 120,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_definitions(id),
    version_tag VARCHAR(50) NOT NULL, -- e.g. 'v1.0.0'
    system_template TEXT NOT NULL,
    input_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    sha256_hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_prompt_agent_version UNIQUE (agent_id, version_tag)
);

CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_definitions(id),
    attempt_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'running', 'completed', 'partial', 'failed', 'skipped')),
    model_id VARCHAR(100),
    prompt_version_id UUID REFERENCES prompt_versions(id),
    tokens_consumed INT NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    evidence_count INT NOT NULL DEFAULT 0,
    error_code VARCHAR(100),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    CONSTRAINT fk_agent_exec_mission FOREIGN KEY (org_id, mission_id) 
        REFERENCES research_missions(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_agent_exec_org_id UNIQUE (org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_agent_exec_mission ON agent_executions(org_id, mission_id, agent_id);

CREATE TABLE IF NOT EXISTS model_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    agent_execution_id UUID NOT NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id),
    provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    latency_ms INT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'rate_limited', 'timeout', 'error')),
    request_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_model_calls_exec FOREIGN KEY (org_id, agent_execution_id) 
        REFERENCES agent_executions(org_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_model_calls_exec ON model_calls(org_id, agent_execution_id);

CREATE TABLE IF NOT EXISTS tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    agent_execution_id UUID NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    tool_version VARCHAR(50) NOT NULL,
    input_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_summary JSONB DEFAULT '{}'::jsonb,
    latency_ms INT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'blocked_ssrf')),
    retry_attempt INT NOT NULL DEFAULT 0,
    error_message TEXT,
    evidence_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tool_calls_exec FOREIGN KEY (org_id, agent_execution_id) 
        REFERENCES agent_executions(org_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_exec ON tool_calls(org_id, agent_execution_id);

-- ------------------------------------------------------------------------------
-- 6. Source Documents, Versions & Evidence Spans (Provenance & Lineage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    canonical_url TEXT NOT NULL,
    source_name VARCHAR(100) NOT NULL 
        CHECK (source_name IN ('github', 'producthunt', 'arxiv', 'greenhouse', 'lever', 'ashby', 'hackernews', 'reddit', 'web_announcement', 'sec_edgar', 'documentation')),
    first_discovered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_doc_org_url UNIQUE (org_id, canonical_url),
    CONSTRAINT uq_source_doc_org_id UNIQUE (org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_source_docs_source ON source_documents(org_id, source_name);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_document_id UUID NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 of raw document body
    storage_path TEXT NOT NULL,         -- MinIO/S3 object key (Claim-Check pattern)
    mime_type VARCHAR(100) NOT NULL DEFAULT 'text/plain',
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    byte_size INT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT fk_doc_version_source FOREIGN KEY (org_id, source_document_id) 
        REFERENCES source_documents(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_doc_version_hash UNIQUE (org_id, content_hash),
    CONSTRAINT uq_doc_version_number UNIQUE (org_id, source_document_id, version_number),
    CONSTRAINT uq_doc_version_org_id UNIQUE (org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_retrieved ON document_versions(org_id, retrieved_at);

CREATE TABLE IF NOT EXISTS evidence_spans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_version_id UUID NOT NULL,
    mission_id UUID REFERENCES research_missions(id) ON DELETE SET NULL,
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_definitions(id),
    chunk_index INT NOT NULL,
    section_name VARCHAR(100),
    content_text TEXT NOT NULL,
    char_start_offset INT NOT NULL DEFAULT 0,
    char_end_offset INT NOT NULL,
    token_count INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evidence_doc_version FOREIGN KEY (org_id, document_version_id) 
        REFERENCES document_versions(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_evidence_span_org_id UNIQUE (org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_mission ON evidence_spans(org_id, mission_id);
-- Lexical GIN Index for Full-Text Search
CREATE INDEX IF NOT EXISTS idx_evidence_fts ON evidence_spans USING gin (to_tsvector('english', content_text));

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
-- Note: In pgvector 0.8.0+, iterative index scans can be enabled via:
--   SET hnsw.iterative_scan = 'relaxed_order'; (or 'strict_order')
CREATE INDEX IF NOT EXISTS idx_evidence_hnsw_cosine 
    ON evidence_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ------------------------------------------------------------------------------
-- 7. Normalized Knowledge Graph (Cross-Tenant Edge Enforced)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    canonical_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) GENERATED ALWAYS AS (lower(trim(canonical_name))) STORED,
    entity_type VARCHAR(100) NOT NULL 
        CHECK (entity_type IN ('company', 'product', 'technology', 'organization', 'person')),
    description TEXT,
    website_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_entities_org_normalized UNIQUE (org_id, normalized_name, entity_type),
    CONSTRAINT uq_entities_org_id UNIQUE (org_id, id)
);

CREATE TABLE IF NOT EXISTS entity_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    alias_name VARCHAR(255) NOT NULL,
    normalized_alias VARCHAR(255) GENERATED ALWAYS AS (lower(trim(alias_name))) STORED,
    source VARCHAR(100),
    CONSTRAINT fk_aliases_entity FOREIGN KEY (org_id, entity_id) 
        REFERENCES entities(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_aliases_org_name UNIQUE (org_id, normalized_alias)
);

CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_entity_id UUID NOT NULL,
    target_entity_id UUID NOT NULL,
    relation_type VARCHAR(100) NOT NULL 
        CHECK (relation_type IN ('competes_with', 'built_with', 'invested_in', 'forked_from', 'offers', 'integrates_with')),
    weight NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    evidence_span_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rel_source FOREIGN KEY (org_id, source_entity_id) 
        REFERENCES entities(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_rel_target FOREIGN KEY (org_id, target_entity_id) 
        REFERENCES entities(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_rel_evidence FOREIGN KEY (org_id, evidence_span_id) 
        REFERENCES evidence_spans(org_id, id) ON DELETE SET NULL,
    CONSTRAINT uq_rel_edge UNIQUE (org_id, source_entity_id, target_entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(org_id, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(org_id, target_entity_id);

-- ------------------------------------------------------------------------------
-- 8. Claims & Verifiable Evidence Citations (Exact Provenance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_definitions(id),
    statement TEXT NOT NULL,
    confidence_score NUMERIC(4, 3) 
        CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0)),
    claim_type VARCHAR(50) NOT NULL DEFAULT 'factual' 
        CHECK (claim_type IN ('factual', 'architectural', 'capability', 'limitation', 'market_signal')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_claims_mission FOREIGN KEY (org_id, mission_id) 
        REFERENCES research_missions(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_claims_org_id UNIQUE (org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_claims_mission ON claims(org_id, mission_id);

CREATE TABLE IF NOT EXISTS claim_evidence (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL,
    evidence_id UUID NOT NULL,
    quote_text TEXT NOT NULL,
    start_offset INT,
    end_offset INT,
    support_type VARCHAR(20) NOT NULL 
        CHECK (support_type IN ('supports', 'refutes', 'contextualizes')),
    PRIMARY KEY (org_id, claim_id, evidence_id),
    CONSTRAINT fk_claim_evidence_claim FOREIGN KEY (org_id, claim_id) 
        REFERENCES claims(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_evidence_span FOREIGN KEY (org_id, evidence_id) 
        REFERENCES evidence_spans(org_id, id) ON DELETE CASCADE
);

-- ------------------------------------------------------------------------------
-- 9. Opportunity Intelligence & Scored Hypotheses
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    gap_analysis TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_opportunities_mission FOREIGN KEY (org_id, mission_id) 
        REFERENCES research_missions(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_opportunities_org_id UNIQUE (org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_opportunities_mission ON opportunities(org_id, mission_id);

CREATE TABLE IF NOT EXISTS opportunity_claims (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL,
    claim_id UUID NOT NULL,
    relationship VARCHAR(50) NOT NULL DEFAULT 'validates' 
        CHECK (relationship IN ('validates', 'contradicts', 'contextualizes')),
    PRIMARY KEY (org_id, opportunity_id, claim_id),
    CONSTRAINT fk_opp_claims_opp FOREIGN KEY (org_id, opportunity_id) 
        REFERENCES opportunities(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_opp_claims_claim FOREIGN KEY (org_id, claim_id) 
        REFERENCES claims(org_id, id) ON DELETE CASCADE
);

-- Distinct Opportunity Scoring Component (Zero Default Values)
CREATE TABLE IF NOT EXISTS opportunity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    opportunity_id UUID NOT NULL,
    scoring_algorithm_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    evidence_confidence_score NUMERIC(4, 3) NOT NULL 
        CHECK (evidence_confidence_score >= 0.0 AND evidence_confidence_score <= 1.0),
    market_impact_score NUMERIC(4, 3) NOT NULL 
        CHECK (market_impact_score >= 0.0 AND market_impact_score <= 1.0),
    technical_feasibility_score NUMERIC(4, 3) NOT NULL 
        CHECK (technical_feasibility_score >= 0.0 AND technical_feasibility_score <= 1.0),
    overall_priority_score NUMERIC(4, 3) NOT NULL 
        CHECK (overall_priority_score >= 0.0 AND overall_priority_score <= 1.0),
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_opp_scores_opp FOREIGN KEY (org_id, opportunity_id) 
        REFERENCES opportunities(org_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_opp_scores_priority ON opportunity_scores(org_id, overall_priority_score DESC);

-- ------------------------------------------------------------------------------
-- 10. Evaluation Framework (Level 2 Offline & Regression Auditing)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES research_missions(id) ON DELETE SET NULL,
    benchmark_suite VARCHAR(100) NOT NULL,
    evaluator_name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL 
        CHECK (target_type IN ('tool_call', 'model_call', 'agent_execution', 'rag_retrieval', 'claim')),
    target_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_score NUMERIC(5, 4) NOT NULL 
        CHECK (metric_score >= 0.0 AND metric_score <= 1.0),
    justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eval_results_run ON evaluation_results(org_id, evaluation_run_id);

-- ------------------------------------------------------------------------------
-- 11. Final Synthesized Reports
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intelligence_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL,
    executive_summary TEXT NOT NULL,
    full_report_markdown TEXT NOT NULL,
    coverage_summary JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_mission FOREIGN KEY (org_id, mission_id) 
        REFERENCES research_missions(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_reports_mission UNIQUE (org_id, mission_id)
);

-- ------------------------------------------------------------------------------
-- 12. Row-Level Security (RLS) Policy Declarations
-- ------------------------------------------------------------------------------
-- Enable and FORCE RLS across all tenant-owned tables
ALTER TABLE research_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_missions FORCE ROW LEVEL SECURITY;

ALTER TABLE mission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_events FORCE ROW LEVEL SECURITY;

ALTER TABLE workflow_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_outbox FORCE ROW LEVEL SECURITY;

ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions FORCE ROW LEVEL SECURITY;

ALTER TABLE model_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_calls FORCE ROW LEVEL SECURITY;

ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls FORCE ROW LEVEL SECURITY;

ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE evidence_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_spans FORCE ROW LEVEL SECURITY;

ALTER TABLE evidence_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_embeddings FORCE ROW LEVEL SECURITY;

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities FORCE ROW LEVEL SECURITY;

ALTER TABLE entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_aliases FORCE ROW LEVEL SECURITY;

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships FORCE ROW LEVEL SECURITY;

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims FORCE ROW LEVEL SECURITY;

ALTER TABLE claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_evidence FORCE ROW LEVEL SECURITY;

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities FORCE ROW LEVEL SECURITY;

ALTER TABLE opportunity_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_claims FORCE ROW LEVEL SECURITY;

ALTER TABLE opportunity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_scores FORCE ROW LEVEL SECURITY;

ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs FORCE ROW LEVEL SECURITY;

ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results FORCE ROW LEVEL SECURITY;

ALTER TABLE intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_reports FORCE ROW LEVEL SECURITY;

-- Tenant Isolation Policies using session setting 'app.current_org_id'
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'research_missions', 'mission_events',
        'agent_executions', 'model_calls', 'tool_calls',
        'source_documents', 'document_versions', 'evidence_spans',
        'evidence_embeddings', 'entities', 'entity_aliases',
        'relationships', 'claims', 'claim_evidence',
        'opportunities', 'opportunity_claims', 'opportunity_scores',
        'evaluation_runs', 'evaluation_results', 'intelligence_reports'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS tenant_isolation_policy ON %I;
            CREATE POLICY tenant_isolation_policy ON %I
                FOR ALL
                USING (org_id = NULLIF(current_setting(''app.current_org_id'', true), '''')::uuid);
        ', tbl, tbl);
    END LOOP;
END $$;

-- Dedicated dispatcher and application tenant isolation policies on workflow_outbox
-- ------------------------------------------------------------------------------
-- 10. Role Privileges & Outbox Dispatcher Security Policies
-- ------------------------------------------------------------------------------
-- argus_dispatcher has strictly column-level UPDATE privileges on workflow_outbox:
-- GRANT SELECT ON workflow_outbox TO argus_dispatcher;
-- GRANT UPDATE (status, retry_count, last_attempt_at, error_message, dispatched_at) ON workflow_outbox TO argus_dispatcher;
-- GRANT SELECT (id, org_id) ON research_missions TO argus_dispatcher;
-- GRANT UPDATE (temporal_workflow_id, temporal_run_id, updated_at) ON research_missions TO argus_dispatcher;

DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_outbox;
CREATE POLICY tenant_isolation_policy ON workflow_outbox
    FOR ALL
    TO argus_app, postgres
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

DROP POLICY IF EXISTS dispatcher_outbox_policy ON workflow_outbox;
CREATE POLICY dispatcher_outbox_policy ON workflow_outbox
    FOR ALL
    TO argus_dispatcher
    USING (true)
    WITH CHECK (status IN ('pending', 'dispatched', 'failed'));

-- Dispatcher mission correlation update policy (scoped to column-level privileges)
DROP POLICY IF EXISTS dispatcher_mission_select_policy ON research_missions;
CREATE POLICY dispatcher_mission_select_policy ON research_missions
    FOR SELECT
    TO argus_dispatcher
    USING (true);

DROP POLICY IF EXISTS dispatcher_mission_update_policy ON research_missions;
CREATE POLICY dispatcher_mission_update_policy ON research_missions
    FOR UPDATE
    TO argus_dispatcher
    USING (true)
    WITH CHECK (true);
