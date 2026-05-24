from typing import Any

from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher


class KafkaAuditLogger:
    def __init__(self, crypto_service: CryptoService, publisher: EventPublisher):
        self._crypto = crypto_service
        self._publisher = publisher

    async def log(
        self,
        table_name: str,
        record_id: str,
        action: str,
        new_data: dict[str, Any] | None = None,
        old_data: dict[str, Any] | None = None,
        actor_id: str | None = None,
        correlation_id: str | None = None,
    ) -> None:
        payload = {
            "table_name": table_name,
            "record_id": record_id,
            "action": action,
            "old_data": old_data,
            "new_data": new_data,
            "actor_id": actor_id,
            "correlation_id": correlation_id,
        }
        signature = await self._crypto.sign_event(payload)
        payload["hmac_signature"] = signature.value
        payload["hmac_key_version"] = signature.key_version
        await self._publisher.publish("notification.audit", record_id, payload, topic_kind="audit")
