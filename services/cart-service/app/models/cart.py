from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, Numeric, Text, DateTime, JSON, Index, CheckConstraint
from sqlalchemy.orm import relationship

from app.core.config import settings
from app.models.base import Base, generate_uuid


def default_expires_at() -> datetime:
    return datetime.utcnow() + timedelta(days=settings.CART_TTL_DAYS)


class Cart(Base):
    __tablename__ = "carts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    merchant_id = Column(String(36), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    currency_code = Column(String(3), nullable=False, default="VND")
    subtotal = Column(Numeric(15, 2), nullable=False, default=0)
    item_count = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=False, default={})
    expires_at = Column(DateTime, nullable=False, default=default_expires_at, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    version = Column(Integer, nullable=False, default=1)

    items = relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("status IN ('active','converted','expired')", name="ck_carts_status"),
        Index("idx_carts_user", "user_id", "merchant_id", "status"),
        Index("idx_carts_expires", "expires_at"),
    )
