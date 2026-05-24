from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.models import OutboxEventModel


class PgOutboxRepository:
    async def add_event(
        self,
        session: AsyncSession,
        *,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        session.add(
            OutboxEventModel(
                aggregate_type=aggregate_type,
                aggregate_id=aggregate_id,
                event_type=event_type,
                payload=payload,
            )
        )
        await session.flush()
