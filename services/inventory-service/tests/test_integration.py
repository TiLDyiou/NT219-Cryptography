import pytest
from datetime import datetime, timedelta, timezone

from app.application.use_cases.confirm_reservation import ConfirmReservationUseCase
from app.application.use_cases.expire_reservations import ExpireReservationsUseCase
from app.application.use_cases.get_availability import GetAvailabilityUseCase
from app.application.use_cases.merchant import MerchantInventoryUseCase, MerchantWarehouseUseCase
from app.application.use_cases.release_stock import ReleaseStockUseCase
from app.application.use_cases.reserve_stock import ReserveStockUseCase
from app.core.exceptions import OptimisticLockException, OutOfStockException
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService
from app.infrastructure.messaging.kafka_producer import NullEventPublisher
from app.infrastructure.persistence.models import InventoryItemModel, InventoryReservationModel
from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from tests.factories import (
    get_mock_inventory_create,
    get_mock_reserve_payload,
    get_mock_warehouse_create,
)


def _build_audit() -> KafkaAuditLogger:
    crypto = LocalDevCryptoService("integration-test-crypto-key-32-chars!")
    return KafkaAuditLogger(crypto, NullEventPublisher())


@pytest.mark.asyncio
async def test_reserve_confirm_flow(session_factory):
    audit = _build_audit()

    async with session_factory() as session:
        reserve_uc = ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        )
        result = await reserve_uc.execute(get_mock_reserve_payload())
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
    audit = _build_audit()

    async with session_factory() as session:
        reserve_uc = ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        )
        await reserve_uc.execute(
            get_mock_reserve_payload(
                {"order_id": "order-2", "idempotency_key": "idem-2", "items": [{"product_id": "prod-1", "variant_id": None, "merchant_id": "m-1", "sku": "SKU-1", "quantity": 1}]}
            )
        )

    async with session_factory() as session:
        release_uc = ReleaseStockUseCase(
            InventoryRepository(), PgOutboxRepository(), session
        )
        released = await release_uc.execute({"order_id": "order-2"})
        assert released["released_count"] == 1

        item = await session.get(InventoryItemModel, "item-1")
        assert item.quantity_reserved == 0
        assert item.quantity_on_hand == 5


@pytest.mark.asyncio
async def test_idempotency_replay(session_factory):
    audit = _build_audit()
    idemp = InMemoryIdempotencyStore()
    payload = get_mock_reserve_payload(
        {"order_id": "order-3", "idempotency_key": "idem-3", "items": [{"product_id": "prod-1", "variant_id": None, "merchant_id": "m-1", "sku": "SKU-1", "quantity": 1}]}
    )

    async with session_factory() as session:
        uc = ReserveStockUseCase(
            InventoryRepository(), idemp, PgOutboxRepository(), audit, session
        )
        first = await uc.execute(payload)
        second = await uc.execute(payload)
        assert first == second


@pytest.mark.asyncio
async def test_out_of_stock_raises(session_factory):
    audit = _build_audit()
    payload = get_mock_reserve_payload(
        {
            "order_id": "order-oos",
            "idempotency_key": "idem-oos",
            "items": [
                {
                    "product_id": "prod-1",
                    "variant_id": None,
                    "merchant_id": "m-1",
                    "sku": "SKU-1",
                    "quantity": 100,
                }
            ],
        }
    )

    async with session_factory() as session:
        uc = ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        )
        with pytest.raises(OutOfStockException):
            await uc.execute(payload)


@pytest.mark.asyncio
async def test_skip_non_tracked_inventory(non_tracked_session_factory):
    audit = _build_audit()
    payload = get_mock_reserve_payload(
        {"order_id": "order-skip", "idempotency_key": "idem-skip"}
    )

    async with non_tracked_session_factory() as session:
        uc = ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        )
        result = await uc.execute(payload)
        assert result["reserved"] is True
        assert result["reservations"] == []

        item = await session.get(InventoryItemModel, "item-1")
        assert item.quantity_reserved == 0


