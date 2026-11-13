"""
Tests for ARGUS Research Missions, Opportunities, and Evidence API Endpoints.
Verifies Idempotency-Key compliance, duplicate replays, 409 conflict detection,
opportunity dossiers with epistemic facts vs hypotheses, and primary evidence inspection.
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from argus.main import app
from argus.core.security import create_dev_token

ADMIN_URL = "postgresql+asyncpg://postgres@/argus?host=/tmp"


@pytest.fixture
async def admin_engine():
    engine = create_async_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    yield engine
    await engine.dispose()


@pytest.fixture
async def test_tenant(admin_engine):
    org_id = uuid.uuid4()
    user_id = uuid.uuid4()

    async with admin_engine.connect() as conn:
        await conn.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, 'Test Org API', :slug)"),
            {"id": org_id, "slug": f"org-api-{org_id.hex[:6]}"}
        )
        await conn.execute(
            text(
                """
                INSERT INTO users (id, oidc_issuer, oidc_subject, email, full_name)
                VALUES (:user_id, 'https://auth.argus.internal', :sub, 'api.researcher@test.internal', 'Test Researcher')
                """
            ),
            {"user_id": user_id, "sub": f"sub-{user_id.hex[:8]}"}
        )
        await conn.execute(
            text(
                """
                INSERT INTO organization_memberships (id, org_id, user_id, role)
                VALUES (gen_random_uuid(), :org_id, :user_id, 'researcher')
                """
            ),
            {"org_id": org_id, "user_id": user_id}
        )

    token = create_dev_token(user_id=user_id, org_id=org_id, role="researcher")

    yield {"org_id": org_id, "user_id": user_id, "token": token}

    async with admin_engine.connect() as conn:
        await conn.execute(text("DELETE FROM organizations WHERE id = :id"), {"id": org_id})


@pytest.mark.asyncio
async def test_create_mission_idempotency_flow(test_tenant):
    """
    Verifies:
    1. First submission with Idempotency-Key returns 202 Accepted.
    2. Identical resubmission replays same mission without duplicating outbox rows.
    3. Resubmission with same Idempotency-Key but different payload returns 409 Conflict.
    """
    token = test_tenant["token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": "test-idem-key-001234",
    }
    payload_a = {
        "target_topic": "AI Inference Memory Disaggregation",
        "target_companies": ["vLLM", "SGLang"],
        "depth": "standard",
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. First submission
        res1 = await client.post("/research-missions", json=payload_a, headers=headers)
        assert res1.status_code == 202
        data1 = res1.json()
        assert "id" in data1
        mission_id = data1["id"]
        assert res1.headers.get("Location") == f"/api/v1/research-missions/{mission_id}"

        # 2. Resubmission with identical payload (Replay)
        res2 = await client.post("/research-missions", json=payload_a, headers=headers)
        assert res2.status_code == 202
        data2 = res2.json()
        assert data2["id"] == mission_id

        # 3. Resubmission with different payload (Conflict 409)
        payload_b = {
            "target_topic": "Completely Different Topic",
            "target_companies": ["OpenAI"],
            "depth": "exhaustive",
        }
        res3 = await client.post("/research-missions", json=payload_b, headers=headers)
        assert res3.status_code == 409
        err = res3.json()
        assert err["error_code"] == "IDEMPOTENCY_CONFLICT"


@pytest.mark.asyncio
async def test_full_pipeline_and_opportunity_api(test_tenant):
    """
    Verifies full lifecycle via API:
    1. Create research mission.
    2. Trigger real GitHub intelligence pipeline.
    3. Retrieve mission details and SSE events.
    4. Query discovered opportunities list.
    5. Query detailed opportunity dossier (epistemic split, scores, claims).
    6. Query primary evidence inspection endpoint for citation.
    """
    token = test_tenant["token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": "test-full-pipeline-run-12345",
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create Mission
        create_res = await client.post(
            "/research-missions",
            json={"target_topic": "vLLM KV Cache Optimizations", "depth": "standard"},
            headers=headers,
        )
        assert create_res.status_code == 202
        mission_id = create_res.json()["id"]

        # 2. Trigger pipeline execution
        pipe_res = await client.post(
            f"/research-missions/{mission_id}/run-github-pipeline",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert pipe_res.status_code == 200
        pipe_data = pipe_res.json()
        assert pipe_data["status"] == "completed"
        assert len(pipe_data["opportunities"]) == 2

        # 3. Check mission details
        detail_res = await client.get(
            f"/research-missions/{mission_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["status"] == "completed"
        assert detail["evidence_count"] >= 8
        assert detail["opportunities_count"] == 2

        # 4. Check opportunities list
        opps_res = await client.get(
            f"/opportunities?mission_id={mission_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert opps_res.status_code == 200
        opps_list = opps_res.json()
        assert len(opps_list) == 2
        opp_id = opps_list[0]["id"]
        assert opps_list[0]["scores"]["overall_priority"] >= 0.85

        # 5. Check opportunity dossier
        dossier_res = await client.get(
            f"/opportunities/{opp_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert dossier_res.status_code == 200
        dossier = dossier_res.json()
        assert dossier["id"] == opp_id
        assert len(dossier["gap_analysis"]) > 50
        assert len(dossier["claims"]) > 0

        # Verify claim and citation format
        claim0 = dossier["claims"][0]
        assert len(claim0["statement"]) > 10
        assert len(claim0["citations"]) > 0
        citation0 = claim0["citations"][0]
        assert citation0["citation_pill"].startswith("[EVID-")
        evidence_id = citation0["evidence_id"]

        # 6. Check primary evidence inspection
        ev_res = await client.get(
            f"/evidence/{evidence_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert ev_res.status_code == 200
        ev_data = ev_res.json()
        assert ev_data["id"] == evidence_id
        assert "github.com" in ev_data["source"]["canonical_url"]
        assert len(ev_data["source"]["content_hash"]) == 64
        assert len(ev_data["quote_text"]) > 10
        assert ev_data["offsets"]["start"] >= 0
        assert ev_data["offsets"]["end"] > ev_data["offsets"]["start"]

        # 7. Check SSE event stream
        sse_res = await client.get(
            f"/research-missions/{mission_id}/events",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert sse_res.status_code == 200
        assert "text/event-stream" in sse_res.headers.get("content-type", "")
        sse_text = sse_res.text
        assert "event: mission.started" in sse_text
        assert "event: evidence.extracted" in sse_text
        assert "event: mission.completed" in sse_text
