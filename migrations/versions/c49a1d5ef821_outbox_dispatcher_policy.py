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
    # Allow system outbox dispatcher to select and lease cross-tenant outbox events
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_outbox;")
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON workflow_outbox
            FOR ALL
            USING (
                org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
                OR current_setting('app.is_dispatcher', true) = 'true'
            );
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_outbox;")
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON workflow_outbox
            FOR ALL
            USING (
                org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
            );
    """)