@pytest.mark.asyncio
async def test_release_is_idempotent_when_already_released(session_factory):
    audit = _build_audit()
    payload = get_mock_reserve_payload(
        {"order_id": "order-rel-idem", "idempotency_key": "idem-rel-idem", "items": [{"product_id": "prod-1", "variant_id": None, "merchant_id": "m-1", "sku": "SKU-1", "quantity": 1}]}
    )

    async with session_factory() as session:
        await ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        ).execute(payload)

    async with session_factory() as session:
        release_uc = ReleaseStockUseCase(
            InventoryRepository(), PgOutboxRepository(), session
        )
        first = await release_uc.execute({"order_id": "order-rel-idem"})
        second = await release_uc.execute({"order_id": "order-rel-idem"})
        assert first["released_count"] == 1
        assert second["released_count"] == 0
        assert second["released"] is True


@pytest.mark.asyncio
async def test_confirm_with_no_held_reservations(session_factory):
    async with session_factory() as session:
        confirm_uc = ConfirmReservationUseCase(
            InventoryRepository(), PgOutboxRepository(), session
        )
        result = await confirm_uc.execute({"order_id": "nonexistent-order"})
        assert result["confirmed_count"] == 0


@pytest.mark.asyncio
async def test_expire_reservations_releases_held_stock(session_factory):
    audit = _build_audit()
    payload = get_mock_reserve_payload(
        {"order_id": "order-exp", "idempotency_key": "idem-exp", "items": [{"product_id": "prod-1", "variant_id": None, "merchant_id": "m-1", "sku": "SKU-1", "quantity": 2}]}
    )

    async with session_factory() as session:
        await ReserveStockUseCase(
            InventoryRepository(),
            InMemoryIdempotencyStore(),
            PgOutboxRepository(),
            audit,
            session,
        ).execute(payload)

    async with session_factory() as session:
        reservation = (
            await session.execute(
                __import__("sqlalchemy").select(InventoryReservationModel).where(
                    InventoryReservationModel.order_id == "order-exp"
                )
            )
        ).scalar_one()
        reservation.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await session.commit()

    async with session_factory() as session:
        result = await ExpireReservationsUseCase(InventoryRepository(), session).execute()
        assert result["expired_count"] == 1

        item = await session.get(InventoryItemModel, "item-1")
        assert item.quantity_reserved == 0


@pytest.mark.asyncio
async def test_bulk_availability(session_factory):
    async with session_factory() as session:
        uc = GetAvailabilityUseCase(InventoryRepository(), session)
        result = await uc.execute([{"product_id": "prod-1", "variant_id": None}])
        assert result[0]["total_available"] == 5
        assert result[0]["in_stock"] is True


@pytest.mark.asyncio
async def test_merchant_warehouse_crud(session_factory, crypto_service, audit_logger):
    async with session_factory() as session:
        uc = MerchantWarehouseUseCase(
            InventoryRepository(), crypto_service, audit_logger, session
        )
        created = await uc.create("m-1", get_mock_warehouse_create())
        assert created["code"] == "WH-NEW"
        assert created["address"] == "456 Side St"

        warehouses = await uc.list("m-1")
        assert len(warehouses) == 2

        updated = await uc.update(
            "m-1", created["id"], {"name": "Updated Warehouse", "priority": 99}
        )
        assert updated["name"] == "Updated Warehouse"
        assert updated["priority"] == 99


@pytest.mark.asyncio
async def test_merchant_inventory_upsert_and_update_stock(session_factory, audit_logger):
    async with session_factory() as session:
        uc = MerchantInventoryUseCase(
            InventoryRepository(), audit_logger, session
        )
        created = await uc.upsert("m-1", get_mock_inventory_create())
        assert created["sku"] == "SKU-2"
        assert created["quantity_on_hand"] == 10

        updated = await uc.update_stock(
            "m-1",
            created["id"],
            {"delta": -3, "version": created["version"]},
        )
        assert updated["quantity_on_hand"] == 7


@pytest.mark.asyncio
async def test_optimistic_lock_on_stock_update(session_factory, audit_logger):
    async with session_factory() as session:
        uc = MerchantInventoryUseCase(
            InventoryRepository(), audit_logger, session
        )
        item = await uc.list("m-1")
        current = item[0]

        with pytest.raises(OptimisticLockException):
            await uc.update_stock(
                "m-1",
                current["id"],
                {"delta": 1, "version": current["version"] + 99},
            )
