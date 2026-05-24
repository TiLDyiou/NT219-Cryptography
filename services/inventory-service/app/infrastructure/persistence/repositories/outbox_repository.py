from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.ports.outbox_repository import OutboxRepository
from app.infrastructure.persistence.models import OutboxEventModel


class PgOutboxRepository(OutboxRepository):
    async def save_event(
        self,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
        session: AsyncSession,
    ) -> None:
        row = OutboxEventModel(
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            event_type=event_type,
            payload=payload,
            status="pending",
        )
        session.add(row)
        await session.flush()
