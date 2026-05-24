import json
import logging

from aiokafka import AIOKafkaProducer

from app.core.config import KafkaConfig
from app.domain.events.base import DomainEvent
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.infrastructure.messaging.event_schemas import build_envelope

logger = logging.getLogger(__name__)


class KafkaEventPublisher(EventPublisher):
    def __init__(
        self,
        producer: AIOKafkaProducer,
        crypto_service: CryptoService,
        config: KafkaConfig,
    ):
        self._producer = producer
        self._crypto = crypto_service
        self._config = config

    async def publish(self, event: DomainEvent) -> None:
        event_data = event.to_dict()
        signature = await self._crypto.sign_event(event_data)
        envelope = build_envelope(
            event_data,
            {
                "algorithm": signature.algorithm,
                "key_version": signature.key_version,
                "value": signature.value,
                "signed_hash": signature.signed_hash,
            },
        )
        topic = self._resolve_topic(event.event_type)
        await self._producer.send_and_wait(
            topic,
            key=event.aggregate_id.encode("utf-8"),
            value=json.dumps(envelope).encode("utf-8"),
        )

    async def verify_inbound(self, envelope: dict) -> bool:
        return await self._crypto.verify_event(envelope)

    def _resolve_topic(self, event_type: str) -> str:
        return self._config.topic_checkout


class NullEventPublisher(EventPublisher):
    async def publish(self, event: DomainEvent) -> None:
        logger.debug("Event publish skipped (Kafka disabled): %s", event.event_type)

    async def verify_inbound(self, envelope: dict) -> bool:
        return True


async def create_kafka_producer(config: KafkaConfig) -> AIOKafkaProducer:
    producer = AIOKafkaProducer(
        bootstrap_servers=config.bootstrap_servers,
        acks="all",
        enable_idempotence=True,
    )
    await producer.start()
    return producer
