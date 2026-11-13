# ARGUS Data Dictionary (v2)

This document provides the authoritative technical reference for all entities, tables, relationships, and constraints in `schema-v2.sql`.

---

## 1. Identity & Access Management

### `organizations`
Represents an enterprise tenant in ARGUS.
- `id` (UUID, PK): Primary key (`gen_random_uuid()`).
- `name` (VARCHAR(255), NOT NULL): Legal or display name of the organization.
- `slug` (VARCHAR(100), UNIQUE, NOT NULL): URL-safe organization slug.
- `created_at` / `updated_at` (TIMESTAMPTZ, NOT NULL): Audit timestamps.

### `users`
Represents individual user accounts mapped from an OIDC provider.
- `id` (UUID, PK): Internal user UUID.
- `oidc_issuer` (VARCHAR(255), NOT NULL): OIDC token issuer URL (`iss` claim).
- `oidc_subject` (VARCHAR(255), NOT NULL): Unique OIDC subject identifier (`sub` claim).
- `email` (VARCHAR(255), NOT NULL): User contact email.
- `full_name` (VARCHAR(255)): User display name.
- `created_at` / `updated_at` (TIMESTAMPTZ, NOT NULL): Audit timestamps.
- **Constraints**: `UNIQUE (oidc_issuer, oidc_subject)`.

### `organization_memberships`
Junction table mapping users to organizations with role assignments.
- `id` (UUID, PK): Membership record UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `user_id` (UUID, NOT NULL, FK -> `users.id` ON DELETE CASCADE).
- `role` (VARCHAR(50), NOT NULL): Role enum: `admin`, `researcher`, `viewer`, `service`.
- **Constraints**: `UNIQUE (org_id, user_id)`.

---

## 2. Research Missions & Coordination

### `research_missions`
Core operational unit representing an intelligence investigation.
- `id` (UUID, PK): Mission UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE): Tenant identity.
- `created_by` (UUID, FK -> `users.id` ON DELETE SET NULL): Initiating user.
- `idempotency_key` (VARCHAR(255), NOT NULL): Client-supplied idempotency key.
- `request_fingerprint` (VARCHAR(64), NOT NULL): SHA-256 hash of normalized request body.
- `target_topic` (VARCHAR(255), NOT NULL): Research investigation prompt or topic.
- `target_companies` (JSONB, NOT NULL DEFAULT '[]'): Explicit companies in scope.
- `depth` (VARCHAR(50), NOT NULL): `shallow`, `standard`, `exhaustive`.
- `status` (VARCHAR(50), NOT NULL): Canonical enum: `pending`, `running`, `completed`, `partial_failure`, `failed`, `cancelled`.
- `temporal_workflow_id` / `temporal_run_id` (VARCHAR(255)): Internal workflow coordinates.
- `time_window_start` / `time_window_end` (TIMESTAMPTZ): Historical investigation bounds.
- `max_cost_usd` (NUMERIC(10, 4)): Hard ceiling for total mission inference spend.
- `max_duration_seconds` (INT): Execution timeout before workflow cancellation.
- `coverage_summary` (JSONB): Breakdown of source coverage (attempted, succeeded, failed).
- **Constraints**: `UNIQUE (org_id, idempotency_key)`, `UNIQUE (org_id, id)`.

### `mission_events`
Persistent timeline of mission events driving real-time Server-Sent Events (SSE).
- `id` (BIGSERIAL, PK): Monotonically increasing event ID for `Last-Event-ID` resumption.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL, FK -> `research_missions(org_id, id)`).
- `event_type` (VARCHAR(100), NOT NULL): `agent.status_changed`, `evidence.indexed`, `mission.progress`, etc.
- `agent_name` (VARCHAR(100)): Name of agent triggering the event.
- `status` (VARCHAR(50)): Canonical agent status or null.
- `payload` (JSONB, NOT NULL DEFAULT '{}'): Event data payload.
- `occurred_at` (TIMESTAMPTZ, NOT NULL).

### `workflow_outbox`
Transactional outbox ensuring reliable dispatch of Temporal workflows.
- `id` (UUID, PK): Outbox record UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL, FK -> `research_missions(org_id, id)`).
- `workflow_type` (VARCHAR(100), NOT NULL DEFAULT 'ResearchMissionWorkflow').
- `payload` (JSONB, NOT NULL): Parameters needed to initialize the workflow.
- `status` (VARCHAR(50), NOT NULL DEFAULT 'pending'): `pending`, `dispatched`, `failed`.
- `retry_count` (INT, NOT NULL DEFAULT 0).
- `last_attempt_at` / `dispatched_at` (TIMESTAMPTZ).
- `error_message` (TEXT).

---

## 3. Agent Definitions & Execution Auditing (Level 1)

