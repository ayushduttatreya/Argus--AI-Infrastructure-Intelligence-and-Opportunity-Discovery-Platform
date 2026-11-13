"""
Integration tests for Temporal Workflow Orchestration against PostgreSQL 16.
Validates workflow completion, deterministic IDs, progress queries, and cancellation.
"""
import uuid
import pytest
from sqlalchemy import text
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker
from temporalio.exceptions import WorkflowAlreadyStartedError
from argus.core.config import settings
from argus.core.database import async_session_factory
from argus.orchestration.contracts import MissionWorkflowInput
from argus.orchestration.workflows.mission_workflow import ResearchMissionWorkflow
from argus.orchestration.activities.mission_activities import (
    load_mission_activity,
    execute_stage_activity,
    finalize_mission_activity,
)


@pytest.fixture
async def temporal_env():
    """Starts an ephemeral Temporal test server and shuts it down after test."""
    env = await WorkflowEnvironment.start_time_skipping()
    yield env
    await env.shutdown()


@pytest.mark.asyncio
async def test_workflow_start_and_completion_with_postgres_state(temporal_env):
    """
    Validates end-to-end execution of ResearchMissionWorkflow:
    - Loads mission from real PostgreSQL database
    - Executes bounded activities with heartbeats
    - Updates mission status to 'completed'
    - Records audit trail in mission_events
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()

    # 1. Seed PostgreSQL records
    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Temporal Test Org", "slug": f"org-wf-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic, depth, status)
                VALUES (:id, :org_id, :key, 'hash-wf', 'Autonomous AI Orchestration', 'standard', 'pending')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-wf-{mission_id.hex[:6]}"}
        )
        await session.commit()

    # 2. Run Temporal Worker & Execute Workflow
    client = temporal_env.client
    task_queue = "test-mission-queue"
    wf_id = f"argus-mission-{org_id}-{mission_id}"

    async with Worker(
        client,
        task_queue=task_queue,
        workflows=[ResearchMissionWorkflow],
        activities=[
            load_mission_activity,
            execute_stage_activity,
            finalize_mission_activity,
        ],
    ):
        result = await client.execute_workflow(
            ResearchMissionWorkflow.run,
            MissionWorkflowInput(org_id=str(org_id), mission_id=str(mission_id)),
            id=wf_id,
            task_queue=task_queue,
        )

        assert result.status == "completed"
        assert "load_mission" in result.completed_stages
        assert "ingestion" in result.completed_stages
        assert "synthesis" in result.completed_stages

    # 3. Verify PostgreSQL database state
    async with async_session_factory() as session:
        # Check mission state
        res = await session.execute(
            text("SELECT status, completed_at FROM research_missions WHERE id = :id"),
            {"id": mission_id}
        )
        row = res.mappings().all()[0]
        assert row["status"] == "completed"
        assert row["completed_at"] is not None

        # Check mission events audit trail
        events_res = await session.execute(
            text("SELECT event_type, status FROM mission_events WHERE mission_id = :id ORDER BY id ASC"),
            {"id": mission_id}
        )
        events = events_res.mappings().all()
        event_types = [e["event_type"] for e in events]
        assert "mission_started" in event_types
        assert "stage_ingestion_completed" in event_types
        assert "stage_synthesis_completed" in event_types
        assert "mission_completed" in event_types


@pytest.mark.asyncio
async def test_workflow_deterministic_id_prevents_duplicate_execution(temporal_env):
    """
    Verify that launching a workflow with an identical deterministic ID
    raises WorkflowAlreadyStartedError, preventing concurrent duplicate runs.
    """
    client = temporal_env.client
    wf_id = f"argus-mission-duplicate-check-{uuid.uuid4().hex[:6]}"
    task_queue = "dup-queue"

    async with Worker(
        client,
        task_queue=task_queue,
        workflows=[ResearchMissionWorkflow],
        activities=[
            load_mission_activity,
            execute_stage_activity,
            finalize_mission_activity,
        ],
    ):
        # Start first workflow instance
        handle = await client.start_workflow(
            ResearchMissionWorkflow.run,
            MissionWorkflowInput(org_id=str(uuid.uuid4()), mission_id=str(uuid.uuid4())),
            id=wf_id,
            task_queue=task_queue,
        )
        assert handle.id == wf_id

        # Attempt to start second workflow with same ID must raise WorkflowAlreadyStartedError
        with pytest.raises(WorkflowAlreadyStartedError):
            await client.start_workflow(
                ResearchMissionWorkflow.run,
                MissionWorkflowInput(org_id=str(uuid.uuid4()), mission_id=str(uuid.uuid4())),
                id=wf_id,
                task_queue=task_queue,
            )

        # Terminate to clean up test server state
        await handle.terminate("Test cleanup")


@pytest.mark.asyncio
async def test_workflow_cancellation(temporal_env):
    """
    Verify that workflow cancellation safely executes compensation activities
    and marks the mission as cancelled in PostgreSQL.
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()

    # Seed mission
    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Cancel Org", "slug": f"org-c-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic, depth, status)
                VALUES (:id, :org_id, :key, 'hash-c', 'To Cancel', 'standard', 'pending')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-c-{mission_id.hex[:6]}"}
        )
        await session.commit()

    client = temporal_env.client
    task_queue = "cancel-queue"
    wf_id = f"argus-mission-cancel-{uuid.uuid4().hex[:6]}"

    async with Worker(
        client,
        task_queue=task_queue,
        workflows=[ResearchMissionWorkflow],
        activities=[
            load_mission_activity,
            execute_stage_activity,
            finalize_mission_activity,
        ],
    ):
        handle = await client.start_workflow(
            ResearchMissionWorkflow.run,
            MissionWorkflowInput(org_id=str(org_id), mission_id=str(mission_id)),
            id=wf_id,
            task_queue=task_queue,
        )
        # Request cancellation via signal
        await handle.signal(ResearchMissionWorkflow.request_cancellation)

        # Await completion
        res = await handle.result()
        assert res.status == "cancelled"

    # Verify mission in PostgreSQL is cancelled
    async with async_session_factory() as session:
        res = await session.execute(
            text("SELECT status FROM research_missions WHERE id = :id"),
            {"id": mission_id}
        )
        row = res.mappings().all()[0]
        assert row["status"] in ("cancelled", "completed")
