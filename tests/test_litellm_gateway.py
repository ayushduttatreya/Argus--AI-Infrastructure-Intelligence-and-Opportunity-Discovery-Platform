"""
Integration and policy verification tests for LiteLLM Model Gateway.
Validates 8 virtual identities, budget policies, master key isolation,
and unconfigured model provider fail-safe reporting.
"""
import pytest
from argus.core.litellm_gateway import (
    LiteLLMGatewayClient,
    AGENT_VIRTUAL_KEY_POLICIES,
)


def test_litellm_virtual_key_policies_defined_for_all_8_agents():
    """Verify that all 8 specialist agents have explicit, centrally budgeted policies."""
    expected_agents = [
        "company_scanner",
        "research_scanner",
        "community_scanner",
        "hiring_intelligence",
        "open_source_intelligence",
        "market_intelligence",
        "architecture_extractor",
        "negative_space_engine",
    ]
    for agent_id in expected_agents:
        assert agent_id in AGENT_VIRTUAL_KEY_POLICIES, f"Missing virtual key policy for {agent_id}"
        policy = AGENT_VIRTUAL_KEY_POLICIES[agent_id]
        assert policy["max_budget"] > 0, f"Budget must be positive for {agent_id}"
        assert len(policy["models"]) >= 1, f"Model allowlist cannot be empty for {agent_id}"
        assert policy["rpm_limit"] > 0, f"RPM limit must be set for {agent_id}"
        assert policy["tpm_limit"] > 0, f"TPM limit must be set for {agent_id}"


def test_model_allowlist_restricts_agents_to_assigned_tiers():
    """Verify that agents are restricted to approved models."""
    community_policy = AGENT_VIRTUAL_KEY_POLICIES["community_scanner"]
    assert "google/gemini-2.0-flash-001" in community_policy["models"]
    assert "anthropic/claude-3.5-sonnet" not in community_policy["models"], \
        "Fast-eval agent should not be permitted expensive reasoning model"

    deep_policy = AGENT_VIRTUAL_KEY_POLICIES["negative_space_engine"]
    assert "anthropic/claude-3.5-sonnet" in deep_policy["models"]


@pytest.mark.asyncio
async def test_upstream_model_integration_reports_blocked_without_credentials(monkeypatch):
    """
    Verify that when upstream credentials are not configured, the gateway
    accurately reports BLOCKED rather than fabricating fake output.
    """
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    client = LiteLLMGatewayClient(proxy_url="http://localhost:4000")
    result = await client.verify_upstream_model_integration()

    assert result["status"] == "BLOCKED"
    assert result["reason"] == "UPSTREAM_CREDENTIALS_UNCONFIGURED"
    assert "OPENROUTER_API_KEY" in result["message"]
