from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    Text,
    DateTime,
    JSON,
    ForeignKey,
    UniqueConstraint,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import relationship

from app.models.base import Base, generate_uuid


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cart_id = Column(String(36), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), nullable=False)
    variant_id = Column(String(36), nullable=True)
    merchant_id = Column(String(36), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price_snapshot = Column(Numeric(15, 2), nullable=False)
    product_name_snapshot = Column(String(500), nullable=False)
    variant_label_snapshot = Column(String(255), nullable=True)
    image_url_snapshot = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=False, default={})
    added_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")

    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", "variant_id", name="uq_cart_item_sku_variant"),
        Index("idx_ci_cart", "cart_id"),
        CheckConstraint("quantity > 0 AND quantity <= 999", name="ck_cart_items_quantity"),
    )
