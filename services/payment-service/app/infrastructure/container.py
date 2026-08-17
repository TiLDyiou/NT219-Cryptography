import logging
from dataclasses import dataclass
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings, settings
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.nonce_store import NonceStore
from app.domain.ports.idempotency_store import IdempotencyStore
from app.domain.ports.stripe_gateway import StripeGateway
from app.domain.ports.bank_payout_gateway import BankPayoutGateway

from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.cache.redis_nonce_store import InMemoryNonceStore, RedisNonceStore
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore, RedisIdempotencyStore
from app.infrastructure.crypto.digital_signature import EventSigner
from app.infrastructure.crypto.envelope_encryption import EnvelopeEncryptor
from app.infrastructure.crypto.hmac_signer import HmacSigner
from app.infrastructure.crypto.vault_client import VaultClient
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService, VaultCryptoService
from app.infrastructure.crypto.vault_transit import VaultTransit

from app.infrastructure.external.stripe_client import StripeClient
from app.infrastructure.external.bank_payout_stub import BankPayoutStub
from app.infrastructure.messaging.kafka_producer import KafkaEventPublisher, NullEventPublisher, create_kafka_producer
from app.infrastructure.persistence.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


@dataclass
class AppContainer:
    settings: Settings
    crypto_service: CryptoService
    nonce_store: NonceStore
    idempotency_store: IdempotencyStore
    event_publisher: EventPublisher
    audit_logger: KafkaAuditLogger
    stripe_gateway: StripeGateway
    bank_payout_gateway: BankPayoutGateway
    vault_client: VaultClient | None = None
    redis_client: Redis | None = None
    kafka_producer: object | None = None
    session_factory: async_sessionmaker = AsyncSessionLocal

    # Factory methods per usecase
    def charge_use_case(self, session: AsyncSession):
        from app.application.use_cases.charge import ChargeUseCase
        from app.infrastructure.persistence.repositories.payment_repository import PgPaymentRepository
        from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository

        from app.infrastructure.external.order_client import OrderHttpClient

        return ChargeUseCase(
            payment_repository=PgPaymentRepository(),
            idempotency_store=self.idempotency_store,
            outbox_repository=PgOutboxRepository(),
            stripe_gateway=self.stripe_gateway,
            crypto_service=self.crypto_service,
            audit_logger=self.audit_logger,
            session=session,
            order_client=OrderHttpClient(
                self.settings.ORDER_SERVICE_URL,
                self.settings.ORDER_SERVICE_INTERNAL_TOKEN,
                mtls_enabled=self.settings.order.mtls_enabled,
                client_cert_path=self.settings.order.client_cert_path,
                client_key_path=self.settings.order.client_key_path,
                ca_cert_path=self.settings.order.ca_cert_path,
            ),
        )

    def handle_webhook_use_case(self, session: AsyncSession):
        from app.application.use_cases.handle_webhook import HandleWebhookUseCase
        from app.infrastructure.persistence.repositories.payment_repository import PgPaymentRepository
        from app.infrastructure.persistence.repositories.webhook_log_repository import PgWebhookLogRepository
        from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository

        return HandleWebhookUseCase(
            payment_repository=PgPaymentRepository(),
            webhook_log_repository=PgWebhookLogRepository(),
            outbox_repository=PgOutboxRepository(),
            stripe_gateway=self.stripe_gateway,
            audit_logger=self.audit_logger,
            session=session
        )

    def get_payment_use_case(self, session: AsyncSession):
        from app.application.use_cases.get_payment import GetPaymentUseCase
        from app.infrastructure.persistence.repositories.payment_repository import PgPaymentRepository

        return GetPaymentUseCase(
            payment_repository=PgPaymentRepository(),
            session=session
        )

    def refund_use_case(self, session: AsyncSession):
        from app.application.use_cases.refund import RefundUseCase
        from app.infrastructure.persistence.repositories.payment_repository import PgPaymentRepository
        from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository

        return RefundUseCase(
            payment_repository=PgPaymentRepository(),
            outbox_repository=PgOutboxRepository(),
            stripe_gateway=self.stripe_gateway,
            audit_logger=self.audit_logger,
            session=session
        )

    def generate_settlement_use_case(self, session: AsyncSession):
        from app.application.use_cases.generate_settlement import GenerateSettlementUseCase
        from app.infrastructure.persistence.repositories.settlement_repository import PgSettlementRepository
        from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository

        return GenerateSettlementUseCase(
            settlement_repository=PgSettlementRepository(),
            outbox_repository=PgOutboxRepository(),
            session=session
        )

    def process_settlement_use_case(self, session: AsyncSession):
        from app.application.use_cases.process_settlement import ProcessSettlementUseCase
        from app.infrastructure.persistence.repositories.settlement_repository import PgSettlementRepository
        from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository

        return ProcessSettlementUseCase(
            settlement_repository=PgSettlementRepository(),
            outbox_repository=PgOutboxRepository(),
            payout_gateway=self.bank_payout_gateway,
            session=session
        )


_container: AppContainer | None = None


