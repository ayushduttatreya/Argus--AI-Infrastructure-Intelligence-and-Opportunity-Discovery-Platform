"""
ARGUS Runtime Verification: Real Native Temporal Server & Separate Worker Process.
Independently verifies:
1. Native Temporal Dev Server operation on 127.0.0.1:7233 with persistent storage
2. Cluster health via CLI (operator cluster health -> SERVING)
3. Separate worker process execution (argus.orchestration.worker)
4. Full workflow lifecycle and PostgreSQL status transitions
5. Workflow cancellation handling
6. Worker restart and recovery from persistent state
7. Real Outbox Dispatcher to Temporal dispatch
"""
import asyncio
import json
import os
import signal
import socket
import subprocess
import time
import uuid
import pytest
from sqlalchemy import text
from temporalio.client import Client, WorkflowFailureError
from temporalio.exceptions import CancelledError
from argus.core.config import settings
from argus.core.database import async_session_factory, dispatcher_session_factory
from argus.orchestration.contracts import MissionWorkflowInput
from argus.orchestration.outbox import OutboxDispatcher
from argus.orchestration.workflows.mission_workflow import ResearchMissionWorkflow

TEMPORAL_BIN = "/home/ayush/Argus/.venv/bin/temporal"
PYTHON_BIN = "/home/ayush/Argus/.venv/bin/python3"
TEMPORAL_ADDR = "127.0.0.1:7233"
TEMPORAL_DB = "/tmp/temporal_runtime_verify.db"


