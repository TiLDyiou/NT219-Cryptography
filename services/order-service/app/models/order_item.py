from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, generate_uuid


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str] = mapped_column(String(36), nullable=False)
    variant_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    merchant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(500), nullable=False)
    variant_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    fulfilled_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")

    __table_args__ = (
        Index("idx_oi_order", "order_id"),
        Index("idx_oi_product", "product_id"),
    )

