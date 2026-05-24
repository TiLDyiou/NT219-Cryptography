from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, Index
from app.infrastructure.persistence.models.base import Base, generate_uuid


class OutboxEventModel(Base):
    __tablename__ = "payment_outbox"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    aggregate_type = Column(String(50), nullable=False)
    aggregate_id = Column(String(36), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending|published|failed
    attempt_count = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    published_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_outbox_pending", "status", "created_at"),
    )
