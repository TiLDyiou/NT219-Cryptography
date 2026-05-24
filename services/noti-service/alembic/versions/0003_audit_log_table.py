"""notification audit log"""

from alembic import op
import sqlalchemy as sa

revision = "0003_audit_log_table"
down_revision = "0002_outbox_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", sa.String(36), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("old_data", sa.JSON()),
        sa.Column("new_data", sa.JSON()),
        sa.Column("hmac_signature", sa.String(128)),
        sa.Column("hmac_key_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("actor_id", sa.String(36)),
        sa.Column("correlation_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_notification_audit_record", "notification_audit_log", ["table_name", "record_id"])
    op.create_index("idx_notification_audit_time", "notification_audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("notification_audit_log")
