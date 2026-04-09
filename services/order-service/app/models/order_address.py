from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, generate_uuid


class OrderAddress(Base):
    __tablename__ = "order_addresses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    order_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    address_type: Mapped[str] = mapped_column(String(10), nullable=False)
    full_name_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    phone_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    email_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    address_line1_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    address_line2_encrypted: Mapped[bytes | None] = mapped_column(
        LargeBinary, nullable=True
    )
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    state_province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    order = relationship("Order", back_populates="addresses")

    __table_args__ = (
        Index("idx_oa_order_type", "order_id", "address_type", unique=True),
    )
