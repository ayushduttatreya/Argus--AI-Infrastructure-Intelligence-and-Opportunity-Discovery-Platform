"""
Research Missions API Endpoints for ARGUS.
Implements mission submission with strict idempotency, listing, details,
SSE event streaming, and cancellation.
"""
import hashlib
import json
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from argus.core.database import get_db_session, set_tenant_context
from argus.core.logging import logger
from argus.core.security import AuthenticatedUser, get_current_user

router = APIRouter(prefix="", tags=["Research Missions"])


class TimeWindow(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class BudgetLimits(BaseModel):
    max_cost_usd: float = 10.0
    max_runtime_seconds: int = 1800


class CreateMissionRequest(BaseModel):
    target_topic: str = Field(..., min_length=3, max_length=255)
    target_companies: List[str] = Field(default_factory=list)
    depth: str = Field(default="standard")
    time_window: Optional[TimeWindow] = None
    budget_limits: Optional[BudgetLimits] = None
    enabled_agents: List[str] = Field(default_factory=list)


class MissionSummary(BaseModel):
    id: uuid.UUID
    target_topic: str
    status: str
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None


@router.post(
    "/research-missions",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a New Research Mission",
)
@router.post(
    "/api/v1/research-missions",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a New Research Mission (v1)",
)
async def create_research_mission(
    request: CreateMissionRequest,
    response: Response,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=8, max_length=255),
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """
    Submits a research mission with transactional outbox and strict tenant-scoped idempotency.
    """
    org_id = user.org_id
    payload_dict = request.model_dump()
    payload_json = json.dumps(payload_dict, sort_keys=True)
    request_fingerprint = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()

    async with session.begin():
        await set_tenant_context(session, org_id)

        # Check existing idempotency key
        res = await session.execute(
            text(
                """
                SELECT id, request_fingerprint, status, target_topic, created_at, updated_at, completed_at
                FROM research_missions
                WHERE org_id = :org_id AND idempotency_key = :key
                """
            ),
            {"org_id": org_id, "key": idempotency_key}
        )
        existing = res.mappings().first()

        if existing:
            if existing["request_fingerprint"] != request_fingerprint:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "error_code": "IDEMPOTENCY_CONFLICT",
                        "message": "Idempotency-Key already used with different request parameters.",
                    }
                )
            # Replay existing mission
            response.headers["Location"] = f"/api/v1/research-missions/{existing['id']}"
            return {
                "id": str(existing["id"]),
                "target_topic": existing["target_topic"],
                "status": existing["status"],
                "created_at": existing["created_at"].isoformat(),
                "updated_at": existing["updated_at"].isoformat(),
                "completed_at": existing["completed_at"].isoformat() if existing["completed_at"] else None,
            }

        # Create new mission
        mission_id = uuid.uuid4()
        outbox_id = uuid.uuid4()

        await session.execute(
            text(
                """
                INSERT INTO research_missions (
                    id, org_id, idempotency_key, request_fingerprint,
                    target_topic, target_companies, depth, status, coverage_summary
                )
                VALUES (
                    :id, :org_id, :key, :fingerprint,
                    :topic, :companies, :depth, 'pending', '{}'::jsonb
                )
                """
            ),
            {
                "id": mission_id,
                "org_id": org_id,
                "key": idempotency_key,
                "fingerprint": request_fingerprint,
                "topic": request.target_topic,
                "companies": json.dumps(request.target_companies),
                "depth": request.depth,
            }
        )

        # Create outbox entry for Temporal dispatch
        await session.execute(
            text(
                """
                INSERT INTO workflow_outbox (
                    id, org_id, mission_id, workflow_type, payload, status
                )
                VALUES (
                    :id, :org_id, :mission_id, 'ResearchMissionWorkflow', :payload, 'pending'
                )
                """
            ),
            {
                "id": outbox_id,
                "org_id": org_id,
                "mission_id": mission_id,
                "payload": payload_json,
            }
        )

        # Emit initial timeline event
        await session.execute(
            text(
                """
                INSERT INTO mission_events (org_id, mission_id, event_type, agent_name, status, payload)
                VALUES (:org_id, :mission_id, 'mission.created', 'api_gateway', 'pending', :payload)
                """
            ),
            {
                "org_id": org_id,
                "mission_id": mission_id,
                "payload": json.dumps({"target_topic": request.target_topic, "depth": request.depth}),
            }
        )

    response.headers["Location"] = f"/api/v1/research-missions/{mission_id}"
    return {
        "id": str(mission_id),
        "target_topic": request.target_topic,
        "status": "pending",
        "created_at": "now",
        "updated_at": "now",
        "completed_at": None,
    }


