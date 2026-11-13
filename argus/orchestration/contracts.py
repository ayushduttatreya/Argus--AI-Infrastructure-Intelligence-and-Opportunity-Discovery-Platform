"""
Temporal Workflow & Activity Data Contracts for ARGUS Mission Orchestration.
Strictly typed data structures for passing identifiers and lightweight metadata.
Large document payloads remain in PostgreSQL / MinIO object storage.
"""
from dataclasses import dataclass, field
from typing import Any
import uuid


@dataclass
class MissionWorkflowInput:
    """Input payload to start a ResearchMissionWorkflow."""
    org_id: str
    mission_id: str
    target_topic: str = ""
    depth: str = "standard"


@dataclass
class MissionProgress:
    """Queryable workflow progress state."""
    stage: str
    percentage: int
    current_activity: str | None = None
    completed_activities: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class MissionWorkflowResult:
    """Final output of ResearchMissionWorkflow."""
    mission_id: str
    org_id: str
    status: str  # 'completed', 'failed', 'cancelled'
    completed_stages: list[str] = field(default_factory=list)
    error_message: str | None = None
    duration_ms: int = 0
