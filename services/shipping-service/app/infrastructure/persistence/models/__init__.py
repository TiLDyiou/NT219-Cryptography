from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)

from app.infrastructure.persistence.models.base import Base, generate_uuid


class ShippingProviderModel(Base):
    __tablename__ = "shipping_providers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    api_base_url = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    supported_countries = Column(JSON, nullable=False, default=lambda: ["VN"])
    capabilities = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class ShippingRateModel(Base):
    __tablename__ = "shipping_rates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), nullable=False)
    provider_id = Column(String(36), ForeignKey("shipping_providers.id"), nullable=False)
    name = Column(String(255), nullable=False)
    base_fee = Column(Numeric(12, 2), nullable=False)
    per_kg_fee = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="VND")
    is_active = Column(Boolean, nullable=False, default=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("idx_ship_rates_merchant", "merchant_id"),)


class ShipmentModel(Base):
    __tablename__ = "shipments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), nullable=False)
    merchant_id = Column(String(36), nullable=False)
    provider_id = Column(String(36), ForeignKey("shipping_providers.id"), nullable=False)
    status = Column(String(30), nullable=False, default="pending")
    recipient_name_encrypted = Column(LargeBinary, nullable=True)
    recipient_phone_encrypted = Column(LargeBinary, nullable=True)
    address_line1_encrypted = Column(LargeBinary, nullable=True)
    address_line2_encrypted = Column(LargeBinary, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(30), nullable=True)
    country_code = Column(String(2), nullable=False, default="VN")
    dimensions_cm = Column(JSON, nullable=False, default=dict)
    tracking_number = Column(String(100), nullable=True)
    provider_shipment_id = Column(String(100), nullable=True)
    provider_label_url = Column(String(500), nullable=True)
    provider_response = Column(JSON, nullable=False, default=dict)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("order_id", name="uq_shipments_order_id"),
        Index("idx_ship_merchant_status", "merchant_id", "status"),
        Index("idx_ship_tracking_number", "tracking_number", unique=True),
    )


class TrackingEventModel(Base):
    __tablename__ = "tracking_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    shipment_id = Column(String(36), ForeignKey("shipments.id"), nullable=False)
    provider_event_id = Column(String(100), nullable=True)
    status = Column(String(30), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=True)
    raw_payload = Column(JSON, nullable=False, default=dict)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("idx_tracking_shipment_time", "shipment_id", "occurred_at"),)


class OutboxEventModel(Base):
    __tablename__ = "shipping_outbox"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    aggregate_type = Column(String(50), nullable=False)
    aggregate_id = Column(String(36), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    attempt_count = Column(Integer, nullable=False, default=0)
    last_error = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    published_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("idx_ship_outbox_pending", "status", "created_at"),)


class AuditLogModel(Base):
    __tablename__ = "shipping_audit_log"

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
    created_at = Column(DateTime(timezone=True), primary_key=True, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_ship_audit_record", "table_name", "record_id"),
        Index("idx_ship_audit_actor", "actor_id"),
        Index("idx_ship_audit_time", "created_at"),
    )


__all__ = [
    "Base",
    "generate_uuid",
    "ShippingProviderModel",
    "ShippingRateModel",
    "ShipmentModel",
    "TrackingEventModel",
    "OutboxEventModel",
    "AuditLogModel",
]
