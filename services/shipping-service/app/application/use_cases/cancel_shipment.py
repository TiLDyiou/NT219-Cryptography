from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.value_objects.shipment_status import ShipmentStatus
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.external.carrier_gateway_factory import CarrierGatewayFactory
from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class CancelShipmentUseCase:
    def __init__(
        self,
        session: AsyncSession,
        repository: ShipmentRepository,
        carrier_factory: CarrierGatewayFactory,
        audit_logger: KafkaAuditLogger,
    ):
        self._session = session
        self._repo = repository
        self._carrier_factory = carrier_factory
        self._audit = audit_logger

    async def execute(self, shipment_id: str, merchant_id: str) -> dict:
        shipment = await self._repo.get_for_merchant(self._session, shipment_id, merchant_id)
        old_status = shipment.status
        if shipment.provider_shipment_id:
            carrier = await self._carrier_factory.get()
            await carrier.cancel(shipment.provider_shipment_id)
        shipment = await self._repo.update_status(self._session, shipment, ShipmentStatus.CANCELLED.value)
        await self._audit.log_change(
            self._session,
            "shipments",
            shipment.id,
            "UPDATE",
            {"status": old_status},
            {"status": shipment.status},
            actor_id=merchant_id,
            actor_type="merchant",
        )
        await self._session.commit()
        return {"shipment_id": shipment.id, "status": shipment.status}
