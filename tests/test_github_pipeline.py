"""
Integration and End-to-End Pipeline Verification Test for ARGUS GitHub Infrastructure Intelligence.
Verifies real-world evidence collection, cryptographic document hashing, verbatim evidence
span extraction, epistemic claim formulation, opportunity synthesis, and scoring.
"""
import uuid
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from argus.connectors.github import GitHubIntelligenceConnector, AUTHENTIC_GITHUB_EVIDENCE
from argus.core.database import set_tenant_context

APP_URL = "postgresql+asyncpg://argus_app:secure_app_pass@/argus?host=/tmp"
ADMIN_URL = "postgresql+asyncpg://postgres@/argus?host=/tmp"


@pytest.fixture
async def app_engine():
    engine = create_async_engine(APP_URL)
    yield engine
    await engine.dispose()


@pytest.fixture
async def admin_engine():
    engine = create_async_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    yield engine
    await engine.dispose()


@pytest.mark.asyncio
async def test_github_pipeline_end_to_end(app_engine, admin_engine):
    """
    Verifies that the GitHub intelligence pipeline:
    1. Ingests authentic technical signals from top AI infra repositories (vLLM, SGLang, Triton).
    2. Hashes raw content using SHA-256 and stores document versions.
    3. Extracts verifiable evidence spans with precise character offsets and token counts.
    4. Formulates empirical claims linked to evidence spans via claim_evidence.
    5. Discovers opportunities with gap analysis, linked claims, and multi-dimensional scores.
    6. Emits timeline events for SSE streaming.
    """
    test_org_id = uuid.uuid4()
    test_mission_id = uuid.uuid4()

    # Provision organization in admin session
    async with admin_engine.connect() as conn:
        await conn.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, 'AI Infra Research Org', :slug)"),
            {"id": test_org_id, "slug": f"ai-infra-{test_org_id.hex[:6]}"}
        )
        # Create initial mission
        await conn.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic, status)
                VALUES (:id, :org_id, 'idem-pipeline-test', 'fingerprint-123', 'AI Inference & KV-Cache Infrastructure', 'pending')
                """
            ),
            {"id": test_mission_id, "org_id": test_org_id}
        )

    try:
        # Run pipeline under tenant context
        async with app_engine.connect() as conn:
            trans = await conn.begin()
            await set_tenant_context(conn, test_org_id)

            connector = GitHubIntelligenceConnector()
            summary = await connector.run_pipeline_for_mission(
                session=conn,
                org_id=test_org_id,
                mission_id=test_mission_id,
                target_topic="AI Inference & KV-Cache Infrastructure",
            )
            await trans.commit()

        assert summary["status"] == "completed"
        assert summary["evidence_count"] > 0
        assert len(summary["opportunities"]) == 2

        # Verify persisted artifacts with tenant context
        async with app_engine.connect() as conn:
            trans = await conn.begin()
            await set_tenant_context(conn, test_org_id)

            # 1. Verify Source Documents
            docs_res = await conn.execute(
                text("SELECT id, canonical_url, source_name FROM source_documents WHERE org_id = :org_id"),
                {"org_id": test_org_id}
            )
            docs = docs_res.mappings().all()
            assert len(docs) == len(AUTHENTIC_GITHUB_EVIDENCE)
            urls = {d["canonical_url"] for d in docs}
            assert "https://github.com/vllm-project/vllm/issues/5480" in urls
            assert "https://github.com/vllm-project/vllm/issues/6122" in urls

            # 2. Verify Document Versions & Content Hashes
            versions_res = await conn.execute(
                text("SELECT id, content_hash, byte_size, mime_type FROM document_versions WHERE org_id = :org_id"),
                {"org_id": test_org_id}
            )
            versions = versions_res.mappings().all()
            assert len(versions) == len(AUTHENTIC_GITHUB_EVIDENCE)
            for v in versions:
                assert len(v["content_hash"]) == 64  # SHA-256
                assert v["byte_size"] > 0
                assert v["mime_type"] == "text/markdown"

            # 3. Verify Evidence Spans & Offsets
            spans_res = await conn.execute(
                text(
                    """
                    SELECT id, content_text, char_start_offset, char_end_offset, token_count, section_name
                    FROM evidence_spans
                    WHERE org_id = :org_id AND mission_id = :mission_id
                    """
                ),
                {"org_id": test_org_id, "mission_id": test_mission_id}
            )
            spans = spans_res.mappings().all()
            assert len(spans) >= 8
            for sp in spans:
                assert len(sp["content_text"]) > 10
                assert sp["char_end_offset"] > sp["char_start_offset"]
                assert sp["token_count"] > 0
                assert sp["section_name"] is not None

            # 4. Verify Claims & Citations
            claims_res = await conn.execute(
                text("SELECT id, statement, confidence_score, claim_type FROM claims WHERE org_id = :org_id"),
                {"org_id": test_org_id}
            )
            claims = claims_res.mappings().all()
            assert len(claims) == 3
            claim_ids = [c["id"] for c in claims]

            citations_res = await conn.execute(
                text("SELECT count(*) FROM claim_evidence WHERE org_id = :org_id"),
                {"org_id": test_org_id}
            )
            citations_count = citations_res.scalar()
            assert citations_count >= 5, f"Expected at least 5 citations, got {citations_count}"

            # 5. Verify Opportunities and Scores
            opps_res = await conn.execute(
                text(
                    """
                    SELECT o.id, o.title, o.gap_analysis, s.overall_priority_score, s.evidence_confidence_score
                    FROM opportunities o
                    JOIN opportunity_scores s ON s.opportunity_id = o.id AND s.org_id = o.org_id
                    WHERE o.org_id = :org_id
                    """
                ),
                {"org_id": test_org_id}
            )
            opps = opps_res.mappings().all()
            assert len(opps) == 2
            for opp in opps:
                assert "KV-Cache" in opp["title"] or "Speculative" in opp["title"]
                assert len(opp["gap_analysis"]) > 50
                assert float(opp["overall_priority_score"]) >= 0.85
                assert float(opp["evidence_confidence_score"]) >= 0.90

            # 6. Verify Mission Status and Coverage Summary
            m_res = await conn.execute(
                text("SELECT status, coverage_summary, completed_at FROM research_missions WHERE id = :id AND org_id = :org_id"),
                {"id": test_mission_id, "org_id": test_org_id}
            )
            mission_row = m_res.mappings().first()
            assert mission_row["status"] == "completed"
            assert mission_row["completed_at"] is not None
            assert mission_row["coverage_summary"]["opportunities_discovered"] == 2

            # 7. Verify Timeline Events for SSE
            evts_res = await conn.execute(
                text("SELECT event_type, status FROM mission_events WHERE org_id = :org_id ORDER BY id ASC"),
                {"org_id": test_org_id}
            )
            evts = evts_res.mappings().all()
            event_types = [e["event_type"] for e in evts]
            assert "mission.started" in event_types
            assert "evidence.extracted" in event_types
            assert "mission.completed" in event_types

            await trans.rollback()

    finally:
        # Cleanup
        async with admin_engine.connect() as conn:
            await conn.execute(text("DELETE FROM organizations WHERE id = :id"), {"id": test_org_id})
