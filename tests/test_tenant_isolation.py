"""
ARGUS Phase 1.1 Tenant Isolation & PostgreSQL RLS Security Tests.
All tests execute using the non-owner, non-superuser runtime role 'argus_app' (NOBYPASSRLS).
"""
import uuid
import pytest
import pytest_asyncio
import asyncpg


@pytest_asyncio.fixture
async def app_conn():
    """Provides a connection as the runtime non-owner role argus_app."""
    conn = await asyncpg.connect(
        database="argus",
        user="argus_app",
        password="app_secure_pass",
        host="/tmp"
    )
    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def admin_conn():
    """Provides an admin connection for setting up isolated test fixtures."""
    conn = await asyncpg.connect(
        database="argus",
        user="postgres",
        host="/tmp"
    )
    yield conn
    await conn.close()


@pytest.mark.asyncio
async def test_every_tenant_table_has_rls_and_force_rls(admin_conn):
    """Verify that every tenant-owned table has both RLS and FORCE RLS enabled."""
    expected_tenant_tables = {
        'research_missions', 'mission_events', 'workflow_outbox',
        'agent_executions', 'model_calls', 'tool_calls',
        'source_documents', 'document_versions', 'evidence_spans',
        'entities', 'entity_aliases', 'relationships', 'claims',
        'claim_evidence', 'opportunities', 'opportunity_claims',
        'opportunity_scores', 'evaluation_runs', 'evaluation_results',
        'intelligence_reports'
    }

    rows = await admin_conn.fetch(
        """
        SELECT relname, relrowsecurity, relforcerowsecurity 
        FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relkind = 'r' 
          AND relname = ANY($1::text[]);
        """,
        list(expected_tenant_tables)
    )

    found_tables = {r["relname"]: (r["relrowsecurity"], r["relforcerowsecurity"]) for r in rows}

    for tbl in expected_tenant_tables:
        assert tbl in found_tables, f"Table {tbl} not found in database!"
        rls_enabled, force_rls = found_tables[tbl]
        assert rls_enabled is True, f"Table {tbl} does NOT have relrowsecurity enabled!"
        assert force_rls is True, f"Table {tbl} does NOT have relforcerowsecurity enabled!"


@pytest.mark.asyncio
async def test_runtime_role_properties(app_conn, admin_conn):
    """Verify argus_app has NOBYPASSRLS and does NOT own any public tables."""
    bypass = await admin_conn.fetchval(
        "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'argus_app';"
    )
    assert bypass is False, "CRITICAL: argus_app must have rolbypassrls = False!"

    owned_tables = await admin_conn.fetch(
        """
        SELECT c.relname 
        FROM pg_class c 
        JOIN pg_roles r ON r.oid = c.relowner 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND r.rolname = 'argus_app';
        """
    )
    assert len(owned_tables) == 0, f"argus_app must own 0 tables, but owns: {[r['relname'] for r in owned_tables]}"


@pytest.mark.asyncio
async def test_missing_tenant_context_fails_closed(app_conn, admin_conn):
    """Verify that queries without setting app.current_org_id fail closed (0 rows)."""
    org_id = uuid.uuid4()
    await admin_conn.execute(
        "INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3);",
        org_id, "Fail-Closed Test Org", f"fail-closed-{org_id.hex[:6]}"
    )
    await admin_conn.execute(
        """
        INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
        VALUES ($1, $2, $3, $4, $5);
        """,
        uuid.uuid4(), org_id, f"key-{uuid.uuid4()}", "hash-123", "Topic Without Tenant Context"
    )

    missions = await app_conn.fetch("SELECT * FROM research_missions;")
    assert len(missions) == 0, "Query without tenant context must fail closed and return 0 rows!"


