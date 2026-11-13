"""
ARGUS Runtime Verification: Real LiteLLM Proxy & Database-Backed Virtual Keys.
Independently verifies:
1. LiteLLM Proxy operation on port 4000 backed by PostgreSQL argus_litellm database
2. Master key authentication and health status
3. Key generation (/key/generate) for all 8 agent identities
4. Verification of key info (/key/info), metadata, budgets, and allowed models
5. Direct PostgreSQL persistence verification in LiteLLM_VerificationToken table
6. Model allowlist policy enforcement (rejected access to disallowed models)
7. Upstream credential gate validation (reporting BLOCKED without fabricated completions)
"""
import asyncio
import os
import socket
import subprocess
import time
import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from argus.core.litellm_gateway import (
    AGENT_VIRTUAL_KEY_POLICIES,
    LiteLLMGatewayClient,
)

LITELLM_CONFIG = "config/litellm_config.yaml"
LITELLM_PORT = 4000
LITELLM_URL = f"http://127.0.0.1:{LITELLM_PORT}"
MASTER_KEY = "sk-litellm-master-key"
LITELLM_DB_URL = "postgresql+asyncpg://argus_litellm_user:litellm_secure_db_pass@/argus_litellm?host=/tmp"


@pytest.fixture(scope="module")
def litellm_proxy():
    """Starts the real LiteLLM Proxy server on port 4000 backed by PostgreSQL."""
    env = os.environ.copy()
    env["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
    env["LITELLM_MASTER_KEY"] = MASTER_KEY
    env["DATABASE_URL"] = "postgresql://argus_litellm_user:litellm_secure_db_pass@localhost/argus_litellm?host=/tmp"

    proc = subprocess.Popen(
        [
            "/home/ayush/Argus/.venv/bin/litellm",
            "--config", LITELLM_CONFIG,
            "--port", str(LITELLM_PORT),
        ],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait for proxy to listen and respond on port 4000
    ready = False
    for _ in range(40):
        time.sleep(1.0)
        s = socket.socket()
        if s.connect_ex(("127.0.0.1", LITELLM_PORT)) == 0:
            s.close()
            # Verify HTTP responsiveness
            try:
                resp = httpx.get(f"{LITELLM_URL}/health/liveliness", timeout=2.0)
                if resp.status_code == 200:
                    ready = True
                    break
            except Exception:
                pass
        else:
            s.close()

    if not ready:
        proc.terminate()
        stdout, stderr = proc.communicate(timeout=5)
        raise RuntimeError(
            f"LiteLLM proxy failed to become ready:\nstdout: {stdout.decode()}\nstderr: {stderr.decode()}"
        )

    yield proc

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture
async def litellm_db_engine():
    engine = create_async_engine(LITELLM_DB_URL)
    yield engine
    await engine.dispose()


@pytest.mark.asyncio
async def test_1_litellm_proxy_health_and_master_key_auth(litellm_proxy):
    """
    Verify LiteLLM proxy is running, /health/liveliness is 200,
    and master key authentication is enforced.
    """
    client = LiteLLMGatewayClient(proxy_url=LITELLM_URL, master_key=MASTER_KEY)
    assert await client.check_proxy_health() is True

    async with httpx.AsyncClient(timeout=5.0) as http:
        # 1. Unauthenticated request to protected endpoint fails
        unauth_resp = await http.get(f"{LITELLM_URL}/key/info")
        assert unauth_resp.status_code == 401, "Expected 401 for missing key"

        # 2. Master key allows access to health endpoint
        auth_resp = await http.get(
            f"{LITELLM_URL}/health",
            headers={"Authorization": f"Bearer {MASTER_KEY}"}
        )
        assert auth_resp.status_code == 200, f"Expected 200 for master key, got: {auth_resp.status_code}"


@pytest.mark.asyncio
async def test_2_provision_and_verify_all_8_virtual_keys(litellm_proxy, litellm_db_engine):
    """
    Provisions all 8 virtual keys via /key/generate, checks /key/info for each,
    and verifies direct persistence in the PostgreSQL LiteLLM_VerificationToken table.
    """
    client = LiteLLMGatewayClient(proxy_url=LITELLM_URL, master_key=MASTER_KEY)

    # 1. Generate keys for all 8 agent identities
    generated_keys = await client.provision_all_virtual_keys()
    assert len(generated_keys) == 8
    assert len(client.virtual_keys) == 8

    async with httpx.AsyncClient(timeout=10.0) as http:
        for agent_id, expected_policy in AGENT_VIRTUAL_KEY_POLICIES.items():
            key = generated_keys[agent_id]
            assert key.startswith("sk-")

            # 2. Query /key/info for this virtual key
            info_resp = await http.get(
                f"{LITELLM_URL}/key/info",
                headers={"Authorization": f"Bearer {MASTER_KEY}"},
                params={"key": key},
            )
            assert info_resp.status_code == 200, f"Failed /key/info for {agent_id}: {info_resp.text}"
            info_data = info_resp.json()
            key_info = info_data.get("info", {})

            # Verify key properties match architectural policy
            assert key_info.get("key_alias") == agent_id
            assert float(key_info.get("max_budget")) == float(expected_policy["max_budget"])
            assert set(key_info.get("models", [])) == set(expected_policy["models"])
            assert key_info.get("rpm_limit") == expected_policy["rpm_limit"]
            assert key_info.get("tpm_limit") == expected_policy["tpm_limit"]
            assert key_info.get("metadata", {}).get("agent_id") == agent_id

    # 3. Verify physical database persistence in argus_litellm database
    async with litellm_db_engine.connect() as conn:
        res = await conn.execute(
            text('SELECT key_alias, max_budget, models FROM "LiteLLM_VerificationToken"')
        )
        db_rows = {row[0]: {"max_budget": float(row[1]), "models": row[2]} for row in res.fetchall()}

        for agent_id, expected_policy in AGENT_VIRTUAL_KEY_POLICIES.items():
            assert agent_id in db_rows, f"Agent {agent_id} key not found in LiteLLM_VerificationToken table!"
            assert db_rows[agent_id]["max_budget"] == float(expected_policy["max_budget"])


@pytest.mark.asyncio
async def test_3_model_allowlist_enforcement(litellm_proxy):
    """
    Verify model allowlist enforcement:
    An agent restricted to Gemini cannot access Claude or GPT-4o.
    LiteLLM returns 400/403 with model not allowed.
    """
    client = LiteLLMGatewayClient(proxy_url=LITELLM_URL, master_key=MASTER_KEY)
    # Ensure keys are provisioned
    await client.provision_all_virtual_keys()

    # 'community_scanner' only has access to ["google/gemini-2.0-flash-001", "openai/gpt-4o"]
    # NOT allowed: "anthropic/claude-3.5-sonnet"
    community_key = client.virtual_keys["community_scanner"]

    async with httpx.AsyncClient(timeout=10.0) as http:
        resp = await http.post(
            f"{LITELLM_URL}/chat/completions",
            headers={"Authorization": f"Bearer {community_key}", "Content-Type": "application/json"},
            json={
                "model": "anthropic/claude-3.5-sonnet",
                "messages": [{"role": "user", "content": "Disallowed model attempt"}],
            },
        )
        assert resp.status_code in (400, 403), f"Expected 400 or 403 for disallowed model, got {resp.status_code}"
        error_msg = resp.text.lower()
        assert any(term in error_msg for term in ["model", "not allowed", "disallowed", "allowed_models", "permission"]), (
            f"Unexpected error message: {resp.text}"
        )


@pytest.mark.asyncio
async def test_4_upstream_provider_fails_closed_without_credentials(litellm_proxy):
    """
    Verify upstream provider integration fails closed without live credentials.
    Confirms zero fake responses or simulated completions.
    """
    client = LiteLLMGatewayClient(proxy_url=LITELLM_URL, master_key=MASTER_KEY)

    # When OPENROUTER_API_KEY is not set
    report = await client.verify_upstream_model_integration()
    assert report["status"] == "BLOCKED"
    assert report["reason"] == "UPSTREAM_CREDENTIALS_UNCONFIGURED"
    assert "Live model execution is halted until external credentials are provided" in report["message"]
