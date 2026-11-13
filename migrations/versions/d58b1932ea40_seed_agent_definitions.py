"""seed_agent_definitions

Revision ID: d58b1932ea40
Revises: c49a1d5ef821
Create Date: 2026-11-13 21:36:00.000000

"""
import json
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd58b1932ea40'
down_revision: Union[str, None] = 'c49a1d5ef821'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

AGENTS = [
    (
        "company_scanner",
        "Company Architecture Scanner",
        "Scans infrastructure and company engineering blogs, public tech stacks, and architectures.",
        json.dumps(["web_scrape", "blog_ingest"]),
        "standard_reasoning",
        json.dumps(["http_fetch", "html_parser"]),
        5,
        120,
    ),
    (
        "research_scanner",
        "Academic & Research Paper Scanner",
        "Scans ArXiv, ACM, and systems research papers for architectural breakthroughs.",
        json.dumps(["arxiv_search", "paper_extract"]),
        "deep_reasoning",
        json.dumps(["arxiv_api", "pdf_extract"]),
        5,
        180,
    ),
    (
        "community_scanner",
        "Developer Community Scanner",
        "Analyzes developer pain points and adoption patterns across GitHub, Reddit, and forums.",
        json.dumps(["forum_search", "sentiment_analysis"]),
        "fast_eval",
        json.dumps(["reddit_search", "hacker_news_search"]),
        5,
        120,
    ),
    (
        "hiring_intelligence",
        "Technical Hiring Intelligence Scanner",
        "Extracts technical constraints and emerging requirements from engineering job postings.",
        json.dumps(["job_post_extract", "skills_taxonomy"]),
        "standard_reasoning",
        json.dumps(["job_board_search"]),
        5,
        120,
    ),
    (
        "open_source_intelligence",
        "Open Source Intelligence Scanner",
        "Evaluates open-source repo growth, commit velocity, dependencies, and license posture.",
        json.dumps(["github_api", "repo_eval"]),
        "fast_eval",
        json.dumps(["github_search", "repo_metrics"]),
        5,
        120,
    ),
    (
        "market_intelligence",
        "Market & Competitive Intelligence Scanner",
        "Maps funding, market sizing, competitive landscapes, and commercial traction.",
        json.dumps(["funding_search", "market_map"]),
        "standard_reasoning",
        json.dumps(["crunchbase_search", "sec_edgar"]),
        5,
        120,
    ),
    (
        "architecture_extractor",
        "Deep System Architecture Extractor",
        "Extracts structural topologies, protocols, latency bottlenecks, and hardware requirements.",
        json.dumps(["topology_synthesis", "tradeoff_matrix"]),
        "deep_reasoning",
        json.dumps(["graph_builder", "spec_analyzer"]),
        5,
        240,
    ),
    (
        "negative_space_engine",
        "Negative Space Opportunity Engine",
        "Identifies underserved architectural white spaces and synthesizes evidence-backed opportunities.",
        json.dumps(["white_space_discovery", "opportunity_scoring"]),
        "deep_reasoning",
        json.dumps(["synthesis_evaluator", "claim_validator"]),
        5,
        300,
    ),
]


def upgrade() -> None:
    for agent in AGENTS:
        op.execute(
            f"""
            INSERT INTO agent_definitions (
                id, display_name, description, capabilities, default_model_profile,
                tool_allowlist, max_iterations, timeout_seconds, is_active
            ) VALUES (
                '{agent[0]}', '{agent[1]}', '{agent[2]}', '{agent[3]}'::jsonb, '{agent[4]}',
                '{agent[5]}'::jsonb, {agent[6]}, {agent[7]}, true
            ) ON CONFLICT (id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                capabilities = EXCLUDED.capabilities,
                default_model_profile = EXCLUDED.default_model_profile,
                tool_allowlist = EXCLUDED.tool_allowlist,
                max_iterations = EXCLUDED.max_iterations,
                timeout_seconds = EXCLUDED.timeout_seconds;
            """
        )


def downgrade() -> None:
    op.execute("DELETE FROM agent_definitions WHERE id IN ('company_scanner', 'research_scanner', 'community_scanner', 'hiring_intelligence', 'open_source_intelligence', 'market_intelligence', 'architecture_extractor', 'negative_space_engine');")
