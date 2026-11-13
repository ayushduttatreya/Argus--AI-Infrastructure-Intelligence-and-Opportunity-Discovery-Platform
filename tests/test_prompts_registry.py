"""
Integration tests for ARGUS Prompt Registry.
Validates SHA-256 integrity, prompt immutability, and audited model call references.
Runs against native PostgreSQL 16 instance.
"""
import uuid
import pytest
from sqlalchemy import text
from argus.core.database import async_session_factory
from argus.core.prompts import (
    register_prompt_version,
    get_active_prompt,
    load_and_register_prompts_from_disk,
    record_model_call,
    compute_prompt_hash,
    PromptImmutabilityError,
)


@pytest.mark.asyncio
async def test_register_prompt_version_and_hash_calculation():
    """Verify registration computes SHA-256 hash and persists immutable record."""
    agent_id = "company_scanner"
    version_tag = f"test-v{uuid.uuid4().hex[:6]}"
    template = "Extract architecture for company {{company_name}}."
    variables = ["company_name"]

    record = await register_prompt_version(
        agent_id=agent_id,
        version_tag=version_tag,
        system_template=template,
        input_variables=variables,
        is_active=True,
    )

    assert record.id is not None
    assert record.agent_id == agent_id
    assert record.version_tag == version_tag
    assert record.sha256_hash == compute_prompt_hash(template)
    assert record.is_active is True

    # Re-registering identical prompt returns existing record
    re_record = await register_prompt_version(
        agent_id=agent_id,
        version_tag=version_tag,
        system_template=template,
        input_variables=variables,
    )
    assert re_record.id == record.id


@pytest.mark.asyncio
async def test_prompt_immutability_rejects_altered_template():
    """Verify that attempting to overwrite an existing prompt version tag raises PromptImmutabilityError."""
    agent_id = "research_scanner"
    version_tag = f"test-v{uuid.uuid4().hex[:6]}"
    original_template = "Original paper extraction template."
    altered_template = "Altered paper extraction template with different text."

    # First registration
    await register_prompt_version(
        agent_id=agent_id,
        version_tag=version_tag,
        system_template=original_template,
        input_variables=[],
    )

    # Attempt overwrite with altered text
    with pytest.raises(PromptImmutabilityError) as exc_info:
        await register_prompt_version(
            agent_id=agent_id,
            version_tag=version_tag,
            system_template=altered_template,
            input_variables=[],
        )
    assert "Cannot overwrite immutable prompt version" in str(exc_info.value)


@pytest.mark.asyncio
async def test_load_all_prompts_from_disk():
    """Verify that prompts from the prompts/ directory load and register for all 8 agents."""
    registered = await load_and_register_prompts_from_disk(version_tag="v1.0.0-base")

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
        assert agent_id in registered, f"Missing disk prompt for {agent_id}"
        prompt = await get_active_prompt(agent_id)
        assert prompt is not None
        assert prompt.agent_id == agent_id
        assert len(prompt.system_template) > 20


@pytest.mark.asyncio
async def test_record_model_call_links_to_prompt_version():
    """Verify that model calls record exact prompt version IDs in PostgreSQL."""
    # 1. Setup organization, mission, agent_execution, and prompt_version
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()
    execution_id = uuid.uuid4()

    async with async_session_factory() as session:
        # Org
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Prompt Test Org", "slug": f"org-p-{org_id.hex[:6]}"}
        )
        # Mission
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
                VALUES (:id, :org_id, :key, 'hash-p', 'Prompt Test Topic')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-p-{mission_id.hex[:6]}"}
        )
        # Agent Execution
        await session.execute(
            text(
                """
                INSERT INTO agent_executions (id, org_id, mission_id, agent_id, status)
                VALUES (:id, :org_id, :mission_id, 'company_scanner', 'running')
                """
            ),
            {"id": execution_id, "org_id": org_id, "mission_id": mission_id}
        )
        await session.commit()

    # 2. Get active prompt
    prompt = await get_active_prompt("company_scanner")
    assert prompt is not None

    # 3. Record model call
    async with async_session_factory() as session:
        call_id = await record_model_call(
            session=session,
            org_id=org_id,
            mission_id=mission_id,
            agent_execution_id=execution_id,
            prompt_version_id=prompt.id,
            model_id="openrouter/anthropic/claude-3.5-sonnet",
            provider="openrouter",
            input_tokens=150,
            output_tokens=300,
            cost_usd=0.005400,
            latency_ms=850,
            status="success",
            request_hash="sha256-req-hash-123",
        )
        await session.commit()

        # Query and verify
        res = await session.execute(
            text("SELECT prompt_version_id, model_id, cost_usd FROM model_calls WHERE id = :id"),
            {"id": call_id}
        )
        row = res.mappings().all()[0]
        assert row["prompt_version_id"] == prompt.id
        assert row["model_id"] == "openrouter/anthropic/claude-3.5-sonnet"
        assert float(row["cost_usd"]) == 0.005400
