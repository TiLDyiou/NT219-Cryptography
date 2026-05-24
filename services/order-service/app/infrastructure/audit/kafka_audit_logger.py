import json
import logging
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import KafkaConfig
from app.domain.ports.audit_logger import AuditEvent, AuditLogger
from app.domain.ports.crypto_service import CryptoService
from app.infrastructure.messaging.event_schemas import build_envelope
from app.infrastructure.persistence.models.audit_log_model import AuditLogModel

logger = logging.getLogger(__name__)


class KafkaAuditLogger(AuditLogger):
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        crypto_service: CryptoService,
        event_publisher,
        kafka_config: KafkaConfig,
        kafka_producer=None,
    ):
        self._session_factory = session_factory
        self._crypto = crypto_service
        self._publisher = event_publisher
        self._kafka_config = kafka_config
        self._kafka_producer = kafka_producer

    async def log(self, event: AuditEvent) -> None:
        payload = event.to_dict()
        signature = await self._crypto.sign_event(payload)
        envelope = build_envelope(
            payload,
            {
                "algorithm": signature.algorithm,
                "key_version": signature.key_version,
                "value": signature.value,
                "signed_hash": signature.signed_hash,
            },
        )

        async with self._session_factory() as session:
            session.add(
                AuditLogModel(
                    id=str(uuid4()),
                    table_name=event.table_name,
                    record_id=event.record_id,
                    action=event.action,
                    old_data=event.old_data,
                    new_data=event.new_data,
                    changed_fields=event.changed_fields,
                    actor_id=event.actor_id,
                    actor_type=event.actor_type,
                    ip_address=event.ip_address,
                    user_agent=event.user_agent,
                    correlation_id=event.correlation_id,
                    hmac_signature=signature.value,
                    hmac_key_version=signature.key_version,
                )
            )
            await session.commit()

        if self._kafka_producer is not None:
            try:
                await self._kafka_producer.send_and_wait(
                    self._kafka_config.topic_audit,
                    key=event.record_id.encode("utf-8"),
                    value=json.dumps(envelope).encode("utf-8"),
                )
            except Exception:
                logger.exception("Failed to publish audit event to Kafka")
