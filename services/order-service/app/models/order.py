from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, generate_uuid


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    order_group_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    parent_order_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
    )
    order_number: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    merchant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending_payment", index=True)
    subtotal: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    shipping_fee: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    item_count: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    payment_method_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    shipment_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    fraud_score: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    fraud_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    fraud_trace_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    idempotency_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    customer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    parent_order = relationship("Order", remote_side=[id], backref="child_orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    addresses = relationship("OrderAddress", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")
    saga_state = relationship("SagaState", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("idempotency_key", "merchant_id", name="uq_orders_idempotency_merchant"),
        Index("idx_ord_group", "order_group_id"),
        Index("idx_ord_user_created", "user_id", "created_at"),
        Index("idx_ord_merchant_status", "merchant_id", "status"),
    )

