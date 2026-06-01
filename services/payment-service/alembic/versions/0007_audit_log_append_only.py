"""audit log append-only rule (prevent DELETE/UPDATE)

Revision ID: 0007_audit_log_append_only
Revises: 0006_add_client_secret
Create Date: 2026-06-01

STRIDE Req 10.3: Append-only enforcement for audit integrity.
Prevents direct DELETE or UPDATE on payment_audit_log table.
"""
from typing import Sequence, Union
from alembic import op

revision: str = '0007_audit_log_append_only'
down_revision: Union[str, None] = '0006_add_client_secret'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return

    # PostgreSQL RULE to deny DELETE and UPDATE on audit log
    op.execute("""
        CREATE OR REPLACE RULE payment_audit_log_no_delete AS
            ON DELETE TO payment_audit_log
            DO INSTEAD NOTHING;
    """)
    op.execute("""
        CREATE OR REPLACE RULE payment_audit_log_no_update AS
            ON UPDATE TO payment_audit_log
            DO INSTEAD NOTHING;
    """)


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return
    op.execute("DROP RULE IF EXISTS payment_audit_log_no_delete ON payment_audit_log;")
    op.execute("DROP RULE IF EXISTS payment_audit_log_no_update ON payment_audit_log;")
