from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.events import TrackingRecorded
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class RecordTrackingEventUseCase:
    def __init__(
        self,
        session: AsyncSession,
        repository: ShipmentRepository,
        outbox_repository: PgOutboxRepository,
        audit_logger: KafkaAuditLogger,
    ):
        self._session = session
        self._repo = repository
        self._outbox = outbox_repository
        self._audit = audit_logger

    async def execute(self, tracking_number: str, event: dict[str, Any]) -> dict[str, Any]:
        shipment = await self._repo.get_by_tracking_number(self._session, tracking_number)
        old_status = shipment.status
        row = await self._repo.add_tracking_event(self._session, shipment, event)
        shipment = await self._repo.update_status(self._session, shipment, event["status"])
        payload = TrackingRecorded(
            shipment_id=shipment.id,
            status=shipment.status,
            description=row.description,
        ).to_dict()
        await self._outbox.add_event(
            self._session,
            aggregate_type="shipping",
            aggregate_id=shipment.id,
            event_type="shipping.tracking_recorded",
            payload=payload,
        )
        await self._audit.log_change(
            self._session,
            "shipments",
            shipment.id,
            "UPDATE",
            {"status": old_status},
            {"status": shipment.status},
            actor_type="carrier",
        )
        await self._session.commit()
        return payload
