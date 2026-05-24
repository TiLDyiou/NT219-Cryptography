from alembic import op
import sqlalchemy as sa

revision = "0003_audit_log_partitioned"
down_revision = "0002_outbox_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shipping_audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", sa.String(36), nullable=False),
        sa.Column("action", sa.String(10), nullable=False),
        sa.Column("old_data", sa.JSON()),
        sa.Column("new_data", sa.JSON()),
        sa.Column("changed_fields", sa.JSON()),
        sa.Column("actor_id", sa.String(36)),
        sa.Column("actor_type", sa.String(20)),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("correlation_id", sa.String(255)),
        sa.Column("hmac_signature", sa.String(128)),
        sa.Column("hmac_key_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), primary_key=True, nullable=False),
    )
    op.create_index("idx_ship_audit_record", "shipping_audit_log", ["table_name", "record_id"])
    op.create_index("idx_ship_audit_actor", "shipping_audit_log", ["actor_id"])
    op.create_index("idx_ship_audit_time", "shipping_audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("shipping_audit_log")
