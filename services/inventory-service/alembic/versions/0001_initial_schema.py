"""Initial inventory schema

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-05-24 16:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    dialect = connection.dialect.name

    op.create_table(
        "warehouses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("merchant_id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("address_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("merchant_id", "code", name="uq_wh_merchant_code"),
    )

    item_columns = [
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("variant_id", sa.String(length=36), nullable=True),
        sa.Column("warehouse_id", sa.String(length=36), nullable=False),
        sa.Column("merchant_id", sa.String(length=36), nullable=False),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("quantity_on_hand", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quantity_reserved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_track_inventory", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]

    if dialect == "postgresql":
        item_columns.insert(
            8,
            sa.Column(
                "quantity_available",
                sa.Integer(),
                sa.Computed("quantity_on_hand - quantity_reserved", persisted=True),
                nullable=False,
            ),
        )

    op.create_table(
        "inventory_items",
        *item_columns,
        sa.ForeignKeyConstraint(["warehouse_id"], ["warehouses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("quantity_on_hand >= 0", name="ck_inv_on_hand_nonneg"),
        sa.CheckConstraint("quantity_reserved >= 0", name="ck_inv_reserved_nonneg"),
        sa.CheckConstraint(
            "quantity_reserved <= quantity_on_hand", name="ck_inv_reserved_le_on_hand"
        ),
    )

    if dialect == "postgresql":
        op.execute(
            """
            CREATE UNIQUE INDEX uq_inv_product_variant_wh
            ON inventory_items (
                product_id,
                COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'),
                warehouse_id
            )
            """
        )
    else:
        op.create_index(
            "uq_inv_product_variant_wh",
            "inventory_items",
            ["product_id", "variant_id", "warehouse_id"],
            unique=True,
        )

    op.create_index("idx_inv_product", "inventory_items", ["product_id", "variant_id"])
    op.create_index("idx_inv_merchant", "inventory_items", ["merchant_id"])

    op.create_table(
        "inventory_reservations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("inventory_item_id", sa.String(length=36), nullable=False),
        sa.Column("order_id", sa.String(length=36), nullable=False),
        sa.Column("saga_id", sa.String(length=36), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="held"),
        sa.Column("held_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("release_reason", sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(["inventory_item_id"], ["inventory_items.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("quantity > 0", name="ck_res_quantity_positive"),
    )
    op.create_index("idx_res_item", "inventory_reservations", ["inventory_item_id", "status"])
    op.create_index("idx_res_order", "inventory_reservations", ["order_id"])

    if dialect == "postgresql":
        op.execute(
            """
            CREATE INDEX idx_res_expires
            ON inventory_reservations (expires_at)
            WHERE status = 'held'
            """
        )
    else:
        op.create_index("idx_res_expires", "inventory_reservations", ["expires_at"])


def downgrade() -> None:
    op.drop_table("inventory_reservations")
    op.drop_index("idx_inv_merchant", table_name="inventory_items")
    op.drop_index("idx_inv_product", table_name="inventory_items")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS uq_inv_product_variant_wh")
    else:
        op.drop_index("uq_inv_product_variant_wh", table_name="inventory_items")
    op.drop_table("inventory_items")
    op.drop_table("warehouses")
