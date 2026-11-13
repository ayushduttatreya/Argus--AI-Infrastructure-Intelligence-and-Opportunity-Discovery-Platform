"""
ARGUS Security Regression Suite: Outbox RLS Authorization Hardening.
Tests A through H verifying that outbox dispatch authorization is role-based,
caller-controlled GUC parameter spoofing is completely ineffective,
argus_dispatcher has NOBYPASSRLS, and tenant boundaries remain inviolable.
"""
import asyncio
import json
import uuid
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

ADMIN_URL = "postgresql+asyncpg://postgres@/argus?host=/tmp"
APP_URL = "postgresql+asyncpg://argus_app:secure_app_pass@/argus?host=/tmp"
DISPATCHER_URL = "postgresql+asyncpg://argus_dispatcher:secure_dispatcher_pass@/argus?host=/tmp"


@pytest.fixture
async def admin_engine():
    engine = create_async_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    yield engine
    await engine.dispose()


@pytest.fixture
async def app_engine():
    engine = create_async_engine(APP_URL)
    yield engine
    await engine.dispose()


@pytest.fixture
async def dispatcher_engine():
    engine = create_async_engine(DISPATCHER_URL)
    yield engine
    await engine.dispose()


@pytest.fixture
async def seeded_two_orgs(admin_engine):
    """Seeds two organizations with missions and outbox events using admin connection."""
    org1_id = uuid.uuid4()
    org2_id = uuid.uuid4()
    mission1_id = uuid.uuid4()
    mission2_id = uuid.uuid4()
    outbox1_id = uuid.uuid4()
    outbox2_id = uuid.uuid4()

    async with admin_engine.connect() as conn:
        # Create Orgs
        await conn.execute(
            text("INSERT INTO organizations (id, name, slug) VALUES (:id, :name, :slug)"),
            [
                {"id": org1_id, "name": "Org 1 Security Test", "slug": f"org-1-{org1_id.hex[:6]}"},
                {"id": org2_id, "name": "Org 2 Security Test", "slug": f"org-2-{org2_id.hex[:6]}"},
            ]
        )
        # Create Missions
        await conn.execute(
            text(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
                VALUES (:id, :org_id, :key, 'hash-sec', 'Autonomous Agent Verification')
                """
            ),
            [
                {"id": mission1_id, "org_id": org1_id, "key": f"key-m1-{mission1_id.hex[:6]}"},
                {"id": mission2_id, "org_id": org2_id, "key": f"key-m2-{mission2_id.hex[:6]}"},
            ]
        )
        # Create Outbox Entries
        await conn.execute(
            text(
                """
                INSERT INTO workflow_outbox (id, org_id, mission_id, workflow_type, payload, status)
                VALUES (:id, :org_id, :mission_id, 'ResearchMissionWorkflow', :payload, 'pending')
                """
            ),
            [
                {
                    "id": outbox1_id,
                    "org_id": org1_id,
                    "mission_id": mission1_id,
                    "payload": json.dumps({"target_topic": "Agent Verification Org 1"}),
                },
                {
                    "id": outbox2_id,
                    "org_id": org2_id,
                    "mission_id": mission2_id,
                    "payload": json.dumps({"target_topic": "Agent Verification Org 2"}),
                },
            ]
        )

    yield {
        "org1_id": org1_id,
        "org2_id": org2_id,
        "mission1_id": mission1_id,
        "mission2_id": mission2_id,
        "outbox1_id": outbox1_id,
        "outbox2_id": outbox2_id,
    }

    # Cleanup
    async with admin_engine.connect() as conn:
        await conn.execute(
            text("DELETE FROM organizations WHERE id IN (:id1, :id2)"),
            {"id1": org1_id, "id2": org2_id}
        )


@pytest.mark.asyncio
async def test_a_argus_app_cannot_see_outbox_without_org_id(app_engine, seeded_two_orgs):
    """
    Test A: The application role without app.current_org_id cannot select
    any rows from workflow_outbox (returns 0 rows).
    """
    async with app_engine.connect() as conn:
        res = await conn.execute(text("SELECT id, org_id FROM workflow_outbox"))
        rows = res.fetchall()
        assert len(rows) == 0, f"Expected 0 rows for unauthenticated app session, got {len(rows)}"


@pytest.mark.asyncio
async def test_b_argus_app_cannot_see_other_org_outbox(app_engine, seeded_two_orgs):
    """
    Test B: The application role with app.current_org_id set to Org 1 can select
    only Org 1's outbox rows, and zero rows from Org 2.
    """
    org1_id = seeded_two_orgs["org1_id"]
    org2_id = seeded_two_orgs["org2_id"]

    async with app_engine.connect() as conn:
        trans = await conn.begin()
        await conn.execute(
            text("SELECT set_config('app.current_org_id', :org_id, true)"),
            {"org_id": str(org1_id)}
        )
        res = await conn.execute(text("SELECT id, org_id FROM workflow_outbox"))
        rows = res.fetchall()
        await trans.rollback()

        returned_org_ids = {row[1] for row in rows}
        assert org1_id in returned_org_ids
        assert org2_id not in returned_org_ids
        assert all(row[1] == org1_id for row in rows)


@pytest.mark.asyncio
async def test_c_argus_app_guc_spoofing_prevented(app_engine, seeded_two_orgs):
    """
    Test C (CRITICAL SECURITY): The application role setting app.is_dispatcher = 'true'
    via SET LOCAL or set_config STILL CANNOT see other orgs' outbox rows.
    """
    org1_id = seeded_two_orgs["org1_id"]
    org2_id = seeded_two_orgs["org2_id"]

    async with app_engine.connect() as conn:
        trans = await conn.begin()
        # Tenant tries to spoof dispatcher authorization
        await conn.execute(text("SELECT set_config('app.current_org_id', :org_id, true)"), {"org_id": str(org1_id)})
        await conn.execute(text("SET LOCAL app.is_dispatcher = 'true'"))

        res = await conn.execute(text("SELECT id, org_id FROM workflow_outbox"))
        rows = res.fetchall()
        await trans.rollback()

        returned_org_ids = {row[1] for row in rows}
        assert org2_id not in returned_org_ids, "CRITICAL VULNERABILITY: app.is_dispatcher GUC leaked Org 2 rows!"
        assert all(row[1] == org1_id for row in rows)


@pytest.mark.asyncio
async def test_d_argus_app_cannot_set_role_dispatcher(app_engine):
    """
    Test D: The application role cannot execute SET ROLE argus_dispatcher.
    Must raise permission denied.
    """
    async with app_engine.connect() as conn:
        trans = await conn.begin()
        with pytest.raises(DBAPIError) as exc_info:
            await conn.execute(text("SET ROLE argus_dispatcher"))
        await trans.rollback()
        assert "permission denied to set role" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_e_argus_dispatcher_can_claim_pending_across_orgs(dispatcher_engine, seeded_two_orgs):
    """
    Test E: The argus_dispatcher role can select pending outbox events across
    all organizations without setting app.current_org_id.
    """
    org1_id = seeded_two_orgs["org1_id"]
    org2_id = seeded_two_orgs["org2_id"]
    outbox1_id = seeded_two_orgs["outbox1_id"]
    outbox2_id = seeded_two_orgs["outbox2_id"]

    async with dispatcher_engine.connect() as conn:
        trans = await conn.begin()
        res = await conn.execute(
            text(
                """
                SELECT id, org_id, status FROM workflow_outbox
                WHERE status = 'pending'
                ORDER BY created_at ASC
                FOR UPDATE SKIP LOCKED
                """
            )
        )
        rows = res.fetchall()
        await trans.rollback()

        leased_outbox_ids = {row[0] for row in rows}
        assert outbox1_id in leased_outbox_ids, "Dispatcher failed to lease Org 1 pending outbox"
        assert outbox2_id in leased_outbox_ids, "Dispatcher failed to lease Org 2 pending outbox"


@pytest.mark.asyncio
async def test_f_argus_dispatcher_cannot_access_unrelated_tables(dispatcher_engine):
    """
    Test F: The argus_dispatcher role cannot SELECT from evidence_spans, claims,
    raw_documents, organizations, or users. Must raise permission denied.
    """
    forbidden_tables = ["evidence_spans", "claims", "source_documents", "organizations", "users"]

    for tbl in forbidden_tables:
        async with dispatcher_engine.connect() as conn:
            trans = await conn.begin()
            with pytest.raises(DBAPIError) as exc_info:
                await conn.execute(text(f"SELECT * FROM {tbl} LIMIT 1"))
            await trans.rollback()
            assert "permission denied" in str(exc_info.value).lower(), (
                f"Dispatcher unexpectedly allowed access to forbidden table {tbl}"
            )


@pytest.mark.asyncio
async def test_g_argus_dispatcher_has_nobypassrls(admin_engine):
    """
    Test G: Verify argus_dispatcher and argus_app have rolbypassrls = False in pg_roles.
    """
    async with admin_engine.connect() as conn:
        res = await conn.execute(
            text(
                """
                SELECT rolname, rolbypassrls, rolsuper
                FROM pg_roles
                WHERE rolname IN ('argus_dispatcher', 'argus_app')
                """
            )
        )
        roles = {row[0]: {"bypassrls": row[1], "super": row[2]} for row in res.fetchall()}

        assert "argus_dispatcher" in roles
        assert roles["argus_dispatcher"]["bypassrls"] is False, "argus_dispatcher must have rolbypassrls = False"
        assert roles["argus_dispatcher"]["super"] is False, "argus_dispatcher must not be a superuser"

        assert "argus_app" in roles
        assert roles["argus_app"]["bypassrls"] is False, "argus_app must have rolbypassrls = False"
        assert roles["argus_app"]["super"] is False, "argus_app must not be a superuser"


@pytest.mark.asyncio
async def test_h_concurrent_dispatchers_skip_locked(dispatcher_engine, seeded_two_orgs):
    """
    Test H: Verify concurrent dispatchers using SELECT FOR UPDATE SKIP LOCKED
    lease disjoint sets of records without blocking or double-processing.
    """
    outbox1_id = seeded_two_orgs["outbox1_id"]
    outbox2_id = seeded_two_orgs["outbox2_id"]

    # Session 1 leases 1 record
    conn1 = await dispatcher_engine.connect()
    trans1 = await conn1.begin()

    select_sql = text(
        """
        SELECT id FROM workflow_outbox
        WHERE status = 'pending' AND id IN (:id1, :id2)
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """
    )

    res1 = await conn1.execute(select_sql, {"id1": outbox1_id, "id2": outbox2_id})
    batch1 = res1.fetchall()
    assert len(batch1) == 1
    leased_id_1 = batch1[0][0]

    # Session 2 concurrently leases 1 record
    conn2 = await dispatcher_engine.connect()
    trans2 = await conn2.begin()

    res2 = await conn2.execute(select_sql, {"id1": outbox1_id, "id2": outbox2_id})
    batch2 = res2.fetchall()
    assert len(batch2) == 1
    leased_id_2 = batch2[0][0]

    # Verify disjoint lease
    assert leased_id_1 != leased_id_2, "Concurrent dispatchers leased the exact same record!"
    assert {leased_id_1, leased_id_2} == {outbox1_id, outbox2_id}

    await trans1.rollback()
    await trans2.rollback()
    await conn1.close()
    await conn2.close()


@pytest.mark.asyncio
async def test_i_argus_dispatcher_can_update_allowed_dispatch_columns(dispatcher_engine, seeded_two_orgs):
    """
    Test I: Verify argus_dispatcher can update allowed dispatch coordination columns:
    status, retry_count, last_attempt_at, error_message, dispatched_at.
    """
    outbox1_id = seeded_two_orgs["outbox1_id"]

    async with dispatcher_engine.connect() as conn:
        trans = await conn.begin()
        update_sql = text(
            """
            UPDATE workflow_outbox
            SET status = 'dispatched',
                retry_count = retry_count + 1,
                last_attempt_at = CURRENT_TIMESTAMP,
                error_message = NULL,
                dispatched_at = CURRENT_TIMESTAMP
            WHERE id = :id
            """
        )
        res = await conn.execute(update_sql, {"id": outbox1_id})
        assert res.rowcount == 1
        await trans.rollback()


@pytest.mark.asyncio
async def test_j_argus_dispatcher_cannot_modify_immutable_outbox_columns(dispatcher_engine, seeded_two_orgs):
    """
    Test J (CRITICAL PRIVILEGE HARDENING): Verify argus_dispatcher is rejected with
    'permission denied for column' if it attempts to tamper with immutable outbox columns:
    org_id, mission_id, payload, workflow_type, or created_at.
    """
    outbox1_id = seeded_two_orgs["outbox1_id"]
    fake_org = uuid.uuid4()
    fake_mission = uuid.uuid4()

    tamper_attempts = [
        ("org_id", text("UPDATE workflow_outbox SET org_id = :val WHERE id = :id"), {"val": fake_org, "id": outbox1_id}),
        ("mission_id", text("UPDATE workflow_outbox SET mission_id = :val WHERE id = :id"), {"val": fake_mission, "id": outbox1_id}),
        ("payload", text("UPDATE workflow_outbox SET payload = '{\"hacked\": true}'::jsonb WHERE id = :id"), {"id": outbox1_id}),
        ("workflow_type", text("UPDATE workflow_outbox SET workflow_type = 'MaliciousWorkflow' WHERE id = :id"), {"id": outbox1_id}),
        ("created_at", text("UPDATE workflow_outbox SET created_at = '2020-01-01 00:00:00+00' WHERE id = :id"), {"id": outbox1_id}),
    ]

    for col_name, stmt, params in tamper_attempts:
        async with dispatcher_engine.connect() as conn:
            trans = await conn.begin()
            with pytest.raises(DBAPIError) as exc_info:
                await conn.execute(stmt, params)
            await trans.rollback()

            err_msg = str(exc_info.value).lower()
            assert "permission denied" in err_msg, (
                f"Expected permission denied when argus_dispatcher attempted to update '{col_name}', got: {exc_info.value}"
            )
            assert col_name in err_msg or "workflow_outbox" in err_msg

