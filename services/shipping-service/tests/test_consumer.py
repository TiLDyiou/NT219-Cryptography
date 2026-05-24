import pytest
from sqlalchemy import select

from app.application.use_cases.create_shipment_from_order import CreateShipmentFromOrderUseCase
from app.infrastructure.external.carrier_gateway_factory import CarrierGatewayFactory
from app.infrastructure.persistence.models import ShipmentModel
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository
from tests.factories import get_order_confirmed_envelope


@pytest.mark.asyncio
async def test_order_confirmed_envelope_creates_shipment(seeded_session, crypto_service, audit_logger):
    from app.core.config import settings

    usecase = CreateShipmentFromOrderUseCase(
        seeded_session,
        ShipmentRepository(),
        PgOutboxRepository(),
        crypto_service,
        CarrierGatewayFactory(settings),
        audit_logger,
    )
    await usecase.execute(get_order_confirmed_envelope({"order_id": "consumer-order-1"}))
    shipment = (await seeded_session.execute(select(ShipmentModel))).scalar_one()
    assert shipment.order_id == "consumer-order-1"
