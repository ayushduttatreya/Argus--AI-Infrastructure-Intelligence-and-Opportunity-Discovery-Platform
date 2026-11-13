"""
Integration tests for ARGUS Transactional Outbox Dispatcher.
Validates SELECT FOR UPDATE SKIP LOCKED concurrency protection,
idempotent dispatch to Temporal, and retry tracking.
"""
import json
import uuid
import pytest
from sqlalchemy import text
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker
from argus.core.database import async_session_factory
from argus.orchestration.outbox import OutboxDispatcher
from argus.orchestration.workflows.mission_workflow import ResearchMissionWorkflow
from argus.orchestration.activities.mission_activities import (
    load_mission_activity,
    execute_stage_activity,
    finalize_mission_activity,
)


@pytest.fixture
async def temporal_env():
    env = await WorkflowEnvironment.start_time_skipping()
    yield env
    await env.shutdown()


@pytest.mark.asyncio
async def test_outbox_dispatch_success(temporal_env):
    """
    Verify pending outbox events are leased, dispatched to Temporal,
    and transitioned to 'dispatched' with workflow IDs persisted in research_missions.
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()
    outbox_id = uuid.uuid4()

    # 1. Seed database
    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Outbox Test Org", "slug": f"org-ob-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
                VALUES (:id, :org_id, :key, 'hash-ob', 'Quantum Machine Learning Infrastructure')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-ob-{mission_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO workflow_outbox (id, org_id, mission_id, workflow_type, payload, status)
                VALUES (:id, :org_id, :mission_id, 'ResearchMissionWorkflow', :payload, 'pending')
                """
            ),
            {
                "id": outbox_id,
                "org_id": org_id,
                "mission_id": mission_id,
                "payload": json.dumps({"target_topic": "Quantum Machine Learning Infrastructure"}),
            }
        )
        await session.commit()

    # 2. Dispatch batch
    dispatcher = OutboxDispatcher(temporal_client=temporal_env.client, batch_size=10)
    dispatched = await dispatcher.process_batch()
    assert dispatched == 1

    # 3. Verify PostgreSQL outbox state
    async with async_session_factory() as session:
        res = await session.execute(
            text("SELECT status, dispatched_at, error_message FROM workflow_outbox WHERE id = :id"),
            {"id": outbox_id}
        )
        row = res.mappings().all()[0]
        assert row["status"] == "dispatched"
        assert row["dispatched_at"] is not None
        assert row["error_message"] is None

        # Verify mission updated with Temporal coordinates
        m_res = await session.execute(
            text("SELECT temporal_workflow_id, temporal_run_id FROM research_missions WHERE id = :id"),
            {"id": mission_id}
        )
        m_row = m_res.mappings().all()[0]
        assert m_row["temporal_workflow_id"] == f"argus-mission-{org_id}-{mission_id}"
        assert m_row["temporal_run_id"] is not None


@pytest.mark.asyncio
async def test_outbox_skip_locked_prevents_concurrent_processing(temporal_env):
    """
    Verify that two concurrent transactions using SELECT FOR UPDATE SKIP LOCKED
    never lease or process the same pending record.
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()
    outbox_id = uuid.uuid4()

    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Lock Test Org", "slug": f"org-lock-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
                VALUES (:id, :org_id, :key, 'hash-lock', 'Concurrent Locking')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-lock-{mission_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO workflow_outbox (id, org_id, mission_id, workflow_type, payload, status)
                VALUES (:id, :org_id, :mission_id, 'ResearchMissionWorkflow', '{}'::jsonb, 'pending')
                """
            ),
            {"id": outbox_id, "org_id": org_id, "mission_id": mission_id}
        )
        await session.commit()

    # Session 1 leases the record with FOR UPDATE
    async with async_session_factory() as session1:
        await session1.execute(text("SET LOCAL app.is_dispatcher = 'true'"))
        select_sql = text(
            """
            SELECT id FROM workflow_outbox
            WHERE id = :id FOR UPDATE SKIP LOCKED
            """
        )
        res1 = await session1.execute(select_sql, {"id": outbox_id})
        leased1 = res1.mappings().all()
        assert len(leased1) == 1, "Session 1 must acquire the lock"

        # Session 2 tries to lease the same record while Session 1 holds the lock
        async with async_session_factory() as session2:
            await session2.execute(text("SET LOCAL app.is_dispatcher = 'true'"))
            res2 = await session2.execute(select_sql, {"id": outbox_id})
            leased2 = res2.mappings().all()
            # SKIP LOCKED guarantees Session 2 skips the locked record and receives 0 rows
            assert len(leased2) == 0, "Session 2 must skip the locked record!"

        # Commit Session 1
        await session1.commit()


@pytest.mark.asyncio
async def test_outbox_failed_dispatch_retries_with_backoff():
    """
    Verify that when dispatch fails, retry_count increments,
    error_message is captured, and terminal failure occurs after max_retries.
    """
    from unittest.mock import AsyncMock

    mock_client = AsyncMock()
    mock_client.start_workflow.side_effect = RuntimeError("Simulated Temporal connection drop")

    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()
    outbox_id = uuid.uuid4()

    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Retry Test Org", "slug": f"org-ret-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
                VALUES (:id, :org_id, :key, 'hash-ret', 'Retry Backoff Topic')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-ret-{mission_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO workflow_outbox (id, org_id, mission_id, workflow_type, payload, status, retry_count)
                VALUES (:id, :org_id, :mission_id, 'ResearchMissionWorkflow', '{}'::jsonb, 'pending', 0)
                """
            ),
            {"id": outbox_id, "org_id": org_id, "mission_id": mission_id}
        )
        await session.commit()

    dispatcher = OutboxDispatcher(temporal_client=mock_client, batch_size=10, max_retries=2)

    # First attempt: retry_count goes to 1, status remains 'pending'
    await dispatcher.process_batch()

    async with async_session_factory() as session:
        res = await session.execute(
            text("SELECT status, retry_count, error_message FROM workflow_outbox WHERE id = :id"),
            {"id": outbox_id}
        )
        row = res.mappings().all()[0]
        assert row["status"] == "pending"
        assert row["retry_count"] == 1
        assert "Simulated Temporal connection drop" in row["error_message"]

    # Second attempt: reaches max_retries=2, status transitions to 'failed'
    await dispatcher.process_batch()

    async with async_session_factory() as session:
        res = await session.execute(
            text("SELECT status, retry_count FROM workflow_outbox WHERE id = :id"),
            {"id": outbox_id}
        )
        row = res.mappings().all()[0]
        assert row["status"] == "failed"
        assert row["retry_count"] == 2
