"""monthly partition helper"""

from alembic import op

revision = "0005_monthly_partition_helper"
down_revision = "0004_processed_events_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION create_notification_log_month_partition(partition_month date)
        RETURNS void AS $$
        DECLARE
            start_date date := date_trunc('month', partition_month)::date;
            end_date date := (date_trunc('month', partition_month) + interval '1 month')::date;
            partition_name text := 'notification_log_' || to_char(start_date, 'YYYY_MM');
        BEGIN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF notification_log FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                start_date,
                end_date
            );
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS create_notification_log_month_partition(date)")
