import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_inventory_service.db")
os.environ.setdefault("VAULT_ENABLED", "false")
os.environ.setdefault("KAFKA_ENABLED", "false")
os.environ.setdefault("REDIS_ENABLED", "false")
os.environ.setdefault("REQUIRE_INBOUND_HMAC", "false")
os.environ.setdefault("REQUIRE_NONCE_GUARD", "false")
os.environ.setdefault("ENABLE_SQLITE_FALLBACK", "true")
os.environ.setdefault("ALEMBIC_CHECK_ON_STARTUP", "false")
os.environ.setdefault("INTERNAL_API_TOKEN", "test-internal-token")

from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService
from app.infrastructure.messaging.kafka_producer import NullEventPublisher
from app.infrastructure.persistence.models import Base, InventoryItemModel, WarehouseModel
from tests.factories import get_mock_inventory_item_model, get_mock_warehouse_model


@pytest.fixture
def crypto_service() -> LocalDevCryptoService:
    return LocalDevCryptoService("test-inventory-crypto-key-32-chars!")


@pytest.fixture
def audit_logger(crypto_service: LocalDevCryptoService) -> KafkaAuditLogger:
    return KafkaAuditLogger(crypto_service, NullEventPublisher())


@pytest.fixture
def idempotency_store() -> InMemoryIdempotencyStore:
    return InMemoryIdempotencyStore()


@pytest_asyncio.fixture
async def session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        session.add_all(
            [
                get_mock_warehouse_model(),
                get_mock_inventory_item_model(),
            ]
        )
        await session.commit()

    yield factory
    await engine.dispose()


@pytest_asyncio.fixture
async def seeded_session(session_factory):
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def non_tracked_session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        session.add_all(
            [
                get_mock_warehouse_model(),
                get_mock_inventory_item_model({"is_track_inventory": False}),
            ]
        )
        await session.commit()

    yield factory
    await engine.dispose()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
