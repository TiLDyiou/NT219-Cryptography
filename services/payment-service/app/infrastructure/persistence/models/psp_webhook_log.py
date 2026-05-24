from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Text, UniqueConstraint, Index
from app.infrastructure.persistence.models.base import Base, generate_uuid


class PspWebhookLogModel(Base):
    __tablename__ = "psp_webhook_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    psp_provider = Column(String(30), nullable=False)
    event_type = Column(String(100), nullable=False)
    event_id = Column(String(255), nullable=False)  # Stripe event ID
    payload = Column(JSON, nullable=False)
    signature = Column(Text, nullable=False)  # webhook HMAC signature
    is_verified = Column(Boolean, nullable=False, default=False)
    is_processed = Column(Boolean, nullable=False, default=False)
    processing_error = Column(Text, nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("psp_provider", "event_id", name="uq_psp_webhook_event"),
        Index("idx_wh_unprocessed", "is_processed"),
    )
