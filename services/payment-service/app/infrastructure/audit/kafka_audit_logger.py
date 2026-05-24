import json
import logging
from typing import Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.infrastructure.persistence.models.audit import AuditLogModel

logger = logging.getLogger(__name__)


class KafkaAuditLogger:
    def __init__(self, crypto_service: CryptoService, publisher: EventPublisher):
        self._crypto = crypto_service
        self._publisher = publisher

    async def log_change(
        self,
        session: AsyncSession,
        table_name: str,
        record_id: str,
        action: str,
        old_data: dict[str, Any] | None,
        new_data: dict[str, Any] | None,
        actor_id: str | None = None,
        actor_type: str | None = "system",
        correlation_id: str | None = None,
    ) -> None:
        """
        Dual-write audit logger.
        1. Write to DB table `payment_audit_log` with HMAC signature.
        2. Publish event to Kafka `audit-logs` topic.
        """
        now = datetime.now(timezone.utc)
        
        # Build canonical payload for HMAC signing
        canonical = {
            "table_name": table_name,
            "record_id": record_id,
            "action": action,
            "old_data": old_data,
            "new_data": new_data,
            "timestamp": now.isoformat(),
        }
        
        canonical_str = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        
        # Sign using cryptographic service (which calls Vault audit key or local dev key)
        signature = await self._crypto.sign_event(canonical)
        
        # 1. DB Write
        audit_db = AuditLogModel(
            table_name=table_name,
            record_id=record_id,
            action=action,
            old_data=old_data,
            new_data=new_data,
            changed_fields=list(new_data.keys()) if new_data else [],
            actor_id=actor_id,
            actor_type=actor_type,
            correlation_id=correlation_id,
            hmac_signature=signature.value,
            hmac_key_version=signature.key_version,
            created_at=now,
        )
        session.add(audit_db)
        await session.flush()
        
        # 2. Kafka publish
        try:
            await self._publisher.publish(
                event_type=f"audit.{table_name}.{action.lower()}",
                aggregate_id=record_id,
                payload=canonical,
            )
        except Exception:
            # We don't crash the main business transaction if Kafka logging fails
            logger.exception("Kafka audit event publishing failed")
