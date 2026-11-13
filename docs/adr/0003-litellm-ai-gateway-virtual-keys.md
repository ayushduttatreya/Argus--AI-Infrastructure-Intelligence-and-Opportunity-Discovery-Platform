# ADR 0003: LiteLLM AI Gateway, Virtual Keys & Spend Governance

## Status
Accepted (Amended in Phase 0.6)

## Context
ARGUS agents require distinct LLM permissions, model profiles (fast extraction vs. advanced reasoning), and financial budgets.
Directly injecting upstream provider keys into agent processes creates credential sprawl, prevents rate-limiting, risks budget overruns, and complicates failover.
Additionally, running a stateless LiteLLM proxy causes virtual key spend metrics to reset on restart.

## Decision
1. **Centralized LiteLLM Proxy Gateway**:
   - Upstream master keys (OpenRouter primary, OpenAI/Anthropic direct fallbacks) are held exclusively by the LiteLLM proxy service.
   - Master keys are never exposed to agent environments, worker configurations, or prompts.
2. **PostgreSQL-Backed Persistence**:
   - LiteLLM connects to a dedicated PostgreSQL database/schema (`DATABASE_URL=postgresql://.../litellm_proxy`) to guarantee that spend tracking, token budgets, and rate limits persist across container restarts.
3. **Eight Agent Virtual Key Identities**:
   - Each of the 8 agents (`company_scanner`, `research_scanner`, etc.) receives an independent virtual key.
   - Strict per-agent configuration enforces:
     - Explicit model allowlists (no wildcard access).
     - Token budgets and hard dollar spend caps.
     - Maximum requests-per-minute (RPM) and concurrency throttles.
4. **Retry & Fallback Coordination**:
   - LiteLLM router handles provider fallbacks (e.g. OpenRouter outage -> Direct Provider fallback).
   - LiteLLM retry count is capped at 1 (`num_retries: 1`) to avoid multiplying retries with Temporal's activity retry policies.

## Consequences
- **Positive**: Strict least-privilege security, persistent budget governance, granular cost attribution per agent in `model_calls` table, automatic provider failover.
- **Negative**: Adds a stateful dependency on PostgreSQL for the LiteLLM proxy; proxy health must be monitored via `/health` readiness probes.
