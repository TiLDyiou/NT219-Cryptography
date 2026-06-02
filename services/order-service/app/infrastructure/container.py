import logging
from dataclasses import dataclass

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.saga.orchestrator import CheckoutSagaOrchestrator
from app.application.use_cases.checkout import (
    CancelOrderUseCase,
    CheckoutUseCase,
    GetOrderUseCase,
    ListOrdersUseCase,
)
from app.application.use_cases.merchant_order import ListMerchantOrdersUseCase, ConfirmOrderUseCase
from app.core.config import Settings, settings
from app.domain.ports.audit_logger import AuditLogger
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.inventory_gateway import InventoryGateway
from app.domain.ports.nonce_store import NonceStore
from app.domain.ports.payment_gateway import PaymentGateway
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.cache.redis_nonce_store import InMemoryNonceStore, RedisNonceStore
from app.infrastructure.crypto.digital_signature import EventSigner
from app.infrastructure.crypto.envelope_encryption import EnvelopeEncryptor
from app.infrastructure.crypto.hmac_signer import HmacSigner
from app.infrastructure.crypto.vault_client import VaultClient
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService, VaultCryptoService
from app.infrastructure.crypto.vault_transit import VaultTransit
from app.infrastructure.external.inventory_client import InventoryHttpClient, StubInventoryGateway
from app.infrastructure.external.payment_client import PaymentHttpClient, StubPaymentGateway
from app.infrastructure.messaging.kafka_producer import (
    KafkaEventPublisher,
    NullEventPublisher,
    create_kafka_producer,
)
from app.infrastructure.persistence.database import AsyncSessionLocal
from app.infrastructure.persistence.repositories.pg_order_repository import PgOrderRepository

logger = logging.getLogger(__name__)


@dataclass
class AppContainer:
    settings: Settings
    crypto_service: CryptoService
    nonce_store: NonceStore
    event_publisher: EventPublisher
    audit_logger: AuditLogger
    payment_gateway: PaymentGateway
    inventory_gateway: InventoryGateway
    # Verifier riêng cho event đến từ payment-service (ký bằng payment-sign-key).
    # Chỉ cần .verify_event(envelope) nên EventSigner là đủ.
    payment_event_verifier: CryptoService = None  # type: ignore[assignment]
    vault_client: VaultClient | None = None
    redis_client: Redis | None = None
    kafka_producer: object | None = None

    def checkout_use_case(self, session: AsyncSession) -> CheckoutUseCase:
        repo = PgOrderRepository(session)
        saga = CheckoutSagaOrchestrator(
            repo, self.payment_gateway, self.inventory_gateway, self.event_publisher
        )
        return CheckoutUseCase(
            order_repository=repo,
            crypto_service=self.crypto_service,
            event_publisher=self.event_publisher,
            audit_logger=self.audit_logger,
            payment_gateway=self.payment_gateway,
            saga_orchestrator=saga,
        )

    def get_order_use_case(self, session: AsyncSession) -> GetOrderUseCase:
        return GetOrderUseCase(PgOrderRepository(session))

    def list_orders_use_case(self, session: AsyncSession) -> ListOrdersUseCase:
        return ListOrdersUseCase(PgOrderRepository(session))

    def cancel_order_use_case(self, session: AsyncSession) -> CancelOrderUseCase:
        return CancelOrderUseCase(
            PgOrderRepository(session),
            self.event_publisher,
            self.audit_logger,
        )

    def list_merchant_orders_use_case(self, session: AsyncSession) -> ListMerchantOrdersUseCase:
        return ListMerchantOrdersUseCase(PgOrderRepository(session))

    def confirm_order_use_case(self, session: AsyncSession) -> ConfirmOrderUseCase:
        return ConfirmOrderUseCase(
            PgOrderRepository(session),
            self.event_publisher,
            self.audit_logger,
        )


_container: AppContainer | None = None


