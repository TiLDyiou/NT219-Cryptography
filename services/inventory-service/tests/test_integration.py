import pytest
import pytest_asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.application.use_cases.confirm_reservation import ConfirmReservationUseCase
from app.application.use_cases.release_stock import ReleaseStockUseCase
from app.application.use_cases.reserve_stock import ReserveStockUseCase
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore
from app.infrastructure.persistence.models import Base, InventoryItemModel, WarehouseModel
from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.messaging.kafka_producer import NullEventPublisher
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService


@pytest_asyncio.fixture
async def session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        wh = WarehouseModel(
            id="wh-1",
            merchant_id="m-1",
            code="MAIN",
            name="Main",
            country_code="VN",
            is_active=True,
            priority=10,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        item = InventoryItemModel(
            id="item-1",
            product_id="prod-1",
            variant_id=None,
            warehouse_id="wh-1",
            merchant_id="m-1",
            sku="SKU-1",
            quantity_on_hand=5,
            quantity_reserved=0,
            is_track_inventory=True,
            version=1,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add_all([wh, item])
        await session.commit()

    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_reserve_confirm_flow(session_factory):
    crypto = LocalDevCryptoService("local-dev-inventory-crypto-key-32!")
    audit = KafkaAuditLogger(crypto, NullEventPublisher())

    async with session_factory() as session:
        reserve_uc = ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        )
        result = await reserve_uc.execute(
            {
                "order_id": "order-1",
                "saga_id": "saga-1",
                "idempotency_key": "idem-1",
                "items": [
                    {
                        "product_id": "prod-1",
                        "variant_id": None,
                        "merchant_id": "m-1",
                        "sku": "SKU-1",
                        "quantity": 2,
                    }
                ],
            }
        )
        assert result["reserved"] is True
        assert len(result["reservations"]) == 1

    async with session_factory() as session:
        confirm_uc = ConfirmReservationUseCase(
            InventoryRepository(), PgOutboxRepository(), session
        )
        confirmed = await confirm_uc.execute({"order_id": "order-1"})
        assert confirmed["confirmed_count"] == 1

        item = await session.get(InventoryItemModel, "item-1")
        assert item.quantity_on_hand == 3
        assert item.quantity_reserved == 0


@pytest.mark.asyncio
async def test_reserve_release_flow(session_factory):
    crypto = LocalDevCryptoService("local-dev-inventory-crypto-key-32!")
    audit = KafkaAuditLogger(crypto, NullEventPublisher())

    async with session_factory() as session:
        reserve_uc = ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        )
        await reserve_uc.execute(
            {
                "order_id": "order-2",
                "idempotency_key": "idem-2",
                "items": [
                    {
                        "product_id": "prod-1",
                        "variant_id": None,
                        "merchant_id": "m-1",
                        "sku": "SKU-1",
                        "quantity": 1,
                    }
                ],
            }
        )

    async with session_factory() as session:
        release_uc = ReleaseStockUseCase(
            InventoryRepository(), PgOutboxRepository(), session
        )
        released = await release_uc.execute({"order_id": "order-2"})
        assert released["released_count"] == 1

        item = await session.get(InventoryItemModel, "item-1")
        assert item.quantity_reserved == 0


@pytest.mark.asyncio
async def test_idempotency_replay(session_factory):
    crypto = LocalDevCryptoService("local-dev-inventory-crypto-key-32!")
    audit = KafkaAuditLogger(crypto, NullEventPublisher())
    idemp = InMemoryIdempotencyStore()

    payload = {
        "order_id": "order-3",
        "idempotency_key": "idem-3",
        "items": [
            {
                "product_id": "prod-1",
                "variant_id": None,
                "merchant_id": "m-1",
                "sku": "SKU-1",
                "quantity": 1,
            }
        ],
    }

    async with session_factory() as session:
        uc = ReserveStockUseCase(
            InventoryRepository(), idemp, PgOutboxRepository(), audit, session
        )
        first = await uc.execute(payload)
        second = await uc.execute(payload)
        assert first == second
