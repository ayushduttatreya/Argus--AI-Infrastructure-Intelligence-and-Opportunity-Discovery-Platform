"""
Temporal Activity implementations for ARGUS Mission Orchestration.
All external I/O, database persistence, and external service calls live here.
Activities enforce transaction-local tenant context (PostgreSQL RLS).
"""
import asyncio
import json
import uuid
from typing import Any
from sqlalchemy import text
from temporalio import activity
from argus.core.database import async_session_factory, set_tenant_context
from argus.core.logging import logger
from argus.orchestration.contracts import MissionWorkflowInput


class NonRetryableMissionError(Exception):
    """Raised when a mission cannot be recovered (e.g. mission not found)."""
    pass


@activity.defn
async def load_mission_activity(input_data: MissionWorkflowInput) -> dict[str, Any]:
    """
    Validates the mission exists under the tenant context, updates status to 'running',
    and emits a mission_started event.
    """
    activity.heartbeat("Connecting to database...")
    org_uuid = uuid.UUID(input_data.org_id)
    mission_uuid = uuid.UUID(input_data.mission_id)

    async with async_session_factory() as session:
        async with session.begin():
            await set_tenant_context(session, org_uuid)

            # 1. Fetch mission
            query = text(
                """
                SELECT id, target_topic, depth, status
                FROM research_missions
                WHERE id = :mission_id AND org_id = :org_id
                FOR UPDATE
                """
            )
            result = await session.execute(query, {"mission_id": mission_uuid, "org_id": org_uuid})
            mission = result.mappings().first()

            if not mission:
                raise NonRetryableMissionError(
                    f"Mission {input_data.mission_id} not found for org {input_data.org_id}"
                )

            current_status = mission["status"]
            if current_status in ("completed", "cancelled"):
                raise NonRetryableMissionError(
                    f"Mission {input_data.mission_id} already in terminal state: {current_status}"
                )

            # 2. Transition status to running
            update_query = text(
                """
                UPDATE research_missions
                SET status = 'running', updated_at = CURRENT_TIMESTAMP
                WHERE id = :mission_id AND org_id = :org_id
                """
            )
            await session.execute(update_query, {"mission_id": mission_uuid, "org_id": org_uuid})

            # 3. Emit mission_events audit record
            event_query = text(
                """
                INSERT INTO mission_events (org_id, mission_id, event_type, status, payload)
                VALUES (:org_id, :mission_id, 'mission_started', 'running', :payload)
                """
            )
            await session.execute(
                event_query,
                {
                    "org_id": org_uuid,
                    "mission_id": mission_uuid,
                    "payload": json.dumps({"target_topic": mission["target_topic"], "depth": mission["depth"]})
                }
            )

    logger.info(f"Loaded mission {mission_uuid} for org {org_uuid} into running state.")
    return {
        "mission_id": str(mission["id"]),
        "target_topic": mission["target_topic"],
        "depth": mission["depth"],
    }


@activity.defn
async def execute_stage_activity(stage_name: str, org_id: str, mission_id: str) -> dict[str, Any]:
    """
    Executes a bounded research stage with heartbeat progress updates
    and persists stage completion in mission_events.
    """
    org_uuid = uuid.UUID(org_id)
    mission_uuid = uuid.UUID(mission_id)

    activity.heartbeat(f"Starting stage {stage_name}")
    # Small async yield representing bounded activity work
    await asyncio.sleep(0.05)
    activity.heartbeat(f"Finishing stage {stage_name}")

    async with async_session_factory() as session:
        async with session.begin():
            await set_tenant_context(session, org_uuid)

            event_query = text(
                """
                INSERT INTO mission_events (org_id, mission_id, event_type, status, payload)
                VALUES (:org_id, :mission_id, :event_type, 'completed', :payload)
                """
            )
            await session.execute(
                event_query,
                {
                    "org_id": org_uuid,
                    "mission_id": mission_uuid,
                    "event_type": f"stage_{stage_name}_completed",
                    "payload": json.dumps({"stage": stage_name, "status": "success"})
                }
            )

    logger.info(f"Stage {stage_name} completed for mission {mission_uuid}")
    return {"stage": stage_name, "status": "completed"}


@activity.defn
async def finalize_mission_activity(
    org_id: str,
    mission_id: str,
    status: str,
    error_message: str | None = None
) -> None:
    """
    Finalizes the research mission record (completed, failed, or cancelled)
    and logs the terminal audit event.
    """
    org_uuid = uuid.UUID(org_id)
    mission_uuid = uuid.UUID(mission_id)

    async with async_session_factory() as session:
        async with session.begin():
            await set_tenant_context(session, org_uuid)

            # Update mission terminal status
            update_query = text(
                """
                UPDATE research_missions
                SET status = :status,
                    completed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :mission_id AND org_id = :org_id
                """
            )
            await session.execute(
                update_query,
                {
                    "status": status,
                    "mission_id": mission_uuid,
                    "org_id": org_uuid
                }
            )

            # Emit terminal audit event
            event_status = status if status in ("pending", "running", "completed", "partial", "failed", "skipped") else None
            event_query = text(
                """
                INSERT INTO mission_events (org_id, mission_id, event_type, status, payload)
                VALUES (:org_id, :mission_id, :event_type, :status, :payload)
                """
            )
            await session.execute(
                event_query,
                {
                    "org_id": org_uuid,
                    "mission_id": mission_uuid,
                    "event_type": f"mission_{status}",
                    "status": event_status,
                    "payload": json.dumps({"error": error_message} if error_message else {})
                }
            )

    logger.info(f"Finalized mission {mission_uuid} with status '{status}'")