### `agent_definitions`
Authoritative registry of the 8 specialist agents.
- `id` (VARCHAR(100), PK): Unique agent key (`company_scanner`, `architecture_extractor`, etc.).
- `display_name` (VARCHAR(255), NOT NULL): Human-readable name.
- `description` (TEXT, NOT NULL): Operational scope.
- `capabilities` (JSONB, NOT NULL DEFAULT '[]'): Supported extraction capabilities.
- `default_model_profile` (VARCHAR(100), NOT NULL): Profile mapped to LiteLLM router.
- `tool_allowlist` (JSONB, NOT NULL DEFAULT '[]'): Explicit list of tool functions authorized.
- `max_iterations` (INT, NOT NULL DEFAULT 5).
- `timeout_seconds` (INT, NOT NULL DEFAULT 120).
- `is_active` (BOOLEAN, NOT NULL DEFAULT true).

### `prompt_versions`
Immutable versioned system and task prompt templates.
- `id` (UUID, PK): Prompt version UUID.
- `agent_id` (VARCHAR(100), NOT NULL, FK -> `agent_definitions.id`).
- `version_tag` (VARCHAR(50), NOT NULL): Semantic version (e.g. `v1.0.0`).
- `system_template` (TEXT, NOT NULL): Unrendered prompt template with parameter placeholders.
- `input_variables` (JSONB, NOT NULL DEFAULT '[]'): Required variable keys.
- `sha256_hash` (VARCHAR(64), NOT NULL): Cryptographic fingerprint of the template.
- `is_active` (BOOLEAN, NOT NULL DEFAULT true).
- **Constraints**: `UNIQUE (agent_id, version_tag)`.

### `agent_executions`
Execution lifecycle and metrics for each agent attempt in a mission.
- `id` (UUID, PK): Execution UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL, FK -> `research_missions(org_id, id)`).
- `agent_id` (VARCHAR(100), NOT NULL, FK -> `agent_definitions.id`).
- `attempt_number` (INT, NOT NULL DEFAULT 1): Retry attempt index.
- `status` (VARCHAR(50), NOT NULL): Canonical agent enum: `pending`, `running`, `completed`, `partial`, `failed`, `skipped`.
- `model_id` (VARCHAR(100)): Upstream model ID invoked.
- `prompt_version_id` (UUID, FK -> `prompt_versions.id`).
- `tokens_consumed` (INT, NOT NULL DEFAULT 0): Total input + output tokens.
- `cost_usd` (NUMERIC(10, 6), NOT NULL DEFAULT 0.000000): Actual dollar spend via LiteLLM.
- `evidence_count` (INT, NOT NULL DEFAULT 0): Spans extracted.
- `error_code` / `error_message`: Failure classification and details.
- `started_at` / `finished_at` (TIMESTAMPTZ).
- **Constraints**: `UNIQUE (org_id, id)`.

### `model_calls`
Granular record of every LLM completion request.
- `id` (UUID, PK): Model call UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL): Mission context.
- `agent_execution_id` (UUID, NOT NULL, FK -> `agent_executions(org_id, id)`).
- `prompt_version_id` (UUID, FK -> `prompt_versions.id`).
- `provider` (VARCHAR(50), NOT NULL): `openrouter`, `openai`, `anthropic`.
- `model_id` (VARCHAR(100), NOT NULL): Model string.
- `input_tokens` / `output_tokens` (INT, NOT NULL).
- `cost_usd` (NUMERIC(10, 6), NOT NULL).
- `latency_ms` (INT, NOT NULL).
- `status` (VARCHAR(50), NOT NULL): `success`, `rate_limited`, `timeout`, `error`.
- `request_hash` (VARCHAR(64)): Hash of input payload for cache matching.

### `tool_calls`
Audit trail of every external connector or tool invocation.
- `id` (UUID, PK): Tool call UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL): Mission context.
- `agent_execution_id` (UUID, NOT NULL, FK -> `agent_executions(org_id, id)`).
- `tool_name` (VARCHAR(100), NOT NULL): E.g. `github_repo_details`, `arxiv_search`.
- `tool_version` (VARCHAR(50), NOT NULL).
- `input_parameters` (JSONB, NOT NULL DEFAULT '{}'): Sanitized arguments.
- `output_summary` (JSONB, DEFAULT '{}'): Structured summary of response.
- `latency_ms` (INT, NOT NULL).
- `status` (VARCHAR(50), NOT NULL): `success`, `failed`, `timeout`, `blocked_ssrf`.
- `retry_attempt` (INT, NOT NULL DEFAULT 0).
- `error_message` (TEXT).
- `evidence_ids` (JSONB, DEFAULT '[]'): Evidence spans resulting from this call.

---

## 4. Evidence Storage & Provenance

