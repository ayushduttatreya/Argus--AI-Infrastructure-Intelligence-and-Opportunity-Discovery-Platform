"""outbox_dispatcher_policy

Revision ID: c49a1d5ef821
Revises: a71329da290d
Create Date: 2026-11-13 21:34:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c49a1d5ef821'
down_revision: Union[str, None] = 'a71329da290d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Provision dedicated argus_dispatcher role with NOBYPASSRLS
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'argus_dispatcher') THEN
                CREATE ROLE argus_dispatcher LOGIN PASSWORD 'secure_dispatcher_pass' NOBYPASSRLS;
            ELSE
                ALTER ROLE argus_dispatcher NOBYPASSRLS;
            END IF;
        END $$;
    """)

    # 2. Grant minimal privileges required for dispatch leasing & mission coordinate updates
    op.execute("GRANT CONNECT ON DATABASE argus TO argus_dispatcher;")
    op.execute("GRANT USAGE ON SCHEMA public TO argus_dispatcher;")
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM argus_dispatcher;")
    op.execute("GRANT SELECT ON workflow_outbox TO argus_dispatcher;")
    op.execute("GRANT UPDATE (status, retry_count, last_attempt_at, error_message, dispatched_at) ON workflow_outbox TO argus_dispatcher;")
    op.execute("GRANT UPDATE (temporal_workflow_id, temporal_run_id, updated_at) ON research_missions TO argus_dispatcher;")
    op.execute("GRANT SELECT (id, org_id) ON research_missions TO argus_dispatcher;")

    # Prevent argus_app from inheriting or switching to argus_dispatcher
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'argus_app') THEN
                REVOKE argus_dispatcher FROM argus_app;
            END IF;
        END $$;
    """)

    # 3. Create hardened role-based policies on workflow_outbox
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_outbox;")
    op.execute("DROP POLICY IF EXISTS dispatcher_outbox_policy ON workflow_outbox;")
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON workflow_outbox
            FOR ALL
            TO argus_app, postgres
            USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
            WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
    """)
    op.execute("""
        CREATE POLICY dispatcher_outbox_policy ON workflow_outbox
            FOR ALL
            TO argus_dispatcher
            USING (true)
            WITH CHECK (status IN ('pending', 'dispatched', 'failed'));
    """)

    # 4. Dispatcher mission update policy on research_missions
    op.execute("DROP POLICY IF EXISTS dispatcher_mission_update_policy ON research_missions;")
    op.execute("DROP POLICY IF EXISTS dispatcher_mission_select_policy ON research_missions;")
    op.execute("""
        CREATE POLICY dispatcher_mission_select_policy ON research_missions
            FOR SELECT
            TO argus_dispatcher
            USING (true);
    """)
    op.execute("""
        CREATE POLICY dispatcher_mission_update_policy ON research_missions
            FOR UPDATE
            TO argus_dispatcher
            USING (true)
            WITH CHECK (true);
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS dispatcher_mission_update_policy ON research_missions;")
    op.execute("DROP POLICY IF EXISTS dispatcher_mission_select_policy ON research_missions;")
    op.execute("DROP POLICY IF EXISTS dispatcher_outbox_policy ON workflow_outbox;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_outbox;")
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON workflow_outbox
            FOR ALL
            USING (
                org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
            );
    """)
