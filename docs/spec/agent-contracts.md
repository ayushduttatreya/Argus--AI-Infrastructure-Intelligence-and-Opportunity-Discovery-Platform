# ARGUS Agent Specifications & Tool Contracts (v1)

This document formalizes the runtime specifications, tool contracts, model routing policies, and security guardrails for all 8 ARGUS specialist agents.

---

## 1. Global Agent Execution Standards

### 1.1 Zero Dummy Data Rule
- Agents must only report observations derived from authenticated source connectors or verified internal evidence.
- An empty result set `[]` is a valid, normal response. Connectors must never fabricate records.
- When an external API is down or rate-limited, the agent must record `status: partial` or `status: failed` with an explicit `error_code`.

### 1.2 Claim-Check Return Pattern
- Activities executed within Temporal workflows must **never** return raw scraped HTML, PDF binaries, or full document texts.
- Large artifacts must be written to MinIO/S3 and registered in `document_versions`.
- Activity return payloads must contain only lightweight identifiers and metrics, strictly below **20 KB**:
  ```json
  {
    "agent_id": "company_scanner",
    "status": "completed",
    "source_document_ids": ["9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"],
    "document_version_ids": ["c29b794a-939e-4a6c-9403-463e2c39e83b"],
    "evidence_count": 8,
    "duration_ms": 3420,
    "warnings": []
  }
  ```

### 1.3 Heartbeat & Timeout Policy
- **Extraction / Synthesis Activities** (Duration < 30s): `StartToCloseTimeout: 60s`. No heartbeating required.
- **Deep Ingestion Activities** (Duration 30s – 180s): `StartToCloseTimeout: 180s`, `HeartbeatTimeout: 30s`. The worker must call `temporalio.activity.heartbeat()` after every paginated API request or batch chunk.

### 1.4 Retry Coordination & Anti-Multiplication
- **Temporal** owns execution retries with exponential backoff and jitter (`initial_interval: 2s`, `backoff_coefficient: 2.0`, `maximum_attempts: 3`).
- **LiteLLM Router** proxy retries are capped at `1` (`num_retries: 1`).
- **HTTP Source Connectors** set internal retry count to `0` or `1` for transient network drops.

### 1.5 Security & SSRF Defense
- Any tool taking a URL as an input (e.g. `web_fetch`, `docs_crawl`) must pass through the `argus.connectors.security.SSRFValidator`:
  - Resolves target hostname to IPv4/IPv6 before initiating connection.
  - Rejects loopback (`127.0.0.0/8`, `::1`), link-local / cloud metadata (`169.254.169.254`), and private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Re-evaluates destination IP on every HTTP redirect (301/302).

### 1.6 Prompt Injection Defense
- Scraped external content must be treated as untrusted text.
- Prompts must enclose external excerpts within XML delimiters:
  `<untrusted_source_content source="{source_name}" url="{url}">...</untrusted_source_content>`
- System instructions explicitly forbid executing directives or instructions found inside the untrusted content tags.

---

## 2. Specialist Agent Contracts

```
EXECUTION PIPELINE
STAGE 1 (Concurrent)     STAGE 2                 STAGE 3                 STAGE 4
┌────────────────────┐   ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ 01 Company Scanner │   │                   │   │                   │   │                   │
│ 02 Research Scanner│   │ 07 Architecture   │   │ 08 Negative Space │   │ Synthesis & Final │
│ 03 Community Scan  │──>│    Extractor      │──>│    Engine         │──>│ Intelligence      │
│ 04 Hiring Intel    │   │ (Docs, Specs, SDK)│   │ (Graph White-     │   │ Report            │
│ 05 Open Source     │   │                   │   │  Space Reasoning) │   │                   │
│ 06 Market Intel    │   └───────────────────┘   └───────────────────┘   └───────────────────┘
└────────────────────┘
```

---

### Agent 01: Company Scanner (`company_scanner`)
- **Mission**: Discover new startups, commercial product launches, and company profiles related to the research topic.
- **Sources**: Y Combinator Public Directory, Product Hunt GraphQL API, company websites.
- **Model Profile**: `extraction_fast` (e.g. `openrouter/meta-llama/llama-3.3-70b-instruct` or `gpt-4o-mini`).
- **Virtual Key**: `sk-argus-company-scanner` (Budget: \$2.00/mission, Max RPM: 60).
- **Tool Allowlist**:
  - `tool_producthunt_query`: Searches Product Hunt GraphQL API.
  - `tool_yc_directory_search`: Queries official YC batch index.
  - `tool_safe_web_scrape`: Fetches company landing pages with SSRF validation.
