from alembic import op

revision = "0005_monthly_partition_helper"
down_revision = "0004_audit_trigger"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(
        """
        CREATE OR REPLACE FUNCTION create_shipping_audit_partition(month_start date)
        RETURNS void AS $$
        DECLARE
          partition_name text := 'shipping_audit_log_' || to_char(month_start, 'YYYY_MM');
          month_end date := month_start + interval '1 month';
        BEGIN
          EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF shipping_audit_log FOR VALUES FROM (%L) TO (%L)',
            partition_name, month_start, month_end
          );
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("DROP FUNCTION IF EXISTS create_shipping_audit_partition(date);")
