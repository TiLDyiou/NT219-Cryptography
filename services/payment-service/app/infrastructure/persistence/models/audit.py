from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, Integer, Index
from sqlalchemy.dialects.postgresql import ARRAY
from app.infrastructure.persistence.models.base import Base, generate_uuid


class AuditLogModel(Base):
    __tablename__ = "payment_audit_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(36), nullable=False)
    action = Column(String(10), nullable=False)  # INSERT|UPDATE|DELETE
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    changed_fields = Column(JSON().with_variant(ARRAY(String), "postgresql"), nullable=True)  # JSON list for SQLite compat; ARRAY(String) on Postgres
    actor_id = Column(String(36), nullable=True)
    actor_type = Column(String(20), nullable=True)  # user|merchant|admin|system|migration
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True) if False else Column(String(500), nullable=True)  # custom mapping
    correlation_id = Column(String(255), nullable=True)
    hmac_signature = Column(String(128), nullable=True)  # STRIDE DB tamper detection
    hmac_key_version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), primary_key=True, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_pay_audit_record", "table_name", "record_id"),
        Index("idx_pay_audit_actor", "actor_id"),
        Index("idx_pay_audit_time", "created_at"),
    )
