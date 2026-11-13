# ARGUS — LiteLLM AI Gateway Setup Guide

This document describes the deployment, configuration, database isolation, and virtual key governance of the LiteLLM Proxy service within the ARGUS platform.

---

## 1. Architectural Role & Principles

LiteLLM acts as the centralized AI Gateway for all ARGUS specialist agents. It enforces:
1. **Centralized Cost & Rate Control:** Hard spend budgets (USD) and rate limits (RPM/TPM) enforced at the proxy gateway layer.
2. **Model Allowlists:** Each agent identity can only call models approved for its specific architectural tier.
3. **Database-Backed Persistence:** Virtual keys, usage logs, and budget balances are persisted in a dedicated PostgreSQL database (`argus_litellm`), guaranteeing that budgets survive service restarts.
4. **Credential Isolation:** Neither upstream provider API keys (OpenRouter, OpenAI) nor LiteLLM master keys are ever exposed to the frontend or agents.

---

## 2. Database Isolation

LiteLLM's internal schema (managed by Prisma / LiteLLM Proxy) is completely segregated from the ARGUS application database:

| Component | Database Name | Dedicated Role | Purpose |
|:---|:---|:---|:---|
| **ARGUS Core** | `argus` | `postgres` / `argus_app` | Missions, evidence, claims, RLS-protected research data |
| **LiteLLM Gateway** | `argus_litellm` | `argus_litellm_user` | Virtual keys, token counters, spend tracking |

### Database Initialization
```sql
CREATE ROLE argus_litellm_user LOGIN PASSWORD 'litellm_secure_db_pass';
CREATE DATABASE argus_litellm OWNER argus_litellm_user;
GRANT ALL PRIVILEGES ON DATABASE argus_litellm TO argus_litellm_user;
```

---

## 3. Proxy Configuration (`config/litellm_config.yaml`)

```yaml
model_list:
  - model_name: "anthropic/claude-3.5-sonnet"
    litellm_params:
      model: "openrouter/anthropic/claude-3.5-sonnet"
      api_key: "os.environ/OPENROUTER_API_KEY"
  - model_name: "openai/gpt-4o"
    litellm_params:
      model: "openrouter/openai/gpt-4o"
      api_key: "os.environ/OPENROUTER_API_KEY"
  - model_name: "google/gemini-2.0-flash-001"
    litellm_params:
      model: "openrouter/google/gemini-2.0-flash-001"
      api_key: "os.environ/OPENROUTER_API_KEY"

litellm_settings:
  drop_params: true
  num_retries: 1
  request_timeout: 60
  telemetry: false

general_settings:
  master_key: "os.environ/LITELLM_MASTER_KEY"
  database_url: "postgresql://argus_litellm_user:litellm_secure_db_pass@localhost/argus_litellm?host=/tmp"
  store_model_in_db: false
```

---

## 4. The 8 Internal Virtual-Key Identities

ARGUS configures 8 distinct virtual keys inside LiteLLM, rather than purchasing 8 separate upstream provider keys:

| Agent Identity | Max Budget | Rate Limits | Model Allowlist |
|:---|:---:|:---:|:---|
| **`company_scanner`** | $10.00 | 60 RPM / 100k TPM | `claude-3.5-sonnet`, `gpt-4o`, `gemini-2.0-flash` |
| **`research_scanner`** | $15.00 | 60 RPM / 100k TPM | `claude-3.5-sonnet`, `gpt-4o` |
| **`community_scanner`** | $5.00 | 120 RPM / 150k TPM | `gemini-2.0-flash`, `gpt-4o` |
| **`hiring_intelligence`** | $5.00 | 60 RPM / 100k TPM | `gemini-2.0-flash`, `gpt-4o` |
| **`open_source_intelligence`** | $5.00 | 120 RPM / 150k TPM | `gemini-2.0-flash`, `gpt-4o` |
| **`market_intelligence`** | $10.00 | 60 RPM / 100k TPM | `claude-3.5-sonnet`, `gpt-4o` |
| **`architecture_extractor`** | $20.00 | 30 RPM / 80k TPM | `claude-3.5-sonnet`, `gpt-4o` |
| **`negative_space_engine`** | $25.00 | 30 RPM / 80k TPM | `claude-3.5-sonnet`, `gpt-4o` |

---

## 5. Starting the LiteLLM Proxy Service

```bash
LITELLM_LOCAL_MODEL_COST_MAP="True" \
LITELLM_MASTER_KEY="sk-litellm-master-key" \
OPENROUTER_API_KEY="your-openrouter-key" \
.venv/bin/litellm --config config/litellm_config.yaml --port 4000
```

---

## 6. Upstream Provider Credential Policy

ARGUS strictly refuses to mock or fabricate LLM inference responses:
- If `OPENROUTER_API_KEY` is not provided in environment secrets, model calls return an explicit `BLOCKED` status:
  ```json
  {
    "status": "BLOCKED",
    "reason": "UPSTREAM_CREDENTIALS_UNCONFIGURED",
    "message": "Set OPENROUTER_API_KEY to enable live model execution."
  }
  ```
- No dummy text or fabricated intelligence is ever written to production tables.
