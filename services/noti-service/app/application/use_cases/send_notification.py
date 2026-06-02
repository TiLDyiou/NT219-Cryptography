import json
from dataclasses import dataclass, field
from typing import Any

from app.domain.entities.notification import NotificationEntity
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.email_gateway import EmailGateway, EmailMessage
from app.domain.ports.notification_repository import NotificationRepository
from app.domain.ports.outbox_repository import OutboxRepository
from app.domain.ports.preference_repository import PreferenceRepository
from app.domain.ports.rate_limiter import RateLimiter
from app.domain.ports.template_renderer import TemplateRenderer
from app.domain.value_objects.recipient import Recipient, content_hash
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.observability.metrics import (
    notification_failed_total,
    notification_opt_out_total,
    notification_rate_limited_total,
    notification_sent_total,
)
from app.infrastructure.persistence.repositories.template_repository import TemplateRepository


@dataclass
class SendNotificationCommand:
    user_id: str
    recipient_email: str
    template_code: str
    category: str
    variables: dict[str, Any]
    reference_type: str | None = None
    reference_id: str | None = None
    priority: str = "normal"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SendNotificationResult:
    status: str
    notification_id: str | None = None
    reason: str | None = None


class SendNotificationUseCase:
    def __init__(
        self,
        session,
        template_repository: TemplateRepository,
        notification_repository: NotificationRepository,
        preference_repository: PreferenceRepository,
        outbox_repository: OutboxRepository,
        renderer: TemplateRenderer,
        email_gateway: EmailGateway,
        rate_limiter: RateLimiter,
        audit_logger: KafkaAuditLogger,
        crypto_service: CryptoService | None = None,
        rate_limit_tokens: int = 10,
        rate_limit_window_seconds: int = 60,
    ):
        self._session = session
        self._templates = template_repository
        self._notifications = notification_repository
        self._preferences = preference_repository
        self._outbox = outbox_repository
        self._renderer = renderer
        self._email = email_gateway
        self._rate_limiter = rate_limiter
        self._audit = audit_logger
        self._crypto = crypto_service
        self._rate_limit_tokens = rate_limit_tokens
        self._rate_limit_window_seconds = rate_limit_window_seconds

    async def execute(self, command: SendNotificationCommand) -> SendNotificationResult:
        template = await self._templates.get_by_code(self._session, command.template_code)
        if template is None:
            return SendNotificationResult("skipped", reason="template_not_found")

        enabled = await self._preferences.is_enabled(
            self._session,
            command.user_id,
            template.channel_id,
            command.category,
        )
        if not enabled:
            notification_opt_out_total.labels(command.category).inc()
            return SendNotificationResult("skipped", reason="preference_opt_out")

        allowed = await self._rate_limiter.allow(
            command.user_id,
            command.category,
            self._rate_limit_tokens,
            self._rate_limit_window_seconds,
        )
        if not allowed:
            notification_rate_limited_total.labels(command.category).inc()
            return SendNotificationResult("skipped", reason="rate_limited")

        rendered = await self._renderer.render(
            template.subject_template,
            template.html_template,
            template.text_template,
            command.variables,
        )
        recipient = Recipient(command.recipient_email)
        encrypted_recipient = None
        encrypted_variables = None
        encrypted_subject = None
        # M-16: khi có crypto, lưu subject ở dạng mã hoá và KHÔNG lưu plaintext.
        stored_subject = rendered.subject
        if self._crypto is not None:
            encrypted_recipient = await self._crypto.encrypt_field(recipient.email)
            encrypted_variables = await self._crypto.encrypt_field(json.dumps(command.variables, default=str))
            encrypted_subject = await self._crypto.encrypt_field(rendered.subject)
            stored_subject = None
        notification = NotificationEntity(
            user_id=command.user_id,
            channel_id=template.channel_id,
            template_id=template.id,
            category=command.category,
            subject=stored_subject,
            subject_encrypted=encrypted_subject,
            content_hash=content_hash(rendered.html_body),
            recipient_masked=recipient.masked,
            recipient_email_encrypted=encrypted_recipient,
            render_variables_encrypted=encrypted_variables,
            reference_type=command.reference_type,
            reference_id=command.reference_id,
            priority=command.priority,
            metadata=command.metadata,
        )
        row = await self._notifications.create(self._session, notification)
        send_result = await self._email.send(
            EmailMessage(
                to_email=recipient.email,
                subject=rendered.subject,
                html_body=rendered.html_body,
                text_body=rendered.text_body,
                headers={"X-Notification-Id": row.id},
            )
        )

        if send_result.success:
            await self._notifications.mark_sent(self._session, row.id, send_result.provider_response)
            await self._outbox.add(
                self._session,
                "notification",
                row.id,
                "notification.delivered",
                {"notification_id": row.id, "user_id": command.user_id, "category": command.category},
            )
            notification_sent_total.labels(command.category).inc()
            final_status = "sent"
        else:
            await self._notifications.mark_failed(
                self._session,
                row.id,
                send_result.error_code,
                send_result.error_message,
            )
            await self._outbox.add(
                self._session,
                "notification",
                row.id,
                "notification.failed",
                {
                    "notification_id": row.id,
                    "user_id": command.user_id,
                    "category": command.category,
                    "error_code": send_result.error_code,
                },
            )
            notification_failed_total.labels(command.category, send_result.error_code or "unknown").inc()
            final_status = "failed"

        await self._audit.log(
            table_name="notification_log",
            record_id=row.id,
            action=final_status,
            new_data={
                "status": final_status,
                "recipient_masked": row.recipient_masked,
                "content_hash": row.content_hash,
            },
        )
        await self._session.commit()
        return SendNotificationResult(final_status, notification_id=row.id)
