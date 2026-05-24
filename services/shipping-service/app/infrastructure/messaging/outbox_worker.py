import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.domain.ports.event_publisher import EventPublisher
from app.infrastructure.persistence.models import OutboxEventModel

logger = logging.getLogger(__name__)

shutdown_event = asyncio.Event()
MAX_ATTEMPTS = 5
BATCH_SIZE = 50


async def run_outbox_worker(session_factory: async_sessionmaker, publisher: EventPublisher) -> None:
    logger.info("Shipping outbox worker started")
    while not shutdown_event.is_set():
        try:
            async with session_factory() as session:
                stmt = (
                    select(OutboxEventModel)
                    .where(OutboxEventModel.status == "pending")
                    .where(OutboxEventModel.attempt_count < MAX_ATTEMPTS)
                    .order_by(OutboxEventModel.created_at.asc())
                    .limit(BATCH_SIZE)
                    .with_for_update(skip_locked=True)
                )
                result = await session.execute(stmt)
                events = result.scalars().all()
                if not events:
                    await asyncio.sleep(0.5)
                    continue

                for event in events:
                    try:
                        await publisher.publish(event.event_type, event.aggregate_id, event.payload)
                        event.status = "published"
                        event.published_at = datetime.now(timezone.utc)
                    except Exception as exc:
                        logger.exception("Failed to publish outbox event %s", event.id)
                        event.attempt_count += 1
                        event.last_error = str(exc)[:1000]
                        if event.attempt_count >= MAX_ATTEMPTS:
                            event.status = "failed"
                    await session.flush()
                await session.commit()
        except Exception:
            logger.exception("Shipping outbox worker iteration failed")
            await asyncio.sleep(1.0)
    logger.info("Shipping outbox worker stopped")
