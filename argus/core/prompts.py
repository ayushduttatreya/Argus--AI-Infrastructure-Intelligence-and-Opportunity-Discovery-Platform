"""
ARGUS Prompt Registry Module.
Manages immutable, versioned prompts with cryptographic SHA-256 integrity verification.
Enforces that every model call links to an explicit prompt version.
"""
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import uuid
from typing import Any
from sqlalchemy import text
from argus.core.database import async_session_factory
from argus.core.logging import logger

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"


class PromptImmutabilityError(Exception):
    """Raised when an attempt is made to modify an existing prompt version."""
    pass


@dataclass
class PromptVersionRecord:
    id: uuid.UUID
    agent_id: str
    version_tag: str
    system_template: str
    input_variables: list[str]
    sha256_hash: str
    is_active: bool


def compute_prompt_hash(template_text: str) -> str:
    """Computes SHA-256 hash of prompt template."""
    return hashlib.sha256(template_text.strip().encode("utf-8")).hexdigest()


async def register_prompt_version(
    agent_id: str,
    version_tag: str,
    system_template: str,
    input_variables: list[str],
    is_active: bool = True,
) -> PromptVersionRecord:
    """
    Registers a new immutable prompt version in the database.
    If the version already exists with identical content, returns the existing record.
    If the version already exists with altered content, raises PromptImmutabilityError.
    """
    computed_hash = compute_prompt_hash(system_template)

    async with async_session_factory() as session:
        # Check for existing version
        check_sql = text(
            """
            SELECT id, agent_id, version_tag, system_template, input_variables, sha256_hash, is_active
            FROM prompt_versions
            WHERE agent_id = :agent_id AND version_tag = :version_tag
            """
        )
        result = await session.execute(
            check_sql,
            {"agent_id": agent_id, "version_tag": version_tag}
        )
        rows = result.mappings().all()
        existing = rows[0] if rows else None

        if existing:
            if existing["sha256_hash"] != computed_hash:
                raise PromptImmutabilityError(
                    f"Cannot overwrite immutable prompt version '{version_tag}' for agent '{agent_id}'. "
                    f"Existing hash: {existing['sha256_hash']}, attempted hash: {computed_hash}."
                )
            return PromptVersionRecord(
                id=existing["id"],
                agent_id=existing["agent_id"],
                version_tag=existing["version_tag"],
                system_template=existing["system_template"],
                input_variables=existing["input_variables"],
                sha256_hash=existing["sha256_hash"],
                is_active=existing["is_active"],
            )

        # Deactivate previous versions if this one is active
        if is_active:
            deactivate_sql = text(
                """
                UPDATE prompt_versions
                SET is_active = false
                WHERE agent_id = :agent_id AND is_active = true
                """
            )
            await session.execute(deactivate_sql, {"agent_id": agent_id})

        # Insert new immutable prompt version
        new_id = uuid.uuid4()
        insert_sql = text(
            """
            INSERT INTO prompt_versions (
                id, agent_id, version_tag, system_template, input_variables, sha256_hash, is_active
            ) VALUES (
                :id, :agent_id, :version_tag, :template, :vars, :hash, :active
            )
            """
        )
        await session.execute(
            insert_sql,
            {
                "id": new_id,
                "agent_id": agent_id,
                "version_tag": version_tag,
                "template": system_template,
                "vars": json.dumps(input_variables),
                "hash": computed_hash,
                "active": is_active,
            }
        )
        await session.commit()

    logger.info(
        f"Registered prompt version '{version_tag}' for agent '{agent_id}' (hash: {computed_hash[:12]}...)"
    )
    return PromptVersionRecord(
        id=new_id,
        agent_id=agent_id,
        version_tag=version_tag,
        system_template=system_template,
        input_variables=input_variables,
        sha256_hash=computed_hash,
        is_active=is_active,
    )


async def get_active_prompt(agent_id: str) -> PromptVersionRecord | None:
    """Fetches the currently active prompt version for a given agent."""
    async with async_session_factory() as session:
        query = text(
            """
            SELECT id, agent_id, version_tag, system_template, input_variables, sha256_hash, is_active
            FROM prompt_versions
            WHERE agent_id = :agent_id AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        result = await session.execute(query, {"agent_id": agent_id})
        rows = result.mappings().all()
        if not rows:
            return None
        row = rows[0]
        return PromptVersionRecord(
            id=row["id"],
            agent_id=row["agent_id"],
            version_tag=row["version_tag"],
            system_template=row["system_template"],
            input_variables=row["input_variables"],
            sha256_hash=row["sha256_hash"],
            is_active=row["is_active"],
        )


async def load_and_register_prompts_from_disk(version_tag: str = "v1.0.0") -> dict[str, PromptVersionRecord]:
    """Loads prompt text files from the prompts/ directory and registers them."""
    registered = {}
    if not PROMPTS_DIR.exists():
        logger.warning(f"Prompts directory {PROMPTS_DIR} does not exist.")
        return registered

    for file_path in PROMPTS_DIR.glob("*.txt"):
        agent_id = file_path.stem
        template = file_path.read_text(encoding="utf-8")
        # Extract variables enclosed in {{...}}
        import re
        variables = list(set(re.findall(r"\{\{([a-zA-Z0-9_]+)\}\}", template)))
        record = await register_prompt_version(
            agent_id=agent_id,
            version_tag=version_tag,
            system_template=template,
            input_variables=variables,
            is_active=True,
        )
        registered[agent_id] = record
    return registered


async def record_model_call(
    session,
    org_id: uuid.UUID,
    mission_id: uuid.UUID,
    agent_execution_id: uuid.UUID,
    prompt_version_id: uuid.UUID,
    model_id: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    latency_ms: int,
    status: str,
    request_hash: str | None = None,
) -> uuid.UUID:
    """
    Records an audited LLM invocation in model_calls linked to an immutable prompt version.
    """
    call_id = uuid.uuid4()
    insert_sql = text(
        """
        INSERT INTO model_calls (
            id, org_id, mission_id, agent_execution_id, prompt_version_id,
            model_id, provider, input_tokens, output_tokens,
            cost_usd, latency_ms, status, request_hash
        ) VALUES (
            :id, :org_id, :mission_id, :agent_execution_id, :prompt_version_id,
            :model_id, :provider, :input_tokens, :output_tokens,
            :cost_usd, :latency_ms, :status, :request_hash
        )
        """
    )
    await session.execute(
        insert_sql,
        {
            "id": call_id,
            "org_id": org_id,
            "mission_id": mission_id,
            "agent_execution_id": agent_execution_id,
            "prompt_version_id": prompt_version_id,
            "model_id": model_id,
            "provider": provider,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost_usd,
            "latency_ms": latency_ms,
            "status": status,
            "request_hash": request_hash,
        }
    )
    return call_id
