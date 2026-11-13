"""
Primary Evidence Inspection API Endpoints for ARGUS.
Powers the Slide-Over Evidence Inspector with verbatim quotes,
cryptographic content hashes, and canonical source provenance.
"""
import uuid
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from argus.core.database import get_db_session, set_tenant_context
from argus.core.security import AuthenticatedUser, get_current_user

router = APIRouter(prefix="", tags=["Evidence"])


@router.get(
    "/evidence/{evidence_id}",
    summary="Inspect Primary Evidence Span",
)
@router.get(
    "/api/v1/evidence/{evidence_id}",
    summary="Inspect Primary Evidence Span (v1)",
)
async def get_evidence_span(
    evidence_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """
    Retrieves verifiable primary source excerpt with exact character offsets,
    origin URL, document hash, and author metadata.
    """
    org_id = user.org_id
    async with session.begin():
        await set_tenant_context(session, org_id)

        res = await session.execute(
            text(
                """
                SELECT es.id, es.mission_id, es.agent_id, es.section_name,
                       es.content_text, es.char_start_offset, es.char_end_offset,
                       es.token_count, es.created_at,
                       dv.id as version_id, dv.content_hash, dv.storage_path,
                       dv.mime_type, dv.byte_size, dv.metadata,
                       sd.canonical_url, sd.source_name
                FROM evidence_spans es
                JOIN document_versions dv ON dv.id = es.document_version_id AND dv.org_id = es.org_id
                JOIN source_documents sd ON sd.id = dv.source_document_id AND sd.org_id = es.org_id
                WHERE es.id = :id AND es.org_id = :org_id
                """
            ),
            {"id": evidence_id, "org_id": org_id}
        )
        row = res.mappings().first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "EVIDENCE_NOT_FOUND", "message": f"Evidence span {evidence_id} not found."}
            )

        # Also find what claims cite this evidence
        claims_res = await session.execute(
            text(
                """
                SELECT c.id, c.statement, c.claim_type, ce.support_type
                FROM claim_evidence ce
                JOIN claims c ON c.id = ce.claim_id AND c.org_id = ce.org_id
                WHERE ce.evidence_id = :id AND ce.org_id = :org_id
                """
            ),
            {"id": evidence_id, "org_id": org_id}
        )
        citing_claims = [
            {
                "claim_id": str(cr["id"]),
                "statement": cr["statement"],
                "claim_type": cr["claim_type"],
                "support_type": cr["support_type"],
            }
            for cr in claims_res.mappings().all()
        ]

        return {
            "id": str(row["id"]),
            "citation_pill": f"[EVID-{str(row['id'])[:6].upper()}]",
            "mission_id": str(row["mission_id"]) if row["mission_id"] else None,
            "agent_id": row["agent_id"],
            "section_name": row["section_name"],
            "quote_text": row["content_text"],
            "offsets": {
                "start": row["char_start_offset"],
                "end": row["char_end_offset"],
                "token_count": row["token_count"],
            },
            "source": {
                "canonical_url": row["canonical_url"],
                "source_name": row["source_name"],
                "content_hash": row["content_hash"],
                "metadata": row["metadata"] or {},
            },
            "citing_claims": citing_claims,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        }
