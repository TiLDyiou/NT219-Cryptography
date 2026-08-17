import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from app.infrastructure.persistence.models.outbox import OutboxEventModel
from app.domain.ports.event_publisher import EventPublisher

logger = logging.getLogger(__name__)

shutdown_event = asyncio.Event()
MAX_ATTEMPTS = 5
BATCH_SIZE = 50


async def run_outbox_worker(
    session_factory: async_sessionmaker,
    publisher: EventPublisher,
) -> None:
    logger.info("Outbox worker started")
    while not shutdown_event.is_set():
        try:
            async with session_factory() as session:
                # We do manual transaction handling to prevent rolling back other events on failure
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

                for ev in events:
                    try:
                        logger.info("Outbox worker processing event %s (ID: %s)", ev.event_type, ev.id)
                        await publisher.publish(
                            event_type=ev.event_type,
                            aggregate_id=ev.aggregate_id,
                            payload=ev.payload,
                        )
                        ev.status = "published"
                        ev.published_at = datetime.now(timezone.utc)
                    except Exception as e:
                        logger.exception("Failed to publish outbox event %s", ev.id)
                        ev.attempt_count += 1
                        ev.last_error = str(e)[:1000]
                        if ev.attempt_count >= MAX_ATTEMPTS:
                            ev.status = "failed"
                            logger.error("Outbox event %s reached max retry attempts. Status set to FAILED", ev.id)

                    await session.flush()

                # Commit all updates for the current batch
                await session.commit()

        except Exception:
            logger.exception("Outbox worker iteration failed")
            await asyncio.sleep(1.0)

    logger.info("Outbox worker stopped gracefully")
