import json
import logging
from typing import Any

from app.core.config import KafkaConfig
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.infrastructure.messaging.event_schemas import build_envelope

logger = logging.getLogger(__name__)


class KafkaEventPublisher(EventPublisher):
    def __init__(self, producer, crypto_service: CryptoService, config: KafkaConfig):
        self._producer = producer
        self._crypto = crypto_service
        self._config = config

    async def publish(
        self,
        event_type: str,
        aggregate_id: str,
        payload: dict[str, Any],
        topic_kind: str = "notification",
    ) -> None:
        signature = await self._crypto.sign_event(payload)
        envelope = build_envelope(
            event_type,
            aggregate_id,
            payload,
            {
                "algorithm": signature.algorithm,
                "key_version": signature.key_version,
                "value": signature.value,
                "signed_hash": signature.signed_hash,
            },
        )
        topic = {
            "audit": self._config.topic_audit,
            "dlq": self._config.topic_dlq,
        }.get(topic_kind, self._config.topic_notification_events)
        await self._producer.send_and_wait(
            topic,
            key=aggregate_id.encode("utf-8"),
            value=json.dumps(envelope, default=str).encode("utf-8"),
        )

    async def verify_inbound(self, envelope: dict[str, Any]) -> bool:
        return await self._crypto.verify_event(envelope)


class NullEventPublisher(EventPublisher):
    def __init__(self):
        self.events: list[tuple[str, str, dict[str, Any], str]] = []

    async def publish(
        self,
        event_type: str,
        aggregate_id: str,
        payload: dict[str, Any],
        topic_kind: str = "notification",
    ) -> None:
        self.events.append((event_type, aggregate_id, payload, topic_kind))
        logger.debug("Event publish skipped: %s", event_type)

    async def verify_inbound(self, envelope: dict[str, Any]) -> bool:
        # H-07: fail-closed — không có crypto thật thì KHÔNG coi event là hợp lệ.
        return False


async def create_kafka_producer(config: KafkaConfig):
    from aiokafka import AIOKafkaProducer

    producer = AIOKafkaProducer(
        bootstrap_servers=config.bootstrap_servers,
        acks="all",
        enable_idempotence=True,
    )
    await producer.start()
    return producer
