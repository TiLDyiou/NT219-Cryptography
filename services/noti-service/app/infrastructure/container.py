import logging
from dataclasses import dataclass

from redis.asyncio import Redis

from app.core.config import Settings, settings
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.idempotency_store import IdempotencyStore
from app.domain.ports.nonce_store import NonceStore
from app.domain.ports.rate_limiter import RateLimiter
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore, RedisIdempotencyStore
from app.infrastructure.cache.redis_nonce_store import InMemoryNonceStore, RedisNonceStore
from app.infrastructure.cache.redis_rate_limiter import InMemoryRateLimiter, RedisRateLimiter
from app.infrastructure.crypto.vault_client import VaultClient
from app.infrastructure.crypto.digital_signature import EventSigner
from app.infrastructure.crypto.envelope_encryption import EnvelopeEncryptor
from app.infrastructure.crypto.hmac_signer import HmacSigner
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService, VaultCryptoService
from app.infrastructure.crypto.vault_transit import VaultTransit
from app.infrastructure.email.jinja_template_renderer import JinjaTemplateRenderer
from app.infrastructure.email.smtp_email_gateway import FakeEmailGateway, SmtpEmailGateway, VaultSmtpCredentialProvider
from app.infrastructure.messaging.kafka_producer import KafkaEventPublisher, NullEventPublisher, create_kafka_producer
from app.infrastructure.persistence.database import AsyncSessionLocal
from app.infrastructure.persistence.repositories.notification_repository import PgNotificationRepository
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.preference_repository import PgPreferenceRepository
from app.infrastructure.persistence.repositories.template_repository import TemplateRepository

logger = logging.getLogger(__name__)


@dataclass
class AppContainer:
    settings: Settings
    crypto_service: CryptoService
    nonce_store: NonceStore
    idempotency_store: IdempotencyStore
    rate_limiter: RateLimiter
    event_publisher: EventPublisher
    audit_logger: KafkaAuditLogger
    template_renderer: JinjaTemplateRenderer
    email_gateway: object
    template_repository: TemplateRepository
    notification_repository: PgNotificationRepository
    preference_repository: PgPreferenceRepository
    outbox_repository: PgOutboxRepository
    vault_client: VaultClient | None = None
    redis_client: Redis | None = None
    kafka_producer: object | None = None
    session_factory: object = AsyncSessionLocal

    def send_notification_use_case(self, session):
        from app.application.use_cases.send_notification import SendNotificationUseCase

        return SendNotificationUseCase(
            session,
            self.template_repository,
            self.notification_repository,
            self.preference_repository,
            self.outbox_repository,
            self.template_renderer,
            self.email_gateway,
            self.rate_limiter,
            self.audit_logger,
            self.crypto_service,
            self.settings.redis.rate_limit_tokens,
            self.settings.redis.rate_limit_window_seconds,
        )

    def handle_order_event_use_case(self, session):
        from app.application.use_cases.handle_order_event import HandleOrderEventUseCase

        return HandleOrderEventUseCase(self.send_notification_use_case(session))

    def handle_payment_event_use_case(self, session):
        from app.application.use_cases.handle_payment_event import HandlePaymentEventUseCase

        return HandlePaymentEventUseCase(self.send_notification_use_case(session))

    def handle_shipping_event_use_case(self, session):
        from app.application.use_cases.handle_shipping_event import HandleShippingEventUseCase

        return HandleShippingEventUseCase(self.send_notification_use_case(session))

    def retry_failed_notification_use_case(self, session):
        from app.application.use_cases.retry_failed_notification import RetryFailedNotificationUseCase

        return RetryFailedNotificationUseCase(
            session,
            self.send_notification_use_case(session),
            self.template_repository,
            self.crypto_service,
        )


_container: AppContainer | None = None


async def build_container(cfg: Settings | None = None) -> AppContainer:
    cfg = cfg or settings
    vault_client = None
    redis_client = None
    kafka_producer = None

    crypto_service: CryptoService = LocalDevCryptoService(cfg.LOCAL_CRYPTO_SECRET)
    if cfg.vault.enabled:
        try:
            vault_client = VaultClient(cfg.vault)
            await vault_client.initialize()
            transit = VaultTransit(vault_client)
            crypto_service = VaultCryptoService(
                EnvelopeEncryptor(transit, cfg.vault.fle_key_name),
                HmacSigner(transit, cfg.vault.hmac_key_name),
                EventSigner(transit, cfg.vault.sign_key_name),
            )
            logger.info("Vault initialized for notification crypto")
        except Exception:
            # C-03: production phải fail-fast thay vì dùng crypto dev hard-code.
            if cfg.is_production:
                logger.error("Vault required in production but unavailable", exc_info=True)
                raise
            logger.warning("Vault connection failed; using local dev crypto", exc_info=True)
            vault_client = None

    if cfg.redis.enabled:
        try:
            redis_client = Redis.from_url(cfg.redis.url, decode_responses=False)
            await redis_client.ping()
            nonce_store: NonceStore = RedisNonceStore(redis_client)
            idempotency_store: IdempotencyStore = RedisIdempotencyStore(redis_client)
            rate_limiter: RateLimiter = RedisRateLimiter(redis_client)
        except Exception:
            # H-06: in-memory nonce/idempotency/rate-limit mất tác dụng đa pod.
            if cfg.is_production:
                logger.error("Redis required in production but unavailable", exc_info=True)
                raise
            logger.warning("Redis connection failed; using in-memory fallbacks", exc_info=True)
            nonce_store = InMemoryNonceStore()
            idempotency_store = InMemoryIdempotencyStore()
            rate_limiter = InMemoryRateLimiter()
    else:
        nonce_store = InMemoryNonceStore()
        idempotency_store = InMemoryIdempotencyStore()
        rate_limiter = InMemoryRateLimiter()

    if cfg.kafka.enabled:
        try:
            kafka_producer = await create_kafka_producer(cfg.kafka)
            event_publisher: EventPublisher = KafkaEventPublisher(kafka_producer, crypto_service, cfg.kafka)
        except Exception:
            # H-07: NullEventPublisher âm thầm bỏ event (noti là consumer chính).
            if cfg.is_production:
                logger.error("Kafka required in production but unavailable", exc_info=True)
                raise
            logger.warning("Kafka initialization failed; using null publisher", exc_info=True)
            event_publisher = NullEventPublisher()
    else:
        event_publisher = NullEventPublisher()

    if cfg.SMTP_USERNAME and cfg.SMTP_APP_PASSWORD:
        credentials = VaultSmtpCredentialProvider(
            cfg.smtp,
            vault_client=vault_client,
            secret_path=cfg.vault.smtp_secret_path if vault_client else None,
        )
        email_gateway = SmtpEmailGateway(credentials)
    else:
        email_gateway = FakeEmailGateway()

    return AppContainer(
        settings=cfg,
        crypto_service=crypto_service,
        nonce_store=nonce_store,
        idempotency_store=idempotency_store,
        rate_limiter=rate_limiter,
        event_publisher=event_publisher,
        audit_logger=KafkaAuditLogger(crypto_service, event_publisher),
        template_renderer=JinjaTemplateRenderer(),
        email_gateway=email_gateway,
        template_repository=TemplateRepository(),
        notification_repository=PgNotificationRepository(),
        preference_repository=PgPreferenceRepository(),
        outbox_repository=PgOutboxRepository(),
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
