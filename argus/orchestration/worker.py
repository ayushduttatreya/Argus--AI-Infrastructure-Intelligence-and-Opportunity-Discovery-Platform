"""
Temporal Worker Runner for ARGUS Research Missions.
Configures bounded activity and workflow execution concurrency.
"""
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from argus.core.config import settings
from argus.core.logging import logger
from argus.orchestration.activities.mission_activities import (
    load_mission_activity,
    execute_stage_activity,
    finalize_mission_activity,
)
from argus.orchestration.workflows.mission_workflow import ResearchMissionWorkflow


def create_mission_worker(client: Client) -> Worker:
    """
    Constructs a Temporal Worker with bounded concurrency settings.
    """
    return Worker(
        client,
        task_queue=settings.TEMPORAL_TASK_QUEUE,
        workflows=[ResearchMissionWorkflow],
        activities=[
            load_mission_activity,
            execute_stage_activity,
            finalize_mission_activity,
        ],
        max_concurrent_activities=10,
        max_concurrent_workflow_tasks=10,
    )


async def run_worker(client: Client | None = None) -> None:
    """
    Runs the worker until interrupted.
    """
    from argus.orchestration.client import get_temporal_client
    cli = client or await get_temporal_client()
    worker = create_mission_worker(cli)
    logger.info(f"Starting ARGUS Mission Worker on task queue: '{settings.TEMPORAL_TASK_QUEUE}'")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(run_worker())
