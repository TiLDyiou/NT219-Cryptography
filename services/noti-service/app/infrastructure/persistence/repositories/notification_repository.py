from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.domain.entities.notification import NotificationEntity
from app.domain.ports.notification_repository import NotificationRepository
from app.infrastructure.persistence.models import NotificationDeliveryAttemptModel, NotificationLogModel


BACKOFF_SECONDS = [60, 300, 900, 3600, 21600]


class PgNotificationRepository(NotificationRepository):
    async def create(self, session, notification: NotificationEntity) -> NotificationLogModel:
        model = NotificationLogModel(
            user_id=notification.user_id,
            channel_id=notification.channel_id,
            template_id=notification.template_id,
            category=notification.category,
            subject=notification.subject,
            subject_encrypted=notification.subject_encrypted,
            content_hash=notification.content_hash,
            recipient_masked=notification.recipient_masked,
            recipient_email_encrypted=notification.recipient_email_encrypted,
            render_variables_encrypted=notification.render_variables_encrypted,
            status=notification.status.value,
            reference_type=notification.reference_type,
            reference_id=notification.reference_id,
            priority=notification.priority,
            attempt_count=notification.attempt_count,
            max_attempts=notification.max_attempts,
            metadata_json=notification.metadata,
        )
        session.add(model)
        await session.flush()
        return model

    async def record_attempt(
        self,
        session,
        notification_id: str,
        status: str,
        provider_response: dict | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
    ) -> NotificationDeliveryAttemptModel:
        row = await self.get(session, notification_id)
        attempt_number = 1 if row is None else row.attempt_count + 1
        attempt = NotificationDeliveryAttemptModel(
            notification_id=notification_id,
            attempt_number=attempt_number,
            status=status,
            provider_response=provider_response,
            error_code=error_code,
            error_message=error_message,
        )
        session.add(attempt)
        await session.flush()
        return attempt

    async def mark_sent(self, session, notification_id: str, provider_response: dict | None = None) -> None:
        row = await self.get(session, notification_id)
        if row is None:
            return
        now = datetime.now(timezone.utc)
        row.status = "sent"
        row.attempt_count += 1
        row.last_attempt_at = now
        row.delivered_at = now
        row.error_code = None
        row.next_retry_at = None
        row.updated_at = now
        await self.record_attempt(session, notification_id, "sent", provider_response)

    async def mark_failed(
        self,
        session,
        notification_id: str,
        error_code: str | None,
        error_message: str | None,
    ) -> None:
        row = await self.get(session, notification_id)
        if row is None:
            return
        now = datetime.now(timezone.utc)
        row.status = "failed"
        row.attempt_count += 1
        row.last_attempt_at = now
        row.failed_at = now
        row.error_code = error_code
        index = min(max(row.attempt_count - 1, 0), len(BACKOFF_SECONDS) - 1)
        row.next_retry_at = now + timedelta(seconds=BACKOFF_SECONDS[index])
        row.updated_at = now
        await self.record_attempt(session, notification_id, "failed", None, error_code, error_message)

    async def get(self, session, notification_id: str) -> NotificationLogModel | None:
        result = await session.execute(select(NotificationLogModel).where(NotificationLogModel.id == notification_id))
        return result.scalar_one_or_none()

    async def list_retryable(self, session, limit: int = 50) -> list[NotificationLogModel]:
        now = datetime.now(timezone.utc)
        result = await session.execute(
            select(NotificationLogModel)
            .where(NotificationLogModel.status == "failed")
            .where(NotificationLogModel.next_retry_at <= now)
            .where(NotificationLogModel.attempt_count < NotificationLogModel.max_attempts)
            .where(NotificationLogModel.expires_at > now)
            .order_by(NotificationLogModel.next_retry_at.asc())
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        return list(result.scalars().all())
