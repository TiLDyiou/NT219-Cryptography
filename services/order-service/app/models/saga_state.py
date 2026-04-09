from datetime import datetime, timedelta

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, generate_uuid


def default_expires_at() -> datetime:
    return datetime.utcnow() + timedelta(minutes=30)


class SagaState(Base):
    __tablename__ = "saga_state"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    saga_type: Mapped[str] = mapped_column(String(50), nullable=False, default="checkout")
    current_step: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    steps_completed: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    steps_remaining: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    compensation_log: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    error_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=default_expires_at)

    order = relationship("Order", back_populates="saga_state")

    __table_args__ = (
        UniqueConstraint("order_id", "saga_type", name="uq_saga_order_type"),
        Index("idx_saga_status", "status"),
        Index("idx_saga_expires", "expires_at"),
    )