### `source_documents`
Stable logical identity of an external URL or resource.
- `id` (UUID, PK): Source document UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `canonical_url` (TEXT, NOT NULL): Normalized web URL or API URI.
- `source_name` (VARCHAR(100), NOT NULL): `github`, `producthunt`, `arxiv`, etc.
- `first_discovered_at` / `last_checked_at` (TIMESTAMPTZ, NOT NULL).
- **Constraints**: `UNIQUE (org_id, canonical_url)`, `UNIQUE (org_id, id)`.

### `document_versions`
Immutable snapshot of a document's content at a specific point in time.
- `id` (UUID, PK): Document version UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `source_document_id` (UUID, NOT NULL, FK -> `source_documents(org_id, id)`).
- `version_number` (INT, NOT NULL DEFAULT 1): Monotonically increasing revision.
- `content_hash` (VARCHAR(64), NOT NULL): SHA-256 of raw document body.
- `storage_path` (TEXT, NOT NULL): MinIO/S3 object storage path.
- `mime_type` (VARCHAR(100), NOT NULL DEFAULT 'text/plain').
- `retrieved_at` (TIMESTAMPTZ, NOT NULL).
- `published_at` (TIMESTAMPTZ): Original publication timestamp if available.
- `byte_size` (INT, NOT NULL).
- `metadata` (JSONB, NOT NULL DEFAULT '{}').
- **Constraints**: `UNIQUE (org_id, content_hash)`, `UNIQUE (org_id, source_document_id, version_number)`, `UNIQUE (org_id, id)`.

### `evidence_spans`
Normalized, chunked textual passages extracted from a document version.
- `id` (UUID, PK): Evidence span UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `document_version_id` (UUID, NOT NULL, FK -> `document_versions(org_id, id)`).
- `mission_id` (UUID, FK -> `research_missions.id` ON DELETE SET NULL).
- `agent_id` (VARCHAR(100), NOT NULL, FK -> `agent_definitions.id`).
- `chunk_index` (INT, NOT NULL): 0-indexed position within document.
- `section_name` (VARCHAR(100)): Heading or document partition name.
- `content_text` (TEXT, NOT NULL): Verbatim textual content.
- `char_start_offset` / `char_end_offset` (INT, NOT NULL): Position within parent document.
- `token_count` (INT, NOT NULL).
- **Constraints**: `UNIQUE (org_id, id)`.

### `evidence_embeddings`
Dense semantic vectors generated for an evidence span.
- `id` (UUID, PK): Embedding record UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `evidence_span_id` (UUID, NOT NULL, FK -> `evidence_spans(org_id, id)`).
- `embedding_model` (VARCHAR(100), NOT NULL DEFAULT 'text-embedding-3-small').
- `embedding_version` (VARCHAR(50), NOT NULL DEFAULT 'v1').
- `embedding_dimensions` (INT, NOT NULL DEFAULT 1536).
- `embedding` (vector(1536), NOT NULL): pgvector embedding.
- **Constraints**: `UNIQUE (org_id, evidence_span_id, embedding_model, embedding_version)`.
- **Index**: HNSW index using `vector_cosine_ops` (`m = 16, ef_construction = 64`).

---

## 5. Normalized Knowledge Graph

### `entities`
Distinct real-world entities (companies, products, technologies, organizations, persons).
- `id` (UUID, PK): Entity UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `canonical_name` (VARCHAR(255), NOT NULL): Primary display name.
- `normalized_name` (VARCHAR(255), GENERATED STORED): `lower(trim(canonical_name))`.
- `entity_type` (VARCHAR(100), NOT NULL): `company`, `product`, `technology`, `organization`, `person`.
- `description` (TEXT): Synthesized description.
- `website_url` (TEXT): Canonical website.
- `metadata` (JSONB, NOT NULL DEFAULT '{}').
- **Constraints**: `UNIQUE (org_id, normalized_name, entity_type)`, `UNIQUE (org_id, id)`.

### `entity_aliases`
Alternate spellings, acronyms, or former names resolved to an entity.
- `id` (UUID, PK): Alias UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `entity_id` (UUID, NOT NULL, FK -> `entities(org_id, id)`).
- `alias_name` (VARCHAR(255), NOT NULL).
- `normalized_alias` (VARCHAR(255), GENERATED STORED): `lower(trim(alias_name))`.
- `source` (VARCHAR(100)): Provenance of the alias mapping.
- **Constraints**: `UNIQUE (org_id, normalized_alias)`.

### `relationships`
Typed directed edges between entities. Cross-tenant edges are prevented by composite FKs.
- `id` (UUID, PK): Relationship edge UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `source_entity_id` (UUID, NOT NULL, FK -> `entities(org_id, id)`).
- `target_entity_id` (UUID, NOT NULL, FK -> `entities(org_id, id)`).
- `relation_type` (VARCHAR(100), NOT NULL): `competes_with`, `built_with`, `invested_in`, `forked_from`, `offers`, `integrates_with`.
- `weight` (NUMERIC(4, 2), NOT NULL DEFAULT 1.0): Relationship confidence/strength.
- `evidence_span_id` (UUID, FK -> `evidence_spans(org_id, id)` ON DELETE SET NULL).
- `metadata` (JSONB, NOT NULL DEFAULT '{}').
- **Constraints**: `UNIQUE (org_id, source_entity_id, target_entity_id, relation_type)`.

