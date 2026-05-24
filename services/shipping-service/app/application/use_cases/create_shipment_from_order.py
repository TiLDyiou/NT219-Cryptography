from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.events import ShippingCreated
from app.domain.ports.crypto_service import CryptoService
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.external.carrier_gateway_factory import CarrierGatewayFactory
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class CreateShipmentFromOrderUseCase:
    def __init__(
        self,
        session: AsyncSession,
        repository: ShipmentRepository,
        outbox_repository: PgOutboxRepository,
        crypto_service: CryptoService,
        carrier_factory: CarrierGatewayFactory,
        audit_logger: KafkaAuditLogger,
    ):
        self._session = session
        self._repo = repository
        self._outbox = outbox_repository
        self._crypto = crypto_service
        self._carrier_factory = carrier_factory
        self._audit = audit_logger

    async def execute(self, envelope: dict[str, Any]) -> dict[str, Any]:
        order = dict(envelope.get("payload") or envelope)
        order.setdefault("event_id", envelope.get("event_id"))
        recipient = order.get("recipient") or order.get("shipping_address") or {}
        provider = await self._repo.get_default_provider(self._session)

        encrypted = {
            "recipient_name": await self._crypto.encrypt_field(recipient.get("name")),
            "recipient_phone": await self._crypto.encrypt_field(recipient.get("phone")),
            "address_line1": await self._crypto.encrypt_field(recipient.get("line1")),
            "address_line2": await self._crypto.encrypt_field(recipient.get("line2")),
        }
        shipment, created = await self._repo.create_from_order(
            self._session, order, encrypted, provider.id
        )
        if not created:
            return {"shipment_id": shipment.id, "created": False}

        carrier = await self._carrier_factory.get(provider.code)
        label = await carrier.create_label(shipment)
        await self._repo.attach_label(
            self._session,
            shipment,
            tracking_number=label.tracking_number,
            provider_shipment_id=label.provider_shipment_id,
            provider_label_url=label.provider_label_url,
            provider_response=label.raw_response,
        )

        event = ShippingCreated(
            shipment_id=shipment.id,
            order_id=shipment.order_id,
            merchant_id=shipment.merchant_id,
            tracking_number=shipment.tracking_number,
        )
        await self._outbox.add_event(
            self._session,
            aggregate_type="shipping",
            aggregate_id=shipment.id,
            event_type="shipping.created",
            payload=event.to_dict(),
        )
        await self._audit.log_change(
            self._session,
            "shipments",
            shipment.id,
            "INSERT",
            None,
            event.to_dict(),
            actor_id=shipment.merchant_id,
            actor_type="system",
        )
        await self._session.commit()
        return {"shipment_id": shipment.id, "created": True, "tracking_number": shipment.tracking_number}
