import asyncio
import logging
from datetime import datetime, timezone

from app.infrastructure.observability.metrics import notification_retry_total

logger = logging.getLogger(__name__)

retry_shutdown_event = asyncio.Event()


async def run_retry_worker(session_factory, container, interval_seconds: float = 30.0) -> None:
    logger.info("Notification retry worker started")
    while not retry_shutdown_event.is_set():
        try:
            async with session_factory() as session:
                rows = await container.notification_repository.list_retryable(session)
                for row in rows:
                    notification_retry_total.labels(row.category).inc()
                    use_case = container.retry_failed_notification_use_case(session)
                    result = await use_case.execute(row)
                    if result is None and row.expires_at <= datetime.now(timezone.utc):
                        row.status = "expired"
                    await session.flush()
                await session.commit()
        except Exception:
            logger.exception("Notification retry worker iteration failed")
        await asyncio.sleep(interval_seconds)
    logger.info("Notification retry worker stopped")
