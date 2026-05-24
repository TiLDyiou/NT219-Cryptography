from typing import Any
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.ports.outbox_repository import OutboxRepository
from app.infrastructure.persistence.models.outbox import OutboxEventModel


class PgOutboxRepository(OutboxRepository):
    async def save_event(
        self,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
        session: Any = None,
    ) -> None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
            
        db_obj = OutboxEventModel(
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            event_type=event_type,
            payload=payload,
            status="pending",
            attempt_count=0,
            created_at=datetime.now(timezone.utc),
        )
        session.add(db_obj)
        await session.flush()

    async def get_pending_events(self, limit: int, session: Any = None) -> list[dict[str, Any]]:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
            
        stmt = (
            select(OutboxEventModel)
            .where(OutboxEventModel.status == "pending")
            .where(OutboxEventModel.attempt_count < 5)  # MAX_ATTEMPTS = 5
            .order_by(OutboxEventModel.created_at.asc())
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        result = await session.execute(stmt)
        events = result.scalars().all()
        return [
            {
                "id": ev.id,
                "aggregate_type": ev.aggregate_type,
                "aggregate_id": ev.aggregate_id,
                "event_type": ev.event_type,
                "payload": ev.payload,
                "attempt_count": ev.attempt_count,
            }
            for ev in events
        ]

    async def mark_as_published(self, event_id: str, session: Any = None) -> None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
        db_obj = await session.get(OutboxEventModel, event_id)
        if db_obj:
            db_obj.status = "published"
            db_obj.published_at = datetime.now(timezone.utc)
            await session.flush()

    async def mark_as_failed(self, event_id: str, error_msg: str, session: Any = None) -> None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
        db_obj = await session.get(OutboxEventModel, event_id)
        if db_obj:
            db_obj.attempt_count += 1
            db_obj.last_error = error_msg[:1000]
            if db_obj.attempt_count >= 5:
                db_obj.status = "failed"
            await session.flush()
            
            # Commit immediately to preserve error log if session gets rolled back
            await session.commit()
