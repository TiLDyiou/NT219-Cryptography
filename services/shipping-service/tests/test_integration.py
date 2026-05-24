import pytest
from sqlalchemy import select

from app.application.use_cases.create_shipment_from_order import CreateShipmentFromOrderUseCase
from app.infrastructure.external.carrier_gateway_factory import CarrierGatewayFactory
from app.infrastructure.persistence.models import AuditLogModel, OutboxEventModel, ShipmentModel
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository
from tests.factories import get_order_confirmed_envelope


class TestCreateShipmentFromOrder:
    @pytest.mark.asyncio
    async def test_creates_shipment_with_outbox_and_audit(
        self, seeded_session, crypto_service, audit_logger
    ):
        from app.core.config import settings

        usecase = CreateShipmentFromOrderUseCase(
            seeded_session,
            ShipmentRepository(),
            PgOutboxRepository(),
            crypto_service,
            CarrierGatewayFactory(settings),
            audit_logger,
        )

        result = await usecase.execute(get_order_confirmed_envelope())
        assert result["created"] is True
        assert result["tracking_number"].startswith("MOCK")

        shipment = (await seeded_session.execute(select(ShipmentModel))).scalar_one()
        assert shipment.order_id == "order-1"
        assert shipment.status == "label_created"
        assert await crypto_service.decrypt_field(shipment.recipient_name_encrypted) == "Nguyen Van A"
        assert (await seeded_session.execute(select(OutboxEventModel))).scalar_one().event_type == "shipping.created"
        assert (await seeded_session.execute(select(AuditLogModel))).scalar_one().table_name == "shipments"

    @pytest.mark.asyncio
    async def test_duplicate_order_event_is_idempotent(
        self, seeded_session, crypto_service, audit_logger
    ):
        from app.core.config import settings

        usecase = CreateShipmentFromOrderUseCase(
            seeded_session,
            ShipmentRepository(),
            PgOutboxRepository(),
            crypto_service,
            CarrierGatewayFactory(settings),
            audit_logger,
        )
        envelope = get_order_confirmed_envelope()
        first = await usecase.execute(envelope)
        second = await usecase.execute(envelope)

        assert first["created"] is True
        assert second["created"] is False
        rows = (await seeded_session.execute(select(ShipmentModel))).scalars().all()
        assert len(rows) == 1
