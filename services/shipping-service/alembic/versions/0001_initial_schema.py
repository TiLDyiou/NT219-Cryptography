from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shipping_providers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("api_base_url", sa.String(500)),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("supported_countries", sa.JSON(), nullable=False),
        sa.Column("capabilities", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "shipping_rates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("merchant_id", sa.String(36), nullable=False),
        sa.Column("provider_id", sa.String(36), sa.ForeignKey("shipping_providers.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("base_fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("per_kg_fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "shipments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("order_id", sa.String(36), nullable=False),
        sa.Column("merchant_id", sa.String(36), nullable=False),
        sa.Column("provider_id", sa.String(36), sa.ForeignKey("shipping_providers.id"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("recipient_name_encrypted", sa.LargeBinary()),
        sa.Column("recipient_phone_encrypted", sa.LargeBinary()),
        sa.Column("address_line1_encrypted", sa.LargeBinary()),
        sa.Column("address_line2_encrypted", sa.LargeBinary()),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("postal_code", sa.String(30)),
        sa.Column("country_code", sa.String(2), nullable=False),
        sa.Column("dimensions_cm", sa.JSON(), nullable=False),
        sa.Column("tracking_number", sa.String(100)),
        sa.Column("provider_shipment_id", sa.String(100)),
        sa.Column("provider_label_url", sa.String(500)),
        sa.Column("provider_response", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("order_id", name="uq_shipments_order_id"),
    )
    op.create_table(
        "tracking_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("shipment_id", sa.String(36), sa.ForeignKey("shipments.id"), nullable=False),
        sa.Column("provider_event_id", sa.String(100)),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(255)),
        sa.Column("raw_payload", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_ship_rates_merchant", "shipping_rates", ["merchant_id"])
    op.create_index("idx_ship_merchant_status", "shipments", ["merchant_id", "status"])
    op.create_index("idx_ship_tracking_number", "shipments", ["tracking_number"], unique=True)
    op.create_index("idx_tracking_shipment_time", "tracking_events", ["shipment_id", "occurred_at"])


def downgrade() -> None:
    op.drop_table("tracking_events")
    op.drop_table("shipments")
    op.drop_table("shipping_rates")
    op.drop_table("shipping_providers")
