# ADR 0005: Eight Specialist Agents and Zero Mock Data Policy

## Status
Accepted

## Context
Previous prototype iterations of intelligence tools frequently rely on synthetic startup data, hardcoded mocks, and fabricated agent outputs. In production, this causes hallucinated claims, untraceable conclusions, and failure modes that cannot be diagnosed or resolved.

## Decision
1. Implement exactly **8 specialist agents** with explicit, measurable responsibilities:
   - `01 Company Scanner`: YC directory, Product Hunt GraphQL, startup sites, announcements.
   - `02 Research Scanner`: arXiv, OpenAlex, Semantic Scholar, Crossref.
   - `03 Community Scanner`: Hacker News API, approved public discussions.
   - `04 Hiring Intelligence`: Greenhouse, Lever, Ashby, career pages.
   - `05 Open Source Intelligence`: GitHub REST/GraphQL, commits, dependencies.
   - `06 Market Intelligence`: Funding filings, SEC EDGAR, partnerships, releases.
   - `07 Architecture Extractor`: Developer docs, OpenAPI/Swagger specs, SDKs.
   - `08 Negative Space Engine`: Opportunity discovery, gap analysis, competitor capability matrix.
2. **Zero Mock Data Policy**:
   - Every connector returns live, validated data or explicit `UNAVAILABLE` / `RATE_LIMITED` / `FAILED` status codes.
   - Empty arrays `[]` are valid responses when sources yield no matches; they must never be replaced with synthetic records.
   - Every factual claim must link to an immutable `evidence_id` pointing to an authenticated source URL, raw document hash, and span timestamp.
3. **No Uncontrolled Agent-to-Agent Chatter**: Agent execution is coordinated deterministically by the orchestrator (Temporal). Agents do not call each other ad-hoc.

## Consequences
- **Positive**: Complete auditability, rock-solid provenance, reproducible intelligence reports, trustworthy enterprise outputs.
- **Negative**: Missions will transparently report partial or failed source coverage when external APIs fail or are rate-limited, requiring robust partial-coverage synthesis in Agent 8.
