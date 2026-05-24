from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, JSON, LargeBinary, String, Text, UniqueConstraint

from app.infrastructure.persistence.models.base import Base, generate_uuid


class NotificationChannelModel(Base):
    __tablename__ = "notification_channels"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(30), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    config = Column(JSON, nullable=False, default=dict)
    rate_limit = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class NotificationTemplateModel(Base):
    __tablename__ = "notification_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(100), nullable=False, unique=True)
    channel_id = Column(String(36), ForeignKey("notification_channels.id"), nullable=False)
    category = Column(String(50), nullable=False)
    subject_template = Column(String(500), nullable=False)
    html_template = Column(Text, nullable=False)
    text_template = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    variables = Column(JSON, nullable=False, default=list)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class UserNotificationPreferenceModel(Base):
    __tablename__ = "user_notification_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False)
    channel_id = Column(String(36), ForeignKey("notification_channels.id"), nullable=False)
    category = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_id", "channel_id", "category", name="uq_user_notification_pref"),
        Index("idx_unp_user", "user_id"),
    )


class NotificationLogModel(Base):
    __tablename__ = "notification_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False)
    channel_id = Column(String(36), ForeignKey("notification_channels.id"), nullable=False)
    template_id = Column(String(36), ForeignKey("notification_templates.id"), nullable=True)
    category = Column(String(50), nullable=False)
    subject = Column(String(500), nullable=True)
    content_hash = Column(String(64), nullable=True)
    recipient_masked = Column(String(255), nullable=True)
    recipient_email_encrypted = Column(LargeBinary, nullable=True)
    render_variables_encrypted = Column(LargeBinary, nullable=True)
    status = Column(String(20), nullable=False, default="queued")
    reference_type = Column(String(30), nullable=True)
    reference_id = Column(String(36), nullable=True)
    priority = Column(String(10), nullable=False, default="normal")
    attempt_count = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    error_code = Column(String(100), nullable=True)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc) + timedelta(hours=72),
    )

    __table_args__ = (
        Index("idx_nl_user", "user_id", "created_at"),
        Index("idx_nl_reference", "reference_type", "reference_id"),
        Index("idx_nl_status", "status"),
        Index("idx_nl_retry", "next_retry_at"),
        Index("idx_nl_category", "category", "created_at"),
    )


class NotificationDeliveryAttemptModel(Base):
    __tablename__ = "notification_delivery_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    notification_id = Column(String(36), ForeignKey("notification_log.id"), nullable=False)
    attempt_number = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    provider_response = Column(JSON, nullable=True)
    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    attempted_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("idx_nda_notif", "notification_id"),)


class NotificationOutboxModel(Base):
    __tablename__ = "notification_outbox"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    aggregate_type = Column(String(50), nullable=False)
    aggregate_id = Column(String(36), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    attempt_count = Column(Integer, nullable=False, default=0)
    last_error = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    published_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("idx_notification_outbox_pending", "status", "created_at"),)


class NotificationAuditLogModel(Base):
    __tablename__ = "notification_audit_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(36), nullable=False)
    action = Column(String(20), nullable=False)
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    hmac_signature = Column(String(128), nullable=True)
    hmac_key_version = Column(Integer, nullable=False, default=1)
    actor_id = Column(String(36), nullable=True)
    correlation_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_notification_audit_record", "table_name", "record_id"),
        Index("idx_notification_audit_time", "created_at"),
    )


class ProcessedInboundEventModel(Base):
    __tablename__ = "processed_inbound_events"

    event_id = Column(String(100), primary_key=True)
    source_topic = Column(String(100), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    ttl_expires_at = Column(DateTime(timezone=True), nullable=False)


__all__ = [
    "Base",
    "generate_uuid",
    "NotificationChannelModel",
    "NotificationTemplateModel",
    "UserNotificationPreferenceModel",
    "NotificationLogModel",
    "NotificationDeliveryAttemptModel",
    "NotificationOutboxModel",
    "NotificationAuditLogModel",
    "ProcessedInboundEventModel",
]