- **Pydantic Output Model**:
  ```python
  class CompanyDiscoveryItem(BaseModel):
      canonical_name: str
      website_url: HttpUrl
      tagline: str
      founding_year: int | None
      yc_batch: str | None
      product_hunt_url: HttpUrl | None
      key_capabilities: list[str]
      source_url: HttpUrl
  ```

---

### Agent 02: Research Scanner (`research_scanner`)
- **Mission**: Identify foundational algorithms, empirical benchmarks, and scientific limitations from academic literature.
- **Sources**: arXiv API, OpenAlex API, Semantic Scholar API, Crossref.
- **Model Profile**: `research_synthesis` (e.g. `openrouter/anthropic/claude-3.5-sonnet` or `google/gemini-pro`).
- **Virtual Key**: `sk-argus-research-scanner` (Budget: \$3.00/mission, Max RPM: 40).
- **Tool Allowlist**:
  - `tool_arxiv_search`: Queries arXiv by keyword/category.
  - `tool_openalex_query`: Retrieves publication metadata, citations, and abstracts.
  - `tool_pdf_extract_sections`: Splits paper into Abstract, Method, Results, Limitations.
- **Pydantic Output Model**:
  ```python
  class ResearchPaperFinding(BaseModel):
      title: str
      authors: list[str]
      published_date: datetime
      doi: str | None
      arxiv_id: str | None
      abstract: str
      methodology_summary: str
      stated_limitations: list[str]
      benchmarks_reported: list[dict[str, Any]]
  ```

---

### Agent 03: Community Scanner (`community_scanner`)
- **Mission**: Mine developer sentiment, real-world friction, and undocumented system bugs.
- **Sources**: Hacker News Firebase API, Reddit public API (subject to access), public tech forums.
- **Model Profile**: `classification_efficient` (e.g. `openrouter/meta-llama/llama-3.3-70b-instruct`).
- **Virtual Key**: `sk-argus-community-scanner` (Budget: \$1.50/mission, Max RPM: 60).
- **Tool Allowlist**:
  - `tool_hackernews_search`: Algolia/HN API item lookup.
  - `tool_safe_forum_fetch`: Parses permitted public discussions.
- **Pydantic Output Model**:
  ```python
  class CommunitySentimentItem(BaseModel):
      platform: Literal["hackernews", "reddit", "forum"]
      thread_title: str
      thread_url: HttpUrl
      pain_point_category: str
      verbatim_quote: str
      sentiment_score: float = Field(ge=-1.0, le=1.0)
      technical_complaints: list[str]
  ```

---

### Agent 04: Hiring Intelligence (`hiring_intelligence`)
- **Mission**: Detect stealth technology bets and architectural shifts from engineering job postings.
- **Sources**: Greenhouse API, Lever API, Ashby API, public career pages.
- **Model Profile**: `extraction_fast`.
- **Virtual Key**: `sk-argus-hiring-intelligence` (Budget: \$1.50/mission, Max RPM: 60).
- **Tool Allowlist**:
  - `tool_greenhouse_fetch`: Parses Greenhouse job boards.
  - `tool_lever_fetch`: Parses Lever job boards.
  - `tool_ashby_fetch`: Parses Ashby job boards.
- **Pydantic Output Model**:
  ```python
  class HiringSignalItem(BaseModel):
      company_name: str
      job_title: str
      job_url: HttpUrl
      department: str
      required_technologies: list[str]
      architectural_hints: list[str]
      strategic_priority: str
  ```

---

### Agent 05: Open Source Intelligence (`open_source_intel`)
- **Mission**: Analyze GitHub repository metrics, dependency graphs, release velocity, and issue patterns.
- **Sources**: Authenticated GitHub REST / GraphQL APIs.
- **Model Profile**: `balanced_code` (e.g. `openrouter/deepseek/deepseek-chat` or `gpt-4o`).
- **Virtual Key**: `sk-argus-open-source-intel` (Budget: \$2.00/mission, Max RPM: 60).
- **Tool Allowlist**:
  - `tool_github_repo_stats`: Queries stars, forks, open issues, commit velocity.
  - `tool_github_dependency_tree`: Parses `package.json`, `pyproject.toml`, `Cargo.toml`.
  - `tool_github_issue_trends`: Identifies common bug labels and architectural queries.
