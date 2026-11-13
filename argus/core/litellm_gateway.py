"""
LiteLLM AI Gateway Management for ARGUS.
Manages 8 virtual agent identities with database-backed spend budgets,
model allowlists, and upstream OpenRouter provider routing.
"""
import os
import time
from typing import Any
import httpx
from argus.core.config import settings
from argus.core.logging import logger
from argus.core.telemetry import get_tracer, inject_trace_context

tracer = get_tracer("litellm_gateway")

# 8 Virtual Agent Identities & Architectural Policies
AGENT_VIRTUAL_KEY_POLICIES: dict[str, dict[str, Any]] = {
    "company_scanner": {
        "max_budget": 10.00,
        "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-2.0-flash-001"],
        "rpm_limit": 60,
        "tpm_limit": 100000,
    },
    "research_scanner": {
        "max_budget": 15.00,
        "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
        "rpm_limit": 60,
        "tpm_limit": 100000,
    },
    "community_scanner": {
        "max_budget": 5.00,
        "models": ["google/gemini-2.0-flash-001", "openai/gpt-4o"],
        "rpm_limit": 120,
        "tpm_limit": 150000,
    },
    "hiring_intelligence": {
        "max_budget": 5.00,
        "models": ["google/gemini-2.0-flash-001", "openai/gpt-4o"],
        "rpm_limit": 60,
        "tpm_limit": 100000,
    },
    "open_source_intelligence": {
        "max_budget": 5.00,
        "models": ["google/gemini-2.0-flash-001", "openai/gpt-4o"],
        "rpm_limit": 120,
        "tpm_limit": 150000,
    },
    "market_intelligence": {
        "max_budget": 10.00,
        "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
        "rpm_limit": 60,
        "tpm_limit": 100000,
    },
    "architecture_extractor": {
        "max_budget": 20.00,
        "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
        "rpm_limit": 30,
        "tpm_limit": 80000,
    },
    "negative_space_engine": {
        "max_budget": 25.00,
        "models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
        "rpm_limit": 30,
        "tpm_limit": 80000,
    },
}


class LiteLLMGatewayClient:
    """
    Client for interacting with the LiteLLM Proxy service and administering virtual keys.
    """

    def __init__(
        self,
        proxy_url: str | None = None,
        master_key: str | None = None,
    ) -> None:
        self.proxy_url = (proxy_url or settings.LITELLM_PROXY_URL).rstrip("/")
        self.master_key = master_key or settings.LITELLM_MASTER_KEY
        self.virtual_keys: dict[str, str] = {}

    async def check_proxy_health(self) -> bool:
        """Checks if the LiteLLM proxy HTTP service is responding."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.proxy_url}/health/liveliness")
                return resp.status_code == 200
        except Exception as exc:
            logger.debug(f"LiteLLM health check failed: {exc}")
            return False

    async def provision_virtual_key(
        self,
        agent_id: str,
    ) -> dict[str, Any]:
        """
        Provisions a database-backed virtual key identity in LiteLLM for an agent.
        """
        policy = AGENT_VIRTUAL_KEY_POLICIES.get(agent_id)
        if not policy:
            raise ValueError(f"Unknown agent identity: {agent_id}")

        headers = {
            "Authorization": f"Bearer {self.master_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "key_alias": agent_id,
            "max_budget": policy["max_budget"],
            "models": policy["models"],
            "rpm_limit": policy["rpm_limit"],
            "tpm_limit": policy["tpm_limit"],
            "metadata": {"agent_id": agent_id, "platform": "argus"},
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.proxy_url}/key/generate",
                headers=headers,
                json=payload,
            )
            if resp.status_code not in (200, 201):
                raise RuntimeError(
                    f"Failed to generate LiteLLM virtual key for {agent_id}: {resp.status_code} {resp.text}"
                )

            data = resp.json()
            generated_key = data.get("key")
            if generated_key:
                self.virtual_keys[agent_id] = generated_key
            return data

    async def provision_all_virtual_keys(self) -> dict[str, str]:
        """Provisions all 8 agent identities in LiteLLM."""
        results = {}
        for agent_id in AGENT_VIRTUAL_KEY_POLICIES:
            res = await self.provision_virtual_key(agent_id)
            results[agent_id] = res.get("key", "configured")
        return results

    async def execute_model_call(
        self,
        agent_id: str,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> dict[str, Any]:
        """
        Invokes an LLM completion through the agent's virtual key identity.
        Propagates OpenTelemetry distributed trace context.
        """
        virtual_key = self.virtual_keys.get(agent_id)
        auth_header = f"Bearer {virtual_key}" if virtual_key else f"Bearer {self.master_key}"

        headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
        }
        inject_trace_context(headers)

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        with tracer.start_as_current_span(
            "litellm.completion",
            attributes={
                "llm.model": model,
                "agent.id": agent_id,
                "http.url": f"{self.proxy_url}/chat/completions",
            },
        ) as span:
            start_time = time.time()
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.proxy_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                latency_ms = int((time.time() - start_time) * 1000)
                span.set_attribute("llm.latency_ms", latency_ms)

                if resp.status_code != 200:
                    span.set_attribute("error", True)
                    span.set_attribute("llm.error_response", resp.text)
                    raise RuntimeError(
                        f"Model call failed ({resp.status_code}): {resp.text}"
                    )

                data = resp.json()
                usage = data.get("usage", {})
                span.set_attribute("llm.usage.prompt_tokens", usage.get("prompt_tokens", 0))
                span.set_attribute("llm.usage.completion_tokens", usage.get("completion_tokens", 0))
                return {
                    "data": data,
                    "latency_ms": latency_ms,
                    "usage": usage,
                }

    async def verify_upstream_model_integration(self) -> dict[str, Any]:
        """
        Performs a smoke test against an upstream model provider.
        If credentials are unset, returns BLOCKED status without fabricating responses.
        """
        openrouter_key = os.environ.get("OPENROUTER_API_KEY")
        openai_key = os.environ.get("OPENAI_API_KEY")

        if not openrouter_key and not openai_key:
            return {
                "status": "BLOCKED",
                "reason": "UPSTREAM_CREDENTIALS_UNCONFIGURED",
                "message": (
                    "Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is configured in the environment. "
                    "Live model execution is halted until external credentials are provided."
                ),
            }

        try:
            result = await self.execute_model_call(
                agent_id="company_scanner",
                model="google/gemini-2.0-flash-001",
                messages=[{"role": "user", "content": "ARGUS smoke test"}],
                max_tokens=5,
            )
            return {
                "status": "PASSED",
                "latency_ms": result["latency_ms"],
                "model": "google/gemini-2.0-flash-001",
            }
        except Exception as exc:
            return {
                "status": "FAILED",
                "error": str(exc),
            }