---

## 6. Claims & Exact Provenance

### `claims`
Factual or architectural assertions synthesized by agents.
- `id` (UUID, PK): Claim UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL, FK -> `research_missions(org_id, id)`).
- `agent_id` (VARCHAR(100), NOT NULL, FK -> `agent_definitions.id`).
- `statement` (TEXT, NOT NULL): The factual assertion.
- `confidence_score` (NUMERIC(4, 3)): Evaluated score (0.0 to 1.0) or NULL. Never hardcoded.
- `claim_type` (VARCHAR(50), NOT NULL): `factual`, `architectural`, `capability`, `limitation`, `market_signal`.
- **Constraints**: `UNIQUE (org_id, id)`.

### `claim_evidence`
Verbatim passage citations linking a claim to supporting or refuting evidence spans.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `claim_id` (UUID, NOT NULL, FK -> `claims(org_id, id)`).
- `evidence_id` (UUID, NOT NULL, FK -> `evidence_spans(org_id, id)`).
- `quote_text` (TEXT, NOT NULL): Exact verbatim passage extracted from the span.
- `start_offset` / `end_offset` (INT): Character offsets of `quote_text` within `evidence_spans.content_text`.
- `support_type` (VARCHAR(20), NOT NULL): `supports`, `refutes`, `contextualizes`.
- **Constraints**: `PRIMARY KEY (org_id, claim_id, evidence_id)`.

---

## 7. Opportunity Hypotheses & Scoring

### `opportunities`
Synthesized market white-space opportunities generated by Agent 8 (Negative Space Engine).
- `id` (UUID, PK): Opportunity UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL, FK -> `research_missions(org_id, id)`).
- `title` (VARCHAR(255), NOT NULL): Executive opportunity title.
- `description` (TEXT, NOT NULL): Full narrative description.
- `gap_analysis` (TEXT, NOT NULL): Structural analysis of competitor blind-spots.
- **Constraints**: `UNIQUE (org_id, id)`.

### `opportunity_claims`
Junction mapping supporting or contradictory claims to an opportunity.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `opportunity_id` (UUID, NOT NULL, FK -> `opportunities(org_id, id)`).
- `claim_id` (UUID, NOT NULL, FK -> `claims(org_id, id)`).
- `relationship` (VARCHAR(50), NOT NULL DEFAULT 'validates'): `validates`, `contradicts`, `contextualizes`.
- **Constraints**: `PRIMARY KEY (org_id, opportunity_id, claim_id)`.

### `opportunity_scores`
Deterministic multi-dimensional scores for an opportunity hypothesis. Zero default values.
- `id` (UUID, PK): Score record UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `opportunity_id` (UUID, NOT NULL, FK -> `opportunities(org_id, id)`).
- `scoring_algorithm_version` (VARCHAR(50), NOT NULL DEFAULT 'v1.0.0').
- `evidence_confidence_score` (NUMERIC(4, 3), NOT NULL): Groundedness in verified evidence.
- `market_impact_score` (NUMERIC(4, 3), NOT NULL): Economic / market potential.
- `technical_feasibility_score` (NUMERIC(4, 3), NOT NULL): Implementation feasibility.
- `overall_priority_score` (NUMERIC(4, 3), NOT NULL): Weighted composite priority.
- `score_breakdown` (JSONB, NOT NULL DEFAULT '{}'): Intermediate weights and reasoning metrics.

---

## 8. Offline Evaluations & Reports

### `evaluation_runs` / `evaluation_results`
Metadata and scores for automated quality benchmarks (Ragas, tool accuracy, claim faithfulness).
- Maps evaluations to specific missions, agents, models, or tool executions.
- Records standard metrics (`context_precision`, `faithfulness`, `tool_call_accuracy`).

### `intelligence_reports`
Final synthesized deliverable of a research mission.
- `id` (UUID, PK): Report UUID.
- `org_id` (UUID, NOT NULL, FK -> `organizations.id` ON DELETE CASCADE).
- `mission_id` (UUID, NOT NULL, FK -> `research_missions(org_id, id)`).
- `executive_summary` (TEXT, NOT NULL): C-level summary.
- `full_report_markdown` (TEXT, NOT NULL): Full formatted Markdown report with citations.
- `coverage_summary` (JSONB, NOT NULL): Source coverage statistics.
- **Constraints**: `UNIQUE (org_id, mission_id)`.