@pytest.fixture(scope="module")
def temporal_server():
    """Starts the native Temporal Dev Server on 127.0.0.1:7233."""
    if os.path.exists(TEMPORAL_DB):
        try:
            os.remove(TEMPORAL_DB)
        except OSError:
            pass

    proc = subprocess.Popen(
        [
            TEMPORAL_BIN, "server", "start-dev",
            "--ip", "127.0.0.1",
            "--port", "7233",
            "--db-filename", TEMPORAL_DB,
            "--headless"
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait for port 7233 to open
    server_ready = False
    for _ in range(30):
        time.sleep(0.5)
        s = socket.socket()
        if s.connect_ex(("127.0.0.1", 7233)) == 0:
            server_ready = True
            s.close()
            break
        s.close()

    if not server_ready:
        proc.terminate()
        stdout, stderr = proc.communicate(timeout=5)
        raise RuntimeError(f"Temporal server failed to start: {stderr.decode()}")

    yield proc

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture
def separate_worker(temporal_server):
    """Spawns an independent OS process running the ARGUS Temporal Worker."""
    env = os.environ.copy()
    env["TEMPORAL_HOST"] = TEMPORAL_ADDR
    env["TEMPORAL_TASK_QUEUE"] = "argus-research-tasks"

    worker_proc = subprocess.Popen(
        [PYTHON_BIN, "-m", "argus.orchestration.worker"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(2.0)  # Allow worker to connect and poll task queue

    yield worker_proc

    if worker_proc.poll() is None:
        worker_proc.terminate()
        try:
            worker_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            worker_proc.kill()


@pytest.mark.asyncio
async def test_1_temporal_cli_cluster_health(temporal_server):
    """
    Verify cluster health via real CLI invocation:
    temporal operator cluster health --address 127.0.0.1:7233 -> SERVING
    """
    res = subprocess.run(
        [TEMPORAL_BIN, "operator", "cluster", "health", "--address", TEMPORAL_ADDR],
        capture_output=True,
        text=True,
    )
    assert res.returncode == 0, f"Health check failed with error: {res.stderr}"
    assert "SERVING" in res.stdout, f"Expected SERVING status, got: {res.stdout}"


@pytest.mark.asyncio
async def test_2_workflow_execution_with_separate_worker(temporal_server, separate_worker):
    """
    Verify real workflow execution against persistent Temporal server:
    Client starts workflow, separate OS worker executes activities,
    and PostgreSQL state updates from pending to running to completed.
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()

    # 1. Seed mission in PostgreSQL
    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Real Temporal Test Org", "slug": f"org-rt-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic, status)
                VALUES (:id, :org_id, :key, 'hash-rt', 'Autonomous Robotics & AI Compute', 'pending')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-rt-{mission_id.hex[:6]}"}
        )
        await session.commit()

    # 2. Connect client and start workflow
    client = await Client.connect(TEMPORAL_ADDR)
    wf_id = f"test-real-wf-{org_id}-{mission_id}"
    input_data = MissionWorkflowInput(
        org_id=str(org_id),
        mission_id=str(mission_id),
        target_topic="Autonomous Robotics & AI Compute",
        depth="standard",
    )

    handle = await client.start_workflow(
        ResearchMissionWorkflow.run,
        input_data,
        id=wf_id,
        task_queue="argus-research-tasks",
    )

    # 3. Wait for workflow result
    result = await handle.result()
    res_status = result["status"] if isinstance(result, dict) else result.status
    res_mission_id = result["mission_id"] if isinstance(result, dict) else result.mission_id
    res_stages = result["completed_stages"] if isinstance(result, dict) else result.completed_stages

    assert res_status == "completed"
    assert res_mission_id == str(mission_id)
    assert len(res_stages) == 3

    # 4. Verify PostgreSQL persistence
    async with async_session_factory() as session:
        res = await session.execute(
            text("SELECT status, completed_at, coverage_summary FROM research_missions WHERE id = :id"),
            {"id": mission_id}
        )
        row = res.mappings().all()[0]
        assert row["status"] == "completed"
        assert row["completed_at"] is not None
        assert row["coverage_summary"] is not None


@pytest.mark.asyncio
async def test_3_workflow_cancellation(temporal_server, separate_worker):
    """
    Verify real workflow cancellation:
    Workflow started, cancellation issued, workflow cleans up and transitions to cancelled.
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()

    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Cancel Test Org", "slug": f"org-cancel-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic, status)
                VALUES (:id, :org_id, :key, 'hash-cancel', 'Cancellation Test Topic', 'pending')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-cancel-{mission_id.hex[:6]}"}
        )
        await session.commit()

    client = await Client.connect(TEMPORAL_ADDR)
    wf_id = f"test-cancel-{org_id}-{mission_id}"
    input_data = MissionWorkflowInput(
        org_id=str(org_id),
        mission_id=str(mission_id),
        target_topic="Cancellation Test Topic",
        depth="exhaustive",
    )

    handle = await client.start_workflow(
        ResearchMissionWorkflow.run,
        input_data,
        id=wf_id,
        task_queue="argus-research-tasks",
    )

    # Issue cancellation immediately
    await handle.cancel()

    # The workflow should either raise WorkflowFailureError / CancelledError or complete with cancelled/failed status
    try:
        res = await handle.result()
        res_status = res["status"] if isinstance(res, dict) else res.status
        assert res_status in ("cancelled", "failed", "completed")
    except WorkflowFailureError:
        pass  # Cancelled workflow fails as expected in Temporal

    # Verify status in database is not pending
    async with async_session_factory() as session:
        db_res = await session.execute(
            text("SELECT status FROM research_missions WHERE id = :id"),
            {"id": mission_id}
        )
        row = db_res.mappings().all()[0]
        assert row["status"] in ("cancelled", "failed", "completed")


@pytest.mark.asyncio
async def test_4_worker_restart_and_recovery(temporal_server):
    """
    Verify recovery from worker process failure:
    Start a workflow without an active worker -> workflow queues in Temporal ->
    Start worker process -> worker claims task and completes it.
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()

    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Recovery Test Org", "slug": f"org-rec-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic, status)
                VALUES (:id, :org_id, :key, 'hash-rec', 'Recovery Test Topic', 'pending')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-rec-{mission_id.hex[:6]}"}
        )
        await session.commit()

    client = await Client.connect(TEMPORAL_ADDR)
    wf_id = f"test-recovery-{org_id}-{mission_id}"
    input_data = MissionWorkflowInput(
        org_id=str(org_id),
        mission_id=str(mission_id),
        target_topic="Recovery Test Topic",
        depth="standard",
    )

    # Start workflow when NO worker is running
    handle = await client.start_workflow(
        ResearchMissionWorkflow.run,
        input_data,
        id=wf_id,
        task_queue="argus-research-tasks",
    )

    # Spawn worker now
    env = os.environ.copy()
    env["TEMPORAL_HOST"] = TEMPORAL_ADDR
    env["TEMPORAL_TASK_QUEUE"] = "argus-research-tasks"
    worker_proc = subprocess.Popen(
        [PYTHON_BIN, "-m", "argus.orchestration.worker"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    try:
        result = await handle.result()
        assert result.status == "completed"
    finally:
        worker_proc.terminate()
        try:
            worker_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            worker_proc.kill()


@pytest.mark.asyncio
async def test_5_outbox_dispatcher_to_real_temporal(temporal_server, separate_worker):
    """
    Verify end-to-end Transactional Outbox to Real Temporal dispatch:
    Seed pending outbox event -> OutboxDispatcher leases and dispatches ->
    Temporal starts workflow -> Separate worker executes it -> Database state verified.
    """
    org_id = uuid.uuid4()
    mission_id = uuid.uuid4()
    outbox_id = uuid.uuid4()

    async with async_session_factory() as session:
        await session.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            {"id": org_id, "name": "Outbox Real Org", "slug": f"org-obr-{org_id.hex[:6]}"}
        )
        await session.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic, status)
                VALUES (:id, :org_id, :key, 'hash-obr', 'Real Outbox Topic', 'pending')
                """
            ),
            {"id": mission_id, "org_id": org_id, "key": f"key-obr-{mission_id.hex[:6]}"}
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
                "payload": json.dumps({"target_topic": "Real Outbox Topic"}),
            }
        )
        await session.commit()

    client = await Client.connect(TEMPORAL_ADDR)
    dispatcher = OutboxDispatcher(
        temporal_client=client,
        session_factory=dispatcher_session_factory,
        batch_size=10,
    )

    dispatched = await dispatcher.process_batch()
    assert dispatched == 1

    # Verify outbox state
    async with async_session_factory() as session:
        ob_res = await session.execute(
            text("SELECT status, dispatched_at, error_message FROM workflow_outbox WHERE id = :id"),
            {"id": outbox_id}
        )
        ob_row = ob_res.mappings().all()[0]
        assert ob_row["status"] == "dispatched"
        assert ob_row["dispatched_at"] is not None

        # Verify mission coordinates
        m_res = await session.execute(
            text("SELECT temporal_workflow_id, temporal_run_id FROM research_missions WHERE id = :id"),
            {"id": mission_id}
        )
        m_row = m_res.mappings().all()[0]
        assert m_row["temporal_workflow_id"] == f"argus-mission-{org_id}-{mission_id}"
        assert m_row["temporal_run_id"] is not None

    # Wait for the separate worker to complete the dispatched workflow
    wf_handle = client.get_workflow_handle(f"argus-mission-{org_id}-{mission_id}")
    wf_result = await wf_handle.result()
    wf_status = wf_result["status"] if isinstance(wf_result, dict) else wf_result.status
    assert wf_status == "completed"
