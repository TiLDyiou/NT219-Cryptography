import json
import logging
from typing import Any

from aiokafka import AIOKafkaProducer

from app.core.config import KafkaConfig
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.infrastructure.messaging.event_schemas import build_envelope

logger = logging.getLogger(__name__)


class KafkaEventPublisher(EventPublisher):
    def __init__(self, producer: AIOKafkaProducer, crypto_service: CryptoService, config: KafkaConfig):
        self._producer = producer
        self._crypto = crypto_service
        self._config = config

    async def publish(
        self,
        event_type: str,
        aggregate_id: str,
        payload: dict[str, Any],
        topic_kind: str = "shipping",
    ) -> None:
        signature = await self._crypto.sign_event(payload)
        envelope = build_envelope(
            event_type=event_type,
            aggregate_id=aggregate_id,
            payload=payload,
            signature={
                "algorithm": signature.algorithm,
                "key_version": signature.key_version,
                "value": signature.value,
                "signed_hash": signature.signed_hash,
            },
        )
        topic = self._config.topic_audit if topic_kind == "audit" else self._config.topic_shipping
        await self._producer.send_and_wait(
            topic,
            key=aggregate_id.encode("utf-8"),
            value=json.dumps(envelope, default=str).encode("utf-8"),
        )
        logger.info("Published event %s for aggregate %s to %s", event_type, aggregate_id, topic)

    async def verify_inbound(self, envelope: dict[str, Any]) -> bool:
        return await self._crypto.verify_event(envelope)


class NullEventPublisher(EventPublisher):
    async def publish(
        self,
        event_type: str,
        aggregate_id: str,
        payload: dict[str, Any],
        topic_kind: str = "shipping",
    ) -> None:
        logger.debug("Event publish skipped (Kafka disabled): %s", event_type)

    async def verify_inbound(self, envelope: dict[str, Any]) -> bool:
        # H-07: fail-closed — consumer order.confirmed KHÔNG được tin event chưa ký.
        return False


async def create_kafka_producer(config: KafkaConfig) -> AIOKafkaProducer:
    producer = AIOKafkaProducer(
        bootstrap_servers=config.bootstrap_servers,
        acks="all",
        enable_idempotence=True,
    )
    await producer.start()
    return producer
