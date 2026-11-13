"""
Opportunity Intelligence API Endpoints for ARGUS.
Provides access to synthesized opportunity hypotheses, epistemic claim graphs,
and multi-dimensional priority scores.
"""
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from argus.core.database import get_db_session, set_tenant_context
from argus.core.security import AuthenticatedUser, get_current_user

router = APIRouter(prefix="", tags=["Opportunities"])


@router.get(
    "/opportunities",
    summary="List Discovered Opportunities",
)
@router.get(
    "/api/v1/opportunities",
    summary="List Discovered Opportunities (v1)",
)
async def list_opportunities(
    mission_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> List[Dict[str, Any]]:
    """
    Lists opportunities for the authenticated tenant, enriched with overall priority score.
    """
    org_id = user.org_id
    async with session.begin():
        await set_tenant_context(session, org_id)

        query = """
            SELECT o.id, o.mission_id, o.title, o.description, o.gap_analysis, o.created_at,
                   s.overall_priority_score, s.evidence_confidence_score,
                   s.market_impact_score, s.technical_feasibility_score, s.score_breakdown
            FROM opportunities o
            LEFT JOIN opportunity_scores s ON s.opportunity_id = o.id AND s.org_id = o.org_id
            WHERE o.org_id = :org_id
        """
        params = {"org_id": org_id, "limit": limit}
        if mission_id:
            query += " AND o.mission_id = :mission_id"
            params["mission_id"] = mission_id

        query += " ORDER BY COALESCE(s.overall_priority_score, 0) DESC, o.created_at DESC LIMIT :limit"

        res = await session.execute(text(query), params)
        rows = res.mappings().all()

        results = []
        for r in rows:
            # Count claims
            c_res = await session.execute(
                text("SELECT count(*) FROM opportunity_claims WHERE opportunity_id = :opp_id AND org_id = :org_id"),
                {"opp_id": r["id"], "org_id": org_id}
            )
            claims_count = c_res.scalar() or 0

            results.append({
                "id": str(r["id"]),
                "mission_id": str(r["mission_id"]),
                "title": r["title"],
                "description": r["description"],
                "gap_analysis": r["gap_analysis"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "scores": {
                    "overall_priority": float(r["overall_priority_score"]) if r["overall_priority_score"] else 0.0,
                    "evidence_confidence": float(r["evidence_confidence_score"]) if r["evidence_confidence_score"] else 0.0,
                    "market_impact": float(r["market_impact_score"]) if r["market_impact_score"] else 0.0,
                    "technical_feasibility": float(r["technical_feasibility_score"]) if r["technical_feasibility_score"] else 0.0,
                    "breakdown": r["score_breakdown"] or {},
                },
                "claims_count": claims_count,
            })

        return results


@router.get(
    "/opportunities/{opportunity_id}",
    summary="Get Opportunity Dossier",
)
@router.get(
    "/api/v1/opportunities/{opportunity_id}",
    summary="Get Opportunity Dossier (v1)",
)
async def get_opportunity_dossier(
    opportunity_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """
    Retrieves the complete opportunity intelligence dossier, including
    the epistemic fact-vs-hypothesis split, claims, and verified citations.
    """
    org_id = user.org_id
    async with session.begin():
        await set_tenant_context(session, org_id)

        # 1. Fetch opportunity base & score
        res = await session.execute(
            text(
                """
                SELECT o.id, o.mission_id, o.title, o.description, o.gap_analysis, o.created_at,
                       m.target_topic as mission_topic,
                       s.overall_priority_score, s.evidence_confidence_score,
                       s.market_impact_score, s.technical_feasibility_score, s.score_breakdown
                FROM opportunities o
                JOIN research_missions m ON m.id = o.mission_id AND m.org_id = o.org_id
                LEFT JOIN opportunity_scores s ON s.opportunity_id = o.id AND s.org_id = o.org_id
                WHERE o.id = :id AND o.org_id = :org_id
                """
            ),
            {"id": opportunity_id, "org_id": org_id}
        )
        opp = res.mappings().first()
        if not opp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error_code": "OPPORTUNITY_NOT_FOUND", "message": f"Opportunity {opportunity_id} not found."}
            )

        # 2. Fetch linked claims and their supporting evidence citations
        claims_res = await session.execute(
            text(
                """
                SELECT c.id, c.statement, c.confidence_score, c.claim_type, oc.relationship
                FROM opportunity_claims oc
                JOIN claims c ON c.id = oc.claim_id AND c.org_id = oc.org_id
                WHERE oc.opportunity_id = :opp_id AND oc.org_id = :org_id
                """
            ),
            {"opp_id": opportunity_id, "org_id": org_id}
        )
        claim_rows = claims_res.mappings().all()

        claims_data = []
        for c in claim_rows:
            # Fetch evidence citations for this claim
            ev_res = await session.execute(
                text(
                    """
                    SELECT ce.evidence_id, ce.quote_text, ce.support_type,
                           es.section_name, es.char_start_offset, es.char_end_offset,
                           sd.canonical_url, sd.source_name,
                           dv.content_hash, dv.metadata
                    FROM claim_evidence ce
                    JOIN evidence_spans es ON es.id = ce.evidence_id AND es.org_id = ce.org_id
                    JOIN document_versions dv ON dv.id = es.document_version_id AND dv.org_id = ce.org_id
                    JOIN source_documents sd ON sd.id = dv.source_document_id AND sd.org_id = ce.org_id
                    WHERE ce.claim_id = :claim_id AND ce.org_id = :org_id
                    """
                ),
                {"claim_id": c["id"], "org_id": org_id}
            )
            ev_rows = ev_res.mappings().all()

            citations = [
                {
                    "evidence_id": str(ev["evidence_id"]),
                    "citation_pill": f"[EVID-{str(ev['evidence_id'])[:6].upper()}]",
                    "quote": ev["quote_text"],
                    "support_type": ev["support_type"],
                    "section_name": ev["section_name"],
                    "canonical_url": ev["canonical_url"],
                    "source_name": ev["source_name"],
                    "content_hash": ev["content_hash"],
                    "metadata": ev["metadata"],
                }
                for ev in ev_rows
            ]

            claims_data.append({
                "id": str(c["id"]),
                "statement": c["statement"],
                "confidence_score": float(c["confidence_score"]) if c["confidence_score"] else 0.0,
                "claim_type": c["claim_type"],
                "relationship": c["relationship"],
                "citations": citations,
            })

        return {
            "id": str(opp["id"]),
            "mission_id": str(opp["mission_id"]),
            "mission_topic": opp["mission_topic"],
            "title": opp["title"],
            "description": opp["description"],
            "gap_analysis": opp["gap_analysis"],
            "created_at": opp["created_at"].isoformat() if opp["created_at"] else None,
            "scores": {
                "overall_priority": float(opp["overall_priority_score"]) if opp["overall_priority_score"] else 0.0,
                "evidence_confidence": float(opp["evidence_confidence_score"]) if opp["evidence_confidence_score"] else 0.0,
                "market_impact": float(opp["market_impact_score"]) if opp["market_impact_score"] else 0.0,
                "technical_feasibility": float(opp["technical_feasibility_score"]) if opp["technical_feasibility_score"] else 0.0,
                "breakdown": opp["score_breakdown"] or {},
            },
            "claims": claims_data,
        }