async def build_container(cfg: Settings | None = None) -> AppContainer:
    cfg = cfg or settings
    vault_client: VaultClient | None = None
    crypto_service: CryptoService
    redis_client: Redis | None = None
    kafka_producer = None
    event_publisher: EventPublisher
    stripe_gateway: StripeGateway
    bank_payout_gateway: BankPayoutGateway

    # 1. Cryptographic layer
    if cfg.vault.enabled:
        try:
            vault_client = VaultClient(cfg.vault)
            await vault_client.initialize()
            transit = VaultTransit(vault_client)
            envelope = EnvelopeEncryptor(transit, cfg.vault.fle_key_name)
            hmac_signer = HmacSigner(transit, cfg.vault.hmac_key_name)
            event_signer = EventSigner(transit, cfg.vault.sign_key_name)
            crypto_service = VaultCryptoService(envelope, hmac_signer, event_signer)
            logger.info("Vault crypto service initialized successfully")
        except Exception:
            # C-03: production phải fail-fast thay vì dùng crypto dev hard-code.
            if cfg.is_production:
                logger.error("Vault required in production but unavailable", exc_info=True)
                raise
            logger.warning("Vault connection failed; falling back to local dev crypto", exc_info=True)
            crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)
    else:
        if cfg.is_production:
            logger.error("Vault must be enabled in production environment")
            raise RuntimeError("Vault must be enabled in production environment")
        crypto_service = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)

    # 2. Redis Cache
    if cfg.redis.enabled:
        try:
            redis_client = Redis.from_url(cfg.redis.url, decode_responses=False)
            await redis_client.ping()
            nonce_store: NonceStore = RedisNonceStore(redis_client)
            idempotency_store: IdempotencyStore = RedisIdempotencyStore(redis_client)
            logger.info("Redis cache adapters initialized successfully")
        except Exception:
            # H-06: in-memory nonce/idempotency mất tác dụng chống replay/khử trùng đa pod.
            if cfg.is_production:
                logger.error("Redis required in production but unavailable", exc_info=True)
                raise
            logger.warning("Redis connection failed; using in-memory cache fallbacks", exc_info=True)
            nonce_store = InMemoryNonceStore()
            idempotency_store = InMemoryIdempotencyStore()
    else:
        nonce_store = InMemoryNonceStore()
        idempotency_store = InMemoryIdempotencyStore()

    # 3. Event Publisher (Kafka)
    if cfg.kafka.enabled:
        try:
            kafka_producer = await create_kafka_producer(cfg.kafka)
            event_publisher = KafkaEventPublisher(kafka_producer, crypto_service, cfg.kafka)
            logger.info("Kafka messaging adapter initialized successfully")
        except Exception:
            # H-07: NullEventPublisher âm thầm bỏ event outbox/audit (PaymentCompleted...).
            if cfg.is_production:
                logger.error("Kafka required in production but unavailable", exc_info=True)
                raise
            logger.warning("Kafka initialization failed; using null event publisher", exc_info=True)
            event_publisher = NullEventPublisher()
    else:
        event_publisher = NullEventPublisher()

    # 4. Stripe Client
    stripe_config = cfg.stripe
    if vault_client is not None:
        try:
            vault_res = await vault_client.call(
                vault_client.client.secrets.kv.v2.read_secret_version,
                path='payment/stripe'
            )
            secrets = vault_res['data']['data']
            update_data = {}
            if 'api_key' in secrets:
                update_data['api_key'] = secrets['api_key']
            if 'webhook_secret' in secrets:
                update_data['webhook_secret'] = secrets['webhook_secret']
            if 'publishable_key' in secrets:
                update_data['publishable_key'] = secrets['publishable_key']

            stripe_config = stripe_config.model_copy(update=update_data)
            logger.info("Stripe credentials loaded from Vault")
        except Exception:
            logger.warning("Failed to load Stripe credentials from Vault, using env vars", exc_info=True)

    stripe_gateway = StripeClient(stripe_config)

    # 5. Payout Gateway
    # M-02: trước đây luôn dùng BankPayoutStub bất kể config → settlement đánh dấu
    # "đã chi" mà không chuyển khoản thật. Giờ chỉ dùng stub khi BANK_PAYOUT_STUB=true;
    # nếu tắt stub mà chưa có cổng chi trả thật → fail-fast thay vì giả vờ thành công.
    if cfg.BANK_PAYOUT_STUB:
        bank_payout_gateway = BankPayoutStub()
    else:
        raise RuntimeError(
            "BANK_PAYOUT_STUB=false nhưng chưa cấu hình cổng chi trả ngân hàng thật. "
            "Đặt BANK_PAYOUT_STUB=true cho môi trường dev/test."
        )

    # 6. Audit Logger
    audit_logger = KafkaAuditLogger(crypto_service=crypto_service, publisher=event_publisher)

    return AppContainer(
        settings=cfg,
        crypto_service=crypto_service,
        nonce_store=nonce_store,
        idempotency_store=idempotency_store,
        event_publisher=event_publisher,
        audit_logger=audit_logger,
        stripe_gateway=stripe_gateway,
        bank_payout_gateway=bank_payout_gateway,
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
