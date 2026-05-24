"""create monthly partition helper for inventory audit log

Revision ID: 0005_monthly_partition_helper
Revises: 0004_audit_trigger
Create Date: 2026-05-24 16:20:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005_monthly_partition_helper"
down_revision: Union[str, None] = "0004_audit_trigger"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return

    op.execute(
        """
        CREATE OR REPLACE FUNCTION create_next_inventory_audit_partition(target_date TIMESTAMPTZ)
        RETURNS VOID AS $$
        DECLARE
            partition_name TEXT;
            start_date TIMESTAMPTZ;
            end_date TIMESTAMPTZ;
        BEGIN
            start_date := date_trunc('month', target_date);
            end_date := start_date + interval '1 month';
            partition_name := 'inventory_audit_log_' || to_char(start_date, 'YYYY_MM');

            IF NOT EXISTS (
                SELECT 1 FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relname = partition_name
            ) THEN
                EXECUTE format(
                    'CREATE TABLE %I PARTITION OF inventory_audit_log FOR VALUES FROM (%L) TO (%L)',
                    partition_name, start_date, end_date
                );
            END IF;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return
    op.execute("DROP FUNCTION IF EXISTS create_next_inventory_audit_partition(TIMESTAMPTZ);")