async def build_container(cfg: Settings | None = None) -> AppContainer:
    cfg = cfg or settings
    vault_client: VaultClient | None = None
    crypto_service: CryptoService
    redis_client: Redis | None = None
    kafka_producer = None
    event_publisher: EventPublisher
    payment_gateway: PaymentGateway

    # Verifier cho inbound payment events; mặc định dùng chính crypto_service
    # (dev), sẽ được thay bằng EventSigner(payment-sign-key) khi Vault sẵn sàng.
    payment_event_verifier: CryptoService

    if cfg.vault.enabled:
        try:
            vault_client = VaultClient(cfg.vault)
            await vault_client.initialize()
            transit = VaultTransit(vault_client)
            envelope = EnvelopeEncryptor(transit, cfg.vault.fle_key_name)
            hmac_signer = HmacSigner(transit, cfg.vault.hmac_key_name)
            event_signer = EventSigner(transit, cfg.vault.sign_key_name)
            crypto_service = VaultCryptoService(envelope, hmac_signer, event_signer)
            payment_event_verifier = EventSigner(transit, cfg.vault.payment_sign_key_name)  # type: ignore[assignment]
            logger.info("Vault crypto initialized")
        except Exception:
            # C-03: ở production KHÔNG tụt xuống crypto dev hard-code (phá vỡ niềm tin
            # liên service). Fail-fast để buộc sửa Vault thay vì chạy mù.
            if cfg.is_production:
                logger.error("Vault required in production but unavailable", exc_info=True)
                raise
            logger.warning("Vault unavailable; using local dev crypto", exc_info=True)
            crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)
            payment_event_verifier = crypto_service
    else:
        crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)
        payment_event_verifier = crypto_service

    if cfg.redis.enabled:
        try:
            redis_client = Redis.from_url(cfg.redis.url, decode_responses=False)
            await redis_client.ping()
            nonce_store: NonceStore = RedisNonceStore(redis_client)
            logger.info("Redis nonce store initialized")
        except Exception:
            # H-06: nhiều pod mỗi pod một bộ nonce trong RAM → mất chống replay đa node.
            if cfg.is_production:
                logger.error("Redis required in production but unavailable", exc_info=True)
                raise
            logger.warning("Redis unavailable; using in-memory nonce store", exc_info=True)
            nonce_store = InMemoryNonceStore()
    else:
        nonce_store = InMemoryNonceStore()

    if cfg.kafka.enabled:
        try:
            kafka_producer = await create_kafka_producer(cfg.kafka)
            event_publisher = KafkaEventPublisher(kafka_producer, crypto_service, cfg.kafka)
            logger.info("Kafka producer initialized")
        except Exception:
            # H-07: NullEventPublisher âm thầm nuốt event (mất audit/outbox publish).
            if cfg.is_production:
                logger.error("Kafka required in production but unavailable", exc_info=True)
                raise
            logger.warning("Kafka unavailable; using null event publisher", exc_info=True)
            event_publisher = NullEventPublisher()
    else:
        event_publisher = NullEventPublisher()

    if cfg.payment.base_url and cfg.payment.dev_stub_on_failure is False:
        payment_gateway = PaymentHttpClient(cfg.payment, crypto_service)
    else:
        try:
            payment_gateway = PaymentHttpClient(cfg.payment, crypto_service)
        except Exception:
            payment_gateway = StubPaymentGateway()

    if cfg.inventory.base_url and cfg.inventory.dev_stub_on_failure is False:
        inventory_gateway = InventoryHttpClient(cfg.inventory, crypto_service)
    else:
        try:
            inventory_gateway = InventoryHttpClient(cfg.inventory, crypto_service)
        except Exception:
            inventory_gateway = StubInventoryGateway()

    audit_logger = KafkaAuditLogger(
        session_factory=AsyncSessionLocal,
        crypto_service=crypto_service,
        event_publisher=event_publisher,
        kafka_config=cfg.kafka,
        kafka_producer=kafka_producer,
    )

    return AppContainer(
        settings=cfg,
        crypto_service=crypto_service,
        nonce_store=nonce_store,
        event_publisher=event_publisher,
        audit_logger=audit_logger,
        payment_gateway=payment_gateway,
        inventory_gateway=inventory_gateway,
        payment_event_verifier=payment_event_verifier,
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
        raise RuntimeError("Application container is not initialized")
    return _container


async def shutdown_container() -> None:
    global _container
    if _container is None:
        return

    if _container.kafka_producer is not None:
        await _container.kafka_producer.stop()

    if isinstance(_container.payment_gateway, PaymentHttpClient):
        await _container.payment_gateway.close()

    if isinstance(_container.inventory_gateway, InventoryHttpClient):
        await _container.inventory_gateway.close()

    if _container.redis_client is not None:
        await _container.redis_client.aclose()

    if _container.vault_client is not None:
        await _container.vault_client.shutdown()

    _container = None
