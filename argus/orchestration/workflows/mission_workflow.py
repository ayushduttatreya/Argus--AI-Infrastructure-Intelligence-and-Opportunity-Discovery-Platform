"""
Temporal Workflow implementation for ARGUS Mission Orchestration.
Purely deterministic execution logic. All I/O is performed via activities.
Supports progress queries, timeout configurations, and safe cancellation.
"""
import asyncio
from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from argus.orchestration.contracts import (
        MissionWorkflowInput,
        MissionWorkflowResult,
        MissionProgress,
    )
    from argus.orchestration.activities.mission_activities import (
        load_mission_activity,
        execute_stage_activity,
        finalize_mission_activity,
        NonRetryableMissionError,
    )


@workflow.defn(name="ResearchMissionWorkflow")
class ResearchMissionWorkflow:
    """
    Durable workflow coordinating the lifecycle of an ARGUS research mission.
    """

    def __init__(self) -> None:
        self._progress = MissionProgress(
            stage="pending",
            percentage=0,
            completed_activities=[],
        )
        self._is_cancelled = False

    @workflow.query
    def get_progress(self) -> MissionProgress:
        """Query handler to inspect live workflow progress."""
        return self._progress

    @workflow.signal
    def request_cancellation(self) -> None:
        """Signal handler to request workflow cancellation."""
        self._is_cancelled = True

    @workflow.run
    async def run(self, input_data: MissionWorkflowInput) -> MissionWorkflowResult:
        """
        Executes the deterministic orchestration loop across bounded research stages.
        """
        workflow_id = workflow.info().workflow_id
        workflow.logger.info(f"Starting ResearchMissionWorkflow {workflow_id}")

        # Activity retry policy: bounded retries with exponential backoff
        default_retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            backoff_coefficient=2.0,
            maximum_interval=timedelta(seconds=15),
            maximum_attempts=3,
            non_retryable_error_types=["NonRetryableMissionError"],
        )

        completed_stages: list[str] = []

        try:
            # Stage 1: Load and validate mission state
            self._progress.stage = "loading_mission"
            self._progress.percentage = 10
            self._progress.current_activity = "load_mission_activity"

            mission_info = await workflow.execute_activity(
                load_mission_activity,
                input_data,
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=default_retry_policy,
            )
            completed_stages.append("load_mission")
            self._progress.completed_activities.append("load_mission")

            # Check for cancellation signal
            if self._is_cancelled:
                raise asyncio.CancelledError("Cancellation requested via signal")

            # Stage 2: Ingestion & Pre-processing Stage
            self._progress.stage = "ingestion_precheck"
            self._progress.percentage = 40
            self._progress.current_activity = "execute_stage_activity(ingestion)"

            await workflow.execute_activity(
                execute_stage_activity,
                args=["ingestion", input_data.org_id, input_data.mission_id],
                start_to_close_timeout=timedelta(seconds=30),
                heartbeat_timeout=timedelta(seconds=10),
                retry_policy=default_retry_policy,
            )
            completed_stages.append("ingestion")
            self._progress.completed_activities.append("ingestion")

            if self._is_cancelled:
                raise asyncio.CancelledError("Cancellation requested via signal")

            # Stage 3: Synthesis & Verification Stage
            self._progress.stage = "synthesis_precheck"
            self._progress.percentage = 80
            self._progress.current_activity = "execute_stage_activity(synthesis)"

            await workflow.execute_activity(
                execute_stage_activity,
                args=["synthesis", input_data.org_id, input_data.mission_id],
                start_to_close_timeout=timedelta(seconds=30),
                heartbeat_timeout=timedelta(seconds=10),
                retry_policy=default_retry_policy,
            )
            completed_stages.append("synthesis")
            self._progress.completed_activities.append("synthesis")

            # Finalize: Mark Completed
            self._progress.stage = "completed"
            self._progress.percentage = 100
            self._progress.current_activity = "finalize_mission_activity(completed)"

            await workflow.execute_activity(
                finalize_mission_activity,
                args=[input_data.org_id, input_data.mission_id, "completed", None],
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=default_retry_policy,
            )

            workflow.logger.info(f"ResearchMissionWorkflow {workflow_id} completed successfully")
            return MissionWorkflowResult(
                mission_id=input_data.mission_id,
                org_id=input_data.org_id,
                status="completed",
                completed_stages=completed_stages,
            )

        except asyncio.CancelledError as cancel_err:
            workflow.logger.warning(f"ResearchMissionWorkflow {workflow_id} was cancelled: {cancel_err}")
            self._progress.stage = "cancelled"

            # Execute cancellation compensation in a shielded context
            await asyncio.shield(
                workflow.execute_activity(
                    finalize_mission_activity,
                    args=[input_data.org_id, input_data.mission_id, "cancelled", str(cancel_err)],
                    start_to_close_timeout=timedelta(seconds=30),
                    retry_policy=default_retry_policy,
                )
            )
            return MissionWorkflowResult(
                mission_id=input_data.mission_id,
                org_id=input_data.org_id,
                status="cancelled",
                completed_stages=completed_stages,
                error_message="Workflow cancelled",
            )

        except Exception as exc:
            workflow.logger.error(f"ResearchMissionWorkflow {workflow_id} failed: {exc}")
            self._progress.stage = "failed"
            error_str = str(exc)

            # Record failure in database
            await asyncio.shield(
                workflow.execute_activity(
                    finalize_mission_activity,
                    args=[input_data.org_id, input_data.mission_id, "failed", error_str],
                    start_to_close_timeout=timedelta(seconds=30),
                    retry_policy=default_retry_policy,
                )
            )
            return MissionWorkflowResult(
                mission_id=input_data.mission_id,
                org_id=input_data.org_id,
                status="failed",
                completed_stages=completed_stages,
                error_message=error_str,
            )
