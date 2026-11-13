"""
Transactional Outbox Dispatcher for ARGUS.
Reads pending mission events using SELECT FOR UPDATE SKIP LOCKED and
dispatches them idempotently to Temporal.
Handles WorkflowAlreadyStartedError and tracks attempt retries.
"""
import asyncio
import uuid
from typing import Any
from sqlalchemy import text
from temporalio.client import Client
from temporalio.exceptions import WorkflowAlreadyStartedError
from argus.core.config import settings
from argus.core.database import dispatcher_session_factory
from argus.core.logging import logger
from argus.orchestration.contracts import MissionWorkflowInput
from argus.orchestration.workflows.mission_workflow import ResearchMissionWorkflow


class OutboxDispatcher:
    """
    Reliable, at-least-once transactional outbox dispatcher.
    """

    def __init__(
        self,
        temporal_client: Client,
        session_factory=None,
        batch_size: int = 10,
        max_retries: int = 5,
        poll_interval_seconds: float = 1.0,
    ) -> None:
        self.temporal_client = temporal_client
        self.session_factory = session_factory or dispatcher_session_factory
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.poll_interval = poll_interval_seconds
        self._running = False

    async def dispatch_single_event(
        self,
        event: dict[str, Any],
        session,
    ) -> bool:
        """
        Dispatches a single outbox record to Temporal with deterministic workflow ID.
        Updates outbox and research_missions state in the given transaction.
        """
        outbox_id = event["id"]
        org_id = event["org_id"]
        mission_id = event["mission_id"]
        workflow_type = event["workflow_type"]
        retry_count = event["retry_count"]

        deterministic_wf_id = f"argus-mission-{org_id}-{mission_id}"
        input_data = MissionWorkflowInput(
            org_id=str(org_id),
            mission_id=str(mission_id),
            target_topic=event["payload"].get("target_topic", ""),
            depth=event["payload"].get("depth", "standard"),
        )

        run_id = None
        try:
            # Idempotent start: handles both fresh starts and duplicate calls
            handle = await self.temporal_client.start_workflow(
                ResearchMissionWorkflow.run,
                input_data,
                id=deterministic_wf_id,
                task_queue=settings.TEMPORAL_TASK_QUEUE,
            )
            run_id = handle.first_execution_run_id
            logger.info(
                f"Dispatched outbox {outbox_id} to Temporal workflow {deterministic_wf_id} (run_id: {run_id})"
            )

        except WorkflowAlreadyStartedError:
            # Duplicate start protection: workflow already active or finished
            logger.warning(
                f"Temporal workflow {deterministic_wf_id} already started. Attaching to existing workflow."
            )
            handle = self.temporal_client.get_workflow_handle(deterministic_wf_id)
            desc = await handle.describe()
            run_id = desc.run_id

        except Exception as exc:
            # Dispatch attempt failed
            new_retries = retry_count + 1
            error_msg = f"{type(exc).__name__}: {str(exc)}"
            new_status = "failed" if new_retries >= self.max_retries else "pending"

            logger.error(
                f"Outbox {outbox_id} dispatch attempt {new_retries} failed: {error_msg}. Status: {new_status}"
            )
            update_sql = text(
                """
                UPDATE workflow_outbox
                SET retry_count = :retries,
                    last_attempt_at = CURRENT_TIMESTAMP,
                    error_message = :err,
                    status = :status
                WHERE id = :id
                """
            )
            await session.execute(
                update_sql,
                {"retries": new_retries, "err": error_msg, "status": new_status, "id": outbox_id}
            )
            return False

        # On successful dispatch
        # 1. Update outbox record to 'dispatched'
        update_outbox_sql = text(
            """
            UPDATE workflow_outbox
            SET status = 'dispatched',
                dispatched_at = CURRENT_TIMESTAMP,
                last_attempt_at = CURRENT_TIMESTAMP,
                error_message = NULL
            WHERE id = :id
            """
        )
        await session.execute(update_outbox_sql, {"id": outbox_id})

        # 2. Update research_missions with workflow coordinates
        update_mission_sql = text(
            """
            UPDATE research_missions
            SET temporal_workflow_id = :wf_id,
                temporal_run_id = :run_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :mission_id AND org_id = :org_id
            """
        )
        await session.execute(
            update_mission_sql,
            {"wf_id": deterministic_wf_id, "run_id": run_id, "mission_id": mission_id, "org_id": org_id}
        )
        return True

    async def process_batch(self) -> int:
        """
        Polls and dispatches one batch of eligible outbox events.
        Uses SELECT FOR UPDATE SKIP LOCKED to prevent duplicate processing.
        Returns the number of events dispatched.
        """
        dispatched_count = 0
        async with self.session_factory() as session:
            async with session.begin():
                # Lock eligible pending records
                select_sql = text(
                    """
                    SELECT id, org_id, mission_id, workflow_type, payload, retry_count
                    FROM workflow_outbox
                    WHERE status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT :limit
                    FOR UPDATE SKIP LOCKED
                    """
                )
                result = await session.execute(select_sql, {"limit": self.batch_size})
                records = result.mappings().all()

                if not records:
                    return 0

                logger.debug(f"Outbox dispatcher leased {len(records)} pending events.")
                for record in records:
                    success = await self.dispatch_single_event(dict(record), session)
                    if success:
                        dispatched_count += 1

        return dispatched_count

    async def run(self) -> None:
        """Runs the polling loop until cancelled."""
        self._running = True
        logger.info("Started ARGUS Transactional Outbox Dispatcher loop.")
        while self._running:
            try:
                count = await self.process_batch()
                if count == 0:
                    await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                logger.info("Outbox Dispatcher loop received cancellation.")
                self._running = False
                break
            except Exception as exc:
                logger.error(f"Error in outbox dispatcher poll cycle: {exc}", exc_info=True)
                await asyncio.sleep(self.poll_interval)

    def stop(self) -> None:
        """Stops the dispatcher loop."""
        self._running = False
