from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, JSON, LargeBinary, String

from app.infrastructure.persistence.models.base import Base, generate_uuid


class WarehouseModel(Base):
    __tablename__ = "warehouses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    address_encrypted = Column(LargeBinary, nullable=True)
    city = Column(String(100), nullable=True)
    country_code = Column(String(2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    priority = Column(Integer, nullable=False, default=0)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (Index("uq_wh_merchant_code", "merchant_id", "code", unique=True),)


class InventoryItemModel(Base):
    __tablename__ = "inventory_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), nullable=False)
    variant_id = Column(String(36), nullable=True)
    warehouse_id = Column(String(36), nullable=False)
    merchant_id = Column(String(36), nullable=False)
    sku = Column(String(100), nullable=False)
    quantity_on_hand = Column(Integer, nullable=False, default=0)
    quantity_reserved = Column(Integer, nullable=False, default=0)
    is_track_inventory = Column(Boolean, nullable=False, default=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_inv_product", "product_id", "variant_id"),
        Index("idx_inv_merchant", "merchant_id"),
    )


class InventoryReservationModel(Base):
    __tablename__ = "inventory_reservations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    inventory_item_id = Column(String(36), nullable=False)
    order_id = Column(String(36), nullable=False)
    saga_id = Column(String(36), nullable=True)
    quantity = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="held")
    held_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    released_at = Column(DateTime(timezone=True), nullable=True)
    release_reason = Column(String(50), nullable=True)

    __table_args__ = (
        Index("idx_res_item", "inventory_item_id", "status"),
        Index("idx_res_order", "order_id"),
        Index("idx_res_expires", "expires_at"),
    )


class OutboxEventModel(Base):
    __tablename__ = "inventory_outbox"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    aggregate_type = Column(String(50), nullable=False)
    aggregate_id = Column(String(36), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    attempt_count = Column(Integer, nullable=False, default=0)
    last_error = Column(String(1000), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    published_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("idx_inv_outbox_pending", "status", "created_at"),)


class AuditLogModel(Base):
    __tablename__ = "inventory_audit_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(36), nullable=False)
    action = Column(String(10), nullable=False)
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    changed_fields = Column(JSON, nullable=True)
    actor_id = Column(String(36), nullable=True)
    actor_type = Column(String(20), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)
    correlation_id = Column(String(255), nullable=True)
    hmac_signature = Column(String(128), nullable=True)
    hmac_key_version = Column(Integer, nullable=False, default=1)
    created_at = Column(
        DateTime(timezone=True), primary_key=True, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_inv_audit_record", "table_name", "record_id"),
        Index("idx_inv_audit_actor", "actor_id"),
        Index("idx_inv_audit_time", "created_at"),
    )


__all__ = [
    "Base",
    "generate_uuid",
    "WarehouseModel",
    "InventoryItemModel",
    "InventoryReservationModel",
    "OutboxEventModel",
    "AuditLogModel",
]
