from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, Integer, JSON, DateTime, Index
from app.infrastructure.persistence.models.base import Base


class IdempotencyKeyModel(Base):
    __tablename__ = "idempotency_keys"

    key = Column(String(255), primary_key=True)
    request_path = Column(String(500), nullable=False)
    request_hash = Column(String(64), nullable=False)  # SHA-256 of request body
    response_code = Column(Integer, nullable=True)
    response_body = Column(JSON, nullable=True)
    status = Column(String(20), nullable=False, default="processing")  # processing|completed|failed
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc) + timedelta(hours=24),
    )

    __table_args__ = (
        Index("idx_idemp_expires", "expires_at"),
    )