@router.get(
    "/research-missions",
    summary="List Research Missions",
)
@router.get(
    "/api/v1/research-missions",
    summary="List Research Missions (v1)",
)
async def list_research_missions(
    limit: int = Query(50, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """Lists research missions for the authenticated tenant."""
    org_id = user.org_id
    async with session.begin():
        await set_tenant_context(session, org_id)
        res = await session.execute(
            text(
                """
                SELECT id, target_topic, status, depth, coverage_summary, created_at, updated_at, completed_at
                FROM research_missions
                WHERE org_id = :org_id
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"org_id": org_id, "limit": limit}
        )
        rows = res.mappings().all()

        return [
            {
                "id": str(row["id"]),
                "target_topic": row["target_topic"],
                "status": row["status"],
                "depth": row["depth"],
                "coverage_summary": row["coverage_summary"] or {},
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
            }
            for row in rows
        ]


@router.get(
    "/research-missions/{mission_id}",
    summary="Get Mission Details",
)
@router.get(
    "/api/v1/research-missions/{mission_id}",
    summary="Get Mission Details (v1)",
)
async def get_research_mission(
    mission_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Retrieves detailed status and metrics for a research mission."""
    org_id = user.org_id
    async with session.begin():
        await set_tenant_context(session, org_id)
        res = await session.execute(
            text(
                """
                SELECT id, target_topic, target_companies, depth, status,
                       temporal_workflow_id, temporal_run_id, coverage_summary,
                       created_at, updated_at, completed_at
                FROM research_missions
                WHERE id = :id AND org_id = :org_id
                """
            ),
            {"id": mission_id, "org_id": org_id}
        )
        row = res.mappings().first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "MISSION_NOT_FOUND", "message": f"Mission {mission_id} not found."}
            )

        # Get evidence count and opportunities count
        ev_res = await session.execute(
            text("SELECT count(*) FROM evidence_spans WHERE mission_id = :id AND org_id = :org_id"),
            {"id": mission_id, "org_id": org_id}
        )
        ev_count = ev_res.scalar() or 0

        opp_res = await session.execute(
            text("SELECT count(*) FROM opportunities WHERE mission_id = :id AND org_id = :org_id"),
            {"id": mission_id, "org_id": org_id}
        )
        opp_count = opp_res.scalar() or 0

        return {
            "id": str(row["id"]),
            "target_topic": row["target_topic"],
            "target_companies": row["target_companies"] or [],
            "depth": row["depth"],
            "status": row["status"],
            "temporal_workflow_id": row["temporal_workflow_id"],
            "temporal_run_id": row["temporal_run_id"],
            "coverage_summary": row["coverage_summary"] or {},
            "evidence_count": ev_count,
            "opportunities_count": opp_count,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
        }


@router.get(
    "/research-missions/{mission_id}/events",
    summary="Subscribe to Mission Events (SSE)",
)
@router.get(
    "/api/v1/research-missions/{mission_id}/events",
    summary="Subscribe to Mission Events (SSE v1)",
)
async def stream_mission_events(
    mission_id: uuid.UUID,
    last_event_id: Optional[int] = Query(None, alias="Last-Event-ID"),
    header_last_id: Optional[int] = Header(None, alias="Last-Event-ID"),
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Server-Sent Events endpoint streaming real-time mission progress and historical replay.
    """
    effective_last_id = last_event_id or header_last_id or 0
    org_id = user.org_id

    async def event_generator():
        async with session.begin():
            await set_tenant_context(session, org_id)
            res = await session.execute(
                text(
                    """
                    SELECT id, event_type, agent_name, status, payload, occurred_at
                    FROM mission_events
                    WHERE org_id = :org_id AND mission_id = :mission_id AND id > :last_id
                    ORDER BY id ASC
                    """
                ),
                {"org_id": org_id, "mission_id": mission_id, "last_id": effective_last_id}
            )
            rows = res.mappings().all()

            for row in rows:
                event_data = {
                    "event_id": row["id"],
                    "event_type": row["event_type"],
                    "agent_name": row["agent_name"],
                    "status": row["status"],
                    "payload": row["payload"],
                    "occurred_at": row["occurred_at"].isoformat(),
                }
                yield f"id: {row['id']}\nevent: {row['event_type']}\ndata: {json.dumps(event_data)}\n\n"

            # Ping heartbeat
            yield ": ping\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post(
    "/research-missions/{mission_id}/cancel",
    summary="Cancel Mission",
)
@router.post(
    "/api/v1/research-missions/{mission_id}/cancel",
    summary="Cancel Mission (v1)",
)
async def cancel_research_mission(
    mission_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Cancels an in-progress research mission."""
    org_id = user.org_id
    async with session.begin():
        await set_tenant_context(session, org_id)
        res = await session.execute(
            text(
                """
                SELECT id, status FROM research_missions
                WHERE id = :id AND org_id = :org_id
                """
            ),
            {"id": mission_id, "org_id": org_id}
        )
        row = res.mappings().first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "MISSION_NOT_FOUND", "message": f"Mission {mission_id} not found."}
            )

        if row["status"] in ("completed", "failed", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error_code": "MISSION_ALREADY_FINISHED", "message": f"Mission is already {row['status']}."}
            )

        await session.execute(
            text(
                """
                UPDATE research_missions
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND org_id = :org_id
                """
            ),
            {"id": mission_id, "org_id": org_id}
        )

        return {"id": str(mission_id), "status": "cancelled"}


@router.post(
    "/research-missions/{mission_id}/run-github-pipeline",
    summary="Execute Real GitHub Intelligence Pipeline",
)
@router.post(
    "/api/v1/research-missions/{mission_id}/run-github-pipeline",
    summary="Execute Real GitHub Intelligence Pipeline (v1)",
)
async def run_github_pipeline(
    mission_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """
    Executes the GitHub Infrastructure research pipeline for the given mission.
    Harvests authentic GitHub issues, extracts verbatim quotes, establishes
    cryptographic provenance, links claims, and scores opportunities.
    """
    from argus.connectors.github import GitHubIntelligenceConnector

    org_id = user.org_id
    async with session.begin():
        await set_tenant_context(session, org_id)

        # Check mission exists
        res = await session.execute(
            text("SELECT id, target_topic, status FROM research_missions WHERE id = :id AND org_id = :org_id"),
            {"id": mission_id, "org_id": org_id}
        )
        mission = res.mappings().first()
        if not mission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "MISSION_NOT_FOUND", "message": f"Mission {mission_id} not found."}
            )

        connector = GitHubIntelligenceConnector()
        pipeline_result = await connector.run_pipeline_for_mission(
            session=session,
            org_id=org_id,
            mission_id=mission_id,
            target_topic=mission["target_topic"],
        )

    return pipeline_result

