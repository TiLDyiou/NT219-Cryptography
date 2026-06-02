from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import ARRAY

from app.infrastructure.persistence.models.base import Base, generate_uuid


class AuditLogModel(Base):
    __tablename__ = "order_audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[str] = mapped_column(String(36), nullable=False)
    action: Mapped[str] = mapped_column(String(10), nullable=False)
    old_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    changed_fields: Mapped[list | None] = mapped_column(JSON().with_variant(ARRAY(String), "postgresql"), nullable=True)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    actor_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    correlation_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hmac_signature: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hmac_key_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    __table_args__ = (
        Index("idx_ord_audit_record", "table_name", "record_id"),
        Index("idx_ord_audit_actor", "actor_id"),
        Index("idx_ord_audit_time", "created_at"),
    )
