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
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore, RedisIdempotencyStore
from app.infrastructure.cache.redis_nonce_store import InMemoryNonceStore, RedisNonceStore
from app.infrastructure.crypto.digital_signature import EventSigner
from app.infrastructure.crypto.envelope_encryption import EnvelopeEncryptor
from app.infrastructure.crypto.hmac_signer import HmacSigner
from app.infrastructure.crypto.vault_client import VaultClient
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService, VaultCryptoService
from app.infrastructure.crypto.vault_transit import VaultTransit
from app.infrastructure.external.carrier_gateway_factory import CarrierGatewayFactory
from app.infrastructure.messaging.kafka_producer import KafkaEventPublisher, NullEventPublisher, create_kafka_producer
from app.infrastructure.persistence.database import AsyncSessionLocal
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository

logger = logging.getLogger(__name__)


@dataclass
class AppContainer:
    settings: Settings
    crypto_service: CryptoService
    nonce_store: NonceStore
    idempotency_store: IdempotencyStore
    event_publisher: EventPublisher
    audit_logger: KafkaAuditLogger
    carrier_factory: CarrierGatewayFactory
    shipment_repository: ShipmentRepository
    vault_client: VaultClient | None = None
    redis_client: Redis | None = None
    kafka_producer: object | None = None
    session_factory: async_sessionmaker = AsyncSessionLocal

    def create_shipment_from_order_use_case(self, session: AsyncSession):
        from app.application.use_cases.create_shipment_from_order import CreateShipmentFromOrderUseCase

        return CreateShipmentFromOrderUseCase(
            session,
            self.shipment_repository,
            PgOutboxRepository(),
            self.crypto_service,
            self.carrier_factory,
            self.audit_logger,
        )

    def record_tracking_event_use_case(self, session: AsyncSession):
        from app.application.use_cases.record_tracking_event import RecordTrackingEventUseCase

        return RecordTrackingEventUseCase(
            session,
            self.shipment_repository,
            PgOutboxRepository(),
            self.audit_logger,
        )

    def cancel_shipment_use_case(self, session: AsyncSession):
        from app.application.use_cases.cancel_shipment import CancelShipmentUseCase

        return CancelShipmentUseCase(session, self.shipment_repository, self.carrier_factory, self.audit_logger)

    def get_shipment_use_case(self, session: AsyncSession):
        from app.application.use_cases.get_shipment import GetShipmentUseCase

        return GetShipmentUseCase(session, self.shipment_repository, self.crypto_service)

    def track_shipment_public_use_case(self, session: AsyncSession):
        from app.application.use_cases.track_shipment_public import TrackShipmentPublicUseCase

        return TrackShipmentPublicUseCase(session, self.shipment_repository)

    def quote_shipping_rate_use_case(self):
        from app.application.use_cases.quote_shipping_rate import QuoteShippingRateUseCase

        return QuoteShippingRateUseCase(self.carrier_factory)

    def merchant_shipments_use_case(self, session: AsyncSession):
        from app.application.use_cases.merchant import MerchantShipmentsUseCase

        return MerchantShipmentsUseCase(session, self.shipment_repository)

    def merchant_rates_use_case(self, session: AsyncSession):
        from app.application.use_cases.merchant import MerchantRatesUseCase

        return MerchantRatesUseCase(session, self.shipment_repository)

    def providers_use_case(self, session: AsyncSession):
        from app.application.use_cases.merchant import ProvidersUseCase

        return ProvidersUseCase(session, self.shipment_repository)


_container: AppContainer | None = None


async def build_container(cfg: Settings | None = None) -> AppContainer:
    cfg = cfg or settings
    vault_client: VaultClient | None = None
    redis_client: Redis | None = None
    kafka_producer = None

    if cfg.vault.enabled:
        try:
            vault_client = VaultClient(cfg.vault)
            await vault_client.initialize()
            transit = VaultTransit(vault_client)
            crypto_service: CryptoService = VaultCryptoService(
                EnvelopeEncryptor(transit, cfg.vault.fle_key_name),
                HmacSigner(transit, cfg.vault.hmac_key_name),
                EventSigner(transit, cfg.vault.sign_key_name),
            )
        except Exception:
            # C-03: production phải fail-fast thay vì dùng crypto dev hard-code.
            if cfg.is_production:
                logger.error("Vault required in production but unavailable", exc_info=True)
                raise
            logger.warning("Vault connection failed; using local dev crypto", exc_info=True)
            crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)
    else:
        crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)

    if cfg.redis.enabled:
        try:
            redis_client = Redis.from_url(cfg.redis.url, decode_responses=False)
            await redis_client.ping()
            nonce_store: NonceStore = RedisNonceStore(redis_client, key_prefix="shipping-svc:nonce:")
            idempotency_store: IdempotencyStore = RedisIdempotencyStore(redis_client, key_prefix="shipping:idemp:")
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
            event_publisher: EventPublisher = KafkaEventPublisher(kafka_producer, crypto_service, cfg.kafka)
        except Exception:
            # H-07: NullEventPublisher âm thầm bỏ event; consumer order.confirmed cũng
            # không nên chạy ở chế độ verify-luôn-True (xem kafka_producer).
            if cfg.is_production:
                logger.error("Kafka required in production but unavailable", exc_info=True)
                raise
            logger.warning("Kafka initialization failed; using null publisher", exc_info=True)
            event_publisher = NullEventPublisher()
    else:
        event_publisher = NullEventPublisher()

    return AppContainer(
        settings=cfg,
        crypto_service=crypto_service,
        nonce_store=nonce_store,
        idempotency_store=idempotency_store,
        event_publisher=event_publisher,
        audit_logger=KafkaAuditLogger(crypto_service, event_publisher),
        carrier_factory=CarrierGatewayFactory(cfg),
        shipment_repository=ShipmentRepository(),
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
