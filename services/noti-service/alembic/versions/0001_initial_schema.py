"""initial notification schema"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_channels",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(50)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("config", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("rate_limit", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "notification_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(100), nullable=False, unique=True),
        sa.Column("channel_id", sa.String(36), sa.ForeignKey("notification_channels.id"), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("subject_template", sa.String(500), nullable=False),
        sa.Column("html_template", sa.Text(), nullable=False),
        sa.Column("text_template", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("variables", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "user_notification_preferences",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("channel_id", sa.String(36), sa.ForeignKey("notification_channels.id"), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "channel_id", "category", name="uq_user_notification_pref"),
    )
    op.create_index("idx_unp_user", "user_notification_preferences", ["user_id"])
    op.create_table(
        "notification_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("channel_id", sa.String(36), sa.ForeignKey("notification_channels.id"), nullable=False),
        sa.Column("template_id", sa.String(36), sa.ForeignKey("notification_templates.id")),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("subject", sa.String(500)),
        sa.Column("content_hash", sa.String(64)),
        sa.Column("recipient_masked", sa.String(255)),
        sa.Column("recipient_email_encrypted", sa.LargeBinary()),
        sa.Column("render_variables_encrypted", sa.LargeBinary()),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("reference_type", sa.String(30)),
        sa.Column("reference_id", sa.String(36)),
        sa.Column("priority", sa.String(10), nullable=False, server_default="normal"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("failed_at", sa.DateTime(timezone=True)),
        sa.Column("next_retry_at", sa.DateTime(timezone=True)),
        sa.Column("error_code", sa.String(100)),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now() + interval '72 hours'")),
    )
    op.create_index("idx_nl_user", "notification_log", ["user_id", "created_at"])
    op.create_index("idx_nl_reference", "notification_log", ["reference_type", "reference_id"])
    op.create_index("idx_nl_status", "notification_log", ["status"])
    op.create_index("idx_nl_retry", "notification_log", ["next_retry_at"])
    op.create_index("idx_nl_category", "notification_log", ["category", "created_at"])
    op.create_table(
        "notification_delivery_attempts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("notification_id", sa.String(36), sa.ForeignKey("notification_log.id"), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provider_response", sa.JSON()),
        sa.Column("error_code", sa.String(100)),
        sa.Column("error_message", sa.Text()),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_nda_notif", "notification_delivery_attempts", ["notification_id"])


def downgrade() -> None:
    op.drop_table("notification_delivery_attempts")
    op.drop_table("notification_log")
    op.drop_table("user_notification_preferences")
    op.drop_table("notification_templates")
    op.drop_table("notification_channels")
