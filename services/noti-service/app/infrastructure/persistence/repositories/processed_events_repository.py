from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError

from app.infrastructure.persistence.models import ProcessedInboundEventModel


class ProcessedEventsRepository:
    async def mark_processed(self, session, event_id: str, source_topic: str, ttl_seconds: int) -> bool:
        row = ProcessedInboundEventModel(
            event_id=event_id,
            source_topic=source_topic,
            ttl_expires_at=datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
        )
        session.add(row)
        try:
            await session.flush()
            return True
        except IntegrityError:
            await session.rollback()
            return False