- **Pydantic Output Model**:
  ```python
  class OpenSourceRepositoryMetrics(BaseModel):
      repo_name: str
      canonical_url: HttpUrl
      stars_count: int
      forks_count: int
      monthly_commit_count: int
      primary_languages: list[str]
      core_dependencies: list[str]
      frequent_issue_topics: list[str]
      license_type: str
  ```

---

### Agent 06: Market Intelligence (`market_intelligence`)
- **Mission**: Corroborate funding rounds, enterprise partnerships, and commercial acquisitions.
- **Sources**: SEC EDGAR, official company press releases, verified tech news.
- **Model Profile**: `extraction_corroboration`.
- **Virtual Key**: `sk-argus-market-intelligence` (Budget: \$2.00/mission, Max RPM: 40).
- **Tool Allowlist**:
  - `tool_sec_edgar_query`: Searches SEC Form D / 10-K filings.
  - `tool_safe_news_fetch`: Crawls official company press releases with SSRF guard.
- **Pydantic Output Model**:
  ```python
  class MarketEventItem(BaseModel):
      company_name: str
      event_type: Literal["funding", "partnership", "acquisition", "product_launch"]
      announcement_date: datetime
      amount_usd: float | None
      lead_investors: list[str]
      key_partners: list[str]
      source_url: HttpUrl
      confidence_score: float = Field(ge=0.0, le=1.0)
  ```

---

### Agent 07: Architecture Extractor (`architecture_extractor`)
- **Mission**: Reverse-engineer technical architecture, APIs, data contracts, and bottlenecks of discovered companies.
- **Sources**: Developer documentation, OpenAPI specifications, SDK repositories, architectural blogs.
- **Model Profile**: `architecture_reasoning` (e.g. `openrouter/anthropic/claude-3.5-sonnet` or `openai/o1-mini`).
- **Virtual Key**: `sk-argus-architecture-extractor` (Budget: \$4.00/mission, Max RPM: 30).
- **Tool Allowlist**:
  - `tool_openapi_spec_parser`: Validates and analyzes Swagger/OpenAPI schemas.
  - `tool_doc_site_crawler`: Crawls developer documentation subtrees.
  - `tool_evidence_search`: Queries internal RAG hybrid store (`evidence_spans`).
- **Pydantic Output Model**:
  ```python
  class ArchitectureProfile(BaseModel):
      company_name: str
      core_architecture: str
      data_layer_technologies: list[str]
      distributed_coordination: str | None
      api_protocols: list[str]  # e.g. ["REST", "gRPC", "GraphQL"]
      scaling_bottlenecks_identified: list[str]
      supporting_claim_ids: list[UUID]
  ```

---

### Agent 08: Negative Space Engine (`negative_space_engine`)
- **Mission**: Synthesize cross-source evidence, detect white-space gaps, analyze competitor blind-spots, and generate falsifiable opportunity hypotheses.
- **Sources**: **Strictly internal** ARGUS normalized knowledge graph (`entities`, `relationships`, `claims`, `evidence_spans`). Not an external scraping agent.
- **Model Profile**: `analytical_reasoning` (e.g. `openrouter/anthropic/claude-3.5-sonnet` or `openai/o1`).
- **Virtual Key**: `sk-argus-negative-space` (Budget: \$5.00/mission, Max RPM: 20).
- **Tool Allowlist**:
  - `tool_graph_capability_matrix`: Computes capability matrix across discovered competitors.
  - `tool_evidence_contradiction_scan`: Identifies conflicting claims across sources.
  - `tool_claim_lookup`: Retrieves claim clusters and exact quote offsets.
- **Pydantic Output Model**:
  ```python
  class OpportunityHypothesisOutput(BaseModel):
      title: str
      description: str
      gap_analysis: str
      target_market_segment: str
      competitor_shortcomings: list[dict[str, Any]]
      evidence_confidence_score: float = Field(ge=0.0, le=1.0)
      market_impact_score: float = Field(ge=0.0, le=1.0)
      technical_feasibility_score: float = Field(ge=0.0, le=1.0)
      overall_priority_score: float = Field(ge=0.0, le=1.0)
      scoring_breakdown: dict[str, Any]
      supporting_claim_ids: list[UUID]
      contradictory_claim_ids: list[UUID]
  ```
