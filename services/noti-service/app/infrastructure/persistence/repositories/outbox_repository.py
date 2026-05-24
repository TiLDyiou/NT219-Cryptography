from typing import Any

from app.domain.ports.outbox_repository import OutboxRepository
from app.infrastructure.persistence.models import NotificationOutboxModel


class PgOutboxRepository(OutboxRepository):
    async def add(
        self,
        session,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> NotificationOutboxModel:
        event = NotificationOutboxModel(
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            event_type=event_type,
            payload=payload,
        )
        session.add(event)
        await session.flush()
        return event
