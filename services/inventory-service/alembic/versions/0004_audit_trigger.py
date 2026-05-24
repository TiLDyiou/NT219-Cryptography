"""create inventory audit triggers

Revision ID: 0004_audit_trigger
Revises: 0003_audit_log_partitioned
Create Date: 2026-05-24 16:15:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0004_audit_trigger"
down_revision: Union[str, None] = "0003_audit_log_partitioned"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return

    op.execute(
        """
        CREATE OR REPLACE FUNCTION audit_inventory_changes()
        RETURNS TRIGGER AS $$
        DECLARE
            old_row JSONB := NULL;
            new_row JSONB := NULL;
            diff_cols VARCHAR(100)[] := '{}';
        BEGIN
            IF TG_OP = 'DELETE' THEN
                old_row := to_jsonb(OLD);
            ELSIF TG_OP = 'INSERT' THEN
                new_row := to_jsonb(NEW);
            ELSIF TG_OP = 'UPDATE' THEN
                old_row := to_jsonb(OLD);
                new_row := to_jsonb(NEW);
                SELECT array_agg(key) INTO diff_cols
                FROM jsonb_each(new_row)
                WHERE new_row->key IS DISTINCT FROM old_row->key;
            END IF;

            INSERT INTO inventory_audit_log (
                id, table_name, record_id, action, old_data, new_data,
                changed_fields, actor_type, hmac_key_version, created_at
            ) VALUES (
                gen_random_uuid(), TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP,
                old_row, new_row, diff_cols, 'system', 1, NOW()
            );
            RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE TRIGGER trg_audit_warehouses
        AFTER INSERT OR UPDATE OR DELETE ON warehouses
        FOR EACH ROW EXECUTE FUNCTION audit_inventory_changes();
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_audit_inventory_items
        AFTER INSERT OR UPDATE OR DELETE ON inventory_items
        FOR EACH ROW EXECUTE FUNCTION audit_inventory_changes();
        """
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return
    op.execute("DROP TRIGGER IF EXISTS trg_audit_warehouses ON warehouses;")
    op.execute("DROP TRIGGER IF EXISTS trg_audit_inventory_items ON inventory_items;")
    op.execute("DROP FUNCTION IF EXISTS audit_inventory_changes();")
