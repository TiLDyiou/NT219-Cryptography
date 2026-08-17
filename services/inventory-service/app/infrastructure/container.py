import logging
from dataclasses import dataclass

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings, settings
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.idempotency_store import IdempotencyStore
from app.domain.ports.nonce_store import NonceStore
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.cache.redis_idempotency_store import (
    InMemoryIdempotencyStore,
    RedisIdempotencyStore,
)
from app.infrastructure.cache.redis_nonce_store import InMemoryNonceStore, RedisNonceStore
from app.infrastructure.crypto.digital_signature import EventSigner
from app.infrastructure.crypto.envelope_encryption import EnvelopeEncryptor
from app.infrastructure.crypto.hmac_signer import HmacSigner
from app.infrastructure.crypto.vault_client import VaultClient
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService, VaultCryptoService
from app.infrastructure.crypto.vault_transit import VaultTransit
from app.infrastructure.messaging.kafka_producer import (
    KafkaEventPublisher,
    NullEventPublisher,
    create_kafka_producer,
)
from app.infrastructure.persistence.database import AsyncSessionLocal
from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository

logger = logging.getLogger(__name__)


@dataclass
class AppContainer:
    settings: Settings
    crypto_service: CryptoService
    nonce_store: NonceStore
    idempotency_store: IdempotencyStore
    event_publisher: EventPublisher
    audit_logger: KafkaAuditLogger
    vault_client: VaultClient | None = None
    redis_client: Redis | None = None
    kafka_producer: object | None = None
    session_factory: async_sessionmaker = AsyncSessionLocal

    def merchant_warehouse_use_case(self, session: AsyncSession):
        from app.application.use_cases.merchant import MerchantWarehouseUseCase

        return MerchantWarehouseUseCase(
            repository=InventoryRepository(),
            crypto_service=self.crypto_service,
            audit_logger=self.audit_logger,
            session=session,
        )

    def merchant_inventory_use_case(self, session: AsyncSession):
        from app.application.use_cases.merchant import MerchantInventoryUseCase

        return MerchantInventoryUseCase(
            repository=InventoryRepository(),
            audit_logger=self.audit_logger,
            session=session,
        )

    def reserve_stock_use_case(self, session: AsyncSession):
        from app.application.use_cases.reserve_stock import ReserveStockUseCase

        return ReserveStockUseCase(
            repository=InventoryRepository(),
            idempotency_store=self.idempotency_store,
            outbox_repository=PgOutboxRepository(),
            audit_logger=self.audit_logger,
            session=session,
        )

    def release_stock_use_case(self, session: AsyncSession):
        from app.application.use_cases.release_stock import ReleaseStockUseCase

        return ReleaseStockUseCase(
            repository=InventoryRepository(),
            outbox_repository=PgOutboxRepository(),
            session=session,
        )

    def confirm_reservation_use_case(self, session: AsyncSession):
        from app.application.use_cases.confirm_reservation import ConfirmReservationUseCase

        return ConfirmReservationUseCase(
            repository=InventoryRepository(),
            outbox_repository=PgOutboxRepository(),
            session=session,
        )

    def expire_reservations_use_case(self, session: AsyncSession):
        from app.application.use_cases.expire_reservations import ExpireReservationsUseCase

        return ExpireReservationsUseCase(
            repository=InventoryRepository(),
            session=session,
        )

    def get_availability_use_case(self, session: AsyncSession):
        from app.application.use_cases.get_availability import GetAvailabilityUseCase

        return GetAvailabilityUseCase(
            repository=InventoryRepository(),
            session=session,
        )


_container: AppContainer | None = None


async def build_container(cfg: Settings | None = None) -> AppContainer:
    cfg = cfg or settings
    vault_client: VaultClient | None = None
    crypto_service: CryptoService
    redis_client: Redis | None = None
    kafka_producer = None
    event_publisher: EventPublisher

    if cfg.vault.enabled:
        try:
            vault_client = VaultClient(cfg.vault)
            await vault_client.initialize()
            transit = VaultTransit(vault_client)
            envelope = EnvelopeEncryptor(transit, cfg.vault.fle_key_name)
            hmac_signer = HmacSigner(transit, cfg.vault.hmac_key_name)
            event_signer = EventSigner(transit, cfg.vault.sign_key_name)
            crypto_service = VaultCryptoService(envelope, hmac_signer, event_signer)
            logger.info("Vault crypto service initialized")
        except Exception:
            # C-03: production phải fail-fast thay vì dùng crypto dev hard-code.
            if cfg.is_production:
                logger.error("Vault required in production but unavailable", exc_info=True)
                raise
            logger.warning("Vault connection failed; using local dev crypto", exc_info=True)
            crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)
    else:
        if cfg.is_production:
            logger.error("Vault must be enabled in production environment")
            raise RuntimeError("Vault must be enabled in production environment")
        crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)

    if cfg.redis.enabled:
        try:
            redis_client = Redis.from_url(cfg.redis.url, decode_responses=False)
            await redis_client.ping()
            nonce_store: NonceStore = RedisNonceStore(redis_client)
            idempotency_store: IdempotencyStore = RedisIdempotencyStore(redis_client)
            logger.info("Redis cache adapters initialized")
        except Exception:
            # H-06: in-memory nonce/idempotency mất tác dụng chống replay/khử trùng đa pod.
            if cfg.is_production:
                logger.error("Redis required in production but unavailable", exc_info=True)
                raise
            logger.warning("Redis connection failed; using in-memory fallbacks", exc_info=True)
            nonce_store = InMemoryNonceStore()
            idempotency_store = InMemoryIdempotencyStore()
    else:
        nonce_store = InMemoryNonceStore()
        idempotency_store = InMemoryIdempotencyStore()

    if cfg.kafka.enabled:
        try:
            kafka_producer = await create_kafka_producer(cfg.kafka)
            event_publisher = KafkaEventPublisher(kafka_producer, crypto_service, cfg.kafka)
            logger.info("Kafka messaging adapter initialized")
        except Exception:
            # H-07: NullEventPublisher âm thầm bỏ event outbox/audit.
            if cfg.is_production:
                logger.error("Kafka required in production but unavailable", exc_info=True)
                raise
            logger.warning("Kafka initialization failed; using null publisher", exc_info=True)
            event_publisher = NullEventPublisher()
    else:
        event_publisher = NullEventPublisher()

    audit_logger = KafkaAuditLogger(crypto_service=crypto_service, publisher=event_publisher)

    return AppContainer(
        settings=cfg,
        crypto_service=crypto_service,
        nonce_store=nonce_store,
        idempotency_store=idempotency_store,
        event_publisher=event_publisher,
        audit_logger=audit_logger,
        vault_client=vault_client,
        redis_client=redis_client,
        kafka_producer=kafka_producer,
    )


async def init_container(cfg: Settings | None = None) -> AppContainer:
    global _container
    _container = await build_container(cfg)
    return _container


def get_container() -> AppContainer:
    if _container is None:
        raise RuntimeError("Application container has not been initialized")
    return _container


async def shutdown_container() -> None:
    global _container
    if _container is None:
        return

    if _container.kafka_producer is not None:
        await _container.kafka_producer.stop()

    if _container.redis_client is not None:
        await _container.redis_client.aclose()

    if _container.vault_client is not None:
        await _container.vault_client.shutdown()

    _container = None
