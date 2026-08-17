import logging

from aiokafka import AIOKafkaConsumer

from app.core.config import KafkaConfig
from app.domain.ports.crypto_service import CryptoService
from app.domain.value_objects.order_status import OrderStatus
from app.infrastructure.messaging.kafka_consumer import KafkaEventConsumer, create_kafka_consumer
from app.infrastructure.persistence.database import AsyncSessionLocal
from app.infrastructure.persistence.repositories.pg_order_repository import PgOrderRepository

logger = logging.getLogger(__name__)


async def _handle_payment_event(envelope: dict) -> None:
    event_type = envelope.get("event_type")
    payload = envelope.get("payload", {})
    order_id = payload.get("order_id")

    if not order_id:
        logger.warning("Payment event missing order_id: %s", event_type)
        return

    async with AsyncSessionLocal() as session:
        repo = PgOrderRepository(session)
        try:
            order = await repo.get_order_by_id(order_id)
        except Exception:
            logger.warning("Order %s not found for payment event %s", order_id, event_type)
            return

        if event_type == "PaymentCompleted":
            target_status = OrderStatus.CONFIRMED
        elif event_type == "PaymentFailed":
            target_status = OrderStatus.PAYMENT_FAILED
        else:
            logger.debug("Ignoring payment event type: %s", event_type)
            return

        orders = [order]
        if order.is_parent:
            orders.extend(await repo.find_children_by_parent(order.id))

        for current_order in orders:
            try:
                current_order.transition_to(target_status)
                await repo.update_order(current_order)
                logger.info(
                    "Order %s -> %s via %s",
                    current_order.id,
                    target_status.value,
                    event_type,
                )
            except ValueError as exc:
                # Invalid state machine transition — likely already processed (idempotent)
                logger.warning("Skipping order %s transition: %s", current_order.id, exc)


async def build_payment_event_consumer(
    config: KafkaConfig,
    crypto_service: CryptoService,
) -> KafkaEventConsumer:
    topic = getattr(config, "topic_payment_events", "payment.events")
    raw_consumer: AIOKafkaConsumer = await create_kafka_consumer(config, [topic])
    return KafkaEventConsumer(
        consumer=raw_consumer,
        crypto_service=crypto_service,
        handler=_handle_payment_event,
    )
