"""processed inbound events"""

from alembic import op
import sqlalchemy as sa

revision = "0004_processed_events_table"
down_revision = "0003_audit_log_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "processed_inbound_events",
        sa.Column("event_id", sa.String(100), primary_key=True),
        sa.Column("source_topic", sa.String(100), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ttl_expires_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("processed_inbound_events")