@pytest.mark.asyncio
async def test_crud_isolation_between_two_organizations(app_conn, admin_conn):
    """
    Rigorously tests SELECT, UPDATE, DELETE, and INSERT WITH CHECK isolation
    between Organization A and Organization B using runtime role argus_app.
    """
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()

    # 1. Setup Organizations
    await admin_conn.execute(
        "INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3), ($4, $5, $6);",
        org_a, "Org A", f"org-a-{org_a.hex[:6]}",
        org_b, "Org B", f"org-b-{org_b.hex[:6]}"
    )

    # 2. Seed Missions for both orgs
    mission_a_id = uuid.uuid4()
    mission_b_id = uuid.uuid4()
    await admin_conn.execute(
        """
        INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
        VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10);
        """,
        mission_a_id, org_a, f"key-a-{mission_a_id.hex[:6]}", "hash-a", "Topic A",
        mission_b_id, org_b, f"key-b-{mission_b_id.hex[:6]}", "hash-b", "Topic B"
    )

    # --- TEST UNDER ORG A CONTEXT ---
    async with app_conn.transaction():
        await app_conn.execute(f"SET LOCAL app.current_org_id = '{org_a}';")

        # 1. SELECT Isolation
        visible_missions = await app_conn.fetch("SELECT id FROM research_missions;")
        ids = [m["id"] for m in visible_missions]
        assert mission_a_id in ids, "Org A must see its own mission"
        assert mission_b_id not in ids, "Org A must NOT see Org B's mission"

        # Direct primary-key lookup of Org B record returns None
        lookup_b = await app_conn.fetchrow("SELECT * FROM research_missions WHERE id = $1;", mission_b_id)
        assert lookup_b is None, "Direct primary key lookup of Org B mission must return None!"

        # 2. UPDATE Isolation
        upd = await app_conn.execute(
            "UPDATE research_missions SET target_topic = 'Tampered' WHERE id = $1;",
            mission_b_id
        )
        assert upd == "UPDATE 0", "Attempt to update Org B mission from Org A must affect 0 rows!"

        # 3. DELETE Isolation
        dlt = await app_conn.execute(
            "DELETE FROM research_missions WHERE id = $1;",
            mission_b_id
        )
        assert dlt == "DELETE 0", "Attempt to delete Org B mission from Org A must affect 0 rows!"

        # 4. INSERT WITH CHECK Isolation
        # Attempting to insert a mission with org_id = Org B while in Org A's context must be rejected
        with pytest.raises(asyncpg.InsufficientPrivilegeError) as exc_info:
            await app_conn.execute(
                """
                INSERT INTO research_missions (id, org_id, idempotency_key, request_fingerprint, target_topic)
                VALUES ($1, $2, $3, $4, $5);
                """,
                uuid.uuid4(), org_b, f"key-malicious-{uuid.uuid4().hex[:6]}", "hash-m", "Cross-Org Injection"
            )
        assert "violates row-level security policy" in str(exc_info.value), \
            f"Expected RLS policy violation on cross-tenant insert, got: {exc_info.value}"


@pytest.mark.asyncio
async def test_tenant_context_not_leaking_through_pooled_connections(app_conn):
    """
    Verify that SET LOCAL app.current_org_id does not leak across transactions
    on the same physical connection (connection pooling safety).
    """
    org_test = uuid.uuid4()

    # Transaction 1: Set tenant context
    async with app_conn.transaction():
        await app_conn.execute(f"SET LOCAL app.current_org_id = '{org_test}';")
        ctx1 = await app_conn.fetchval("SELECT current_setting('app.current_org_id', true);")
        assert ctx1 == str(org_test)

    # Transaction 2 on same connection: Verify tenant context is gone
    ctx2 = await app_conn.fetchval("SELECT current_setting('app.current_org_id', true);")
    assert ctx2 == "" or ctx2 is None, f"Tenant context leaked across transactions: {ctx2}"


@pytest.mark.asyncio
async def test_transaction_rollback_clears_tenant_context(app_conn):
    """Verify that an explicit transaction rollback immediately clears the local tenant context."""
    org_test = uuid.uuid4()

    try:
        async with app_conn.transaction():
            await app_conn.execute(f"SET LOCAL app.current_org_id = '{org_test}';")
            # Force an intentional error to trigger rollback
            await app_conn.execute("SELECT 1/0;")
    except asyncpg.DivisionByZeroError:
        pass

    # Verify context reset after rollback
    ctx_after = await app_conn.fetchval("SELECT current_setting('app.current_org_id', true);")
    assert ctx_after == "" or ctx_after is None, f"Context retained after rollback: {ctx_after}"


@pytest.mark.asyncio
async def test_cross_tenant_composite_foreign_key_rejection(app_conn, admin_conn):
    """
    Verify that PostgreSQL structural composite foreign keys strictly reject
    any attempt to create cross-tenant relationships.
    """
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()

    await admin_conn.execute(
        "INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3), ($4, $5, $6);",
        org_a, "Org A", f"org-a-{org_a.hex[:6]}",
        org_b, "Org B", f"org-b-{org_b.hex[:6]}"
    )

    entity_a_id = uuid.uuid4()
    entity_b_id = uuid.uuid4()

    # Create Entity A in Org A and Entity B in Org B
    await admin_conn.execute(
        """
        INSERT INTO entities (id, org_id, canonical_name, entity_type)
        VALUES ($1, $2, 'Company A', 'company'), ($3, $4, 'Company B', 'company');
        """,
        entity_a_id, org_a, entity_b_id, org_b
    )

    # Attempt cross-tenant link under Org A (target is Entity B in Org B)
    with pytest.raises(asyncpg.ForeignKeyViolationError) as exc_info:
        await admin_conn.execute(
            """
            INSERT INTO relationships (id, org_id, source_entity_id, target_entity_id, relation_type)
            VALUES ($1, $2, $3, $4, 'competes_with');
            """,
            uuid.uuid4(), org_a, entity_a_id, entity_b_id
        )
    assert "fk_rel_target" in str(exc_info.value)

    # Attempt cross-tenant link under Org B (source is Entity A in Org A)
    with pytest.raises(asyncpg.ForeignKeyViolationError) as exc_info:
        await admin_conn.execute(
            """
            INSERT INTO relationships (id, org_id, source_entity_id, target_entity_id, relation_type)
            VALUES ($1, $2, $3, $4, 'competes_with');
            """,
            uuid.uuid4(), org_b, entity_a_id, entity_b_id
        )
    assert "fk_rel_source" in str(exc_info.value)
