import json
import logging
from typing import Callable

from aiokafka import AIOKafkaConsumer

from app.core.config import KafkaConfig
from app.domain.ports.crypto_service import CryptoService

logger = logging.getLogger(__name__)


class KafkaEventConsumer:
    def __init__(
        self,
        consumer: AIOKafkaConsumer,
        crypto_service: CryptoService,
        handler: Callable[[dict], None],
    ):
        self._consumer = consumer
        self._crypto = crypto_service
        self._handler = handler
        self._running = False

    async def start(self) -> None:
        self._running = True
        async for message in self._consumer:
            if not self._running:
                break
            try:
                envelope = json.loads(message.value.decode("utf-8"))
                if not await self._crypto.verify_event(envelope):
                    logger.warning("Rejected unsigned/invalid Kafka event")
                    continue
                await self._handler(envelope)
            except Exception:
                logger.exception("Failed to process Kafka message")

    async def stop(self) -> None:
        self._running = False
        await self._consumer.stop()


async def create_kafka_consumer(
    config: KafkaConfig, topics: list[str]
) -> AIOKafkaConsumer:
    consumer = AIOKafkaConsumer(
        *topics,
        bootstrap_servers=config.bootstrap_servers,
        group_id=config.consumer_group,
        enable_auto_commit=True,
        auto_offset_reset="earliest",
    )
    await consumer.start()
    return consumer
