import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("VAULT_ENABLED", "false")
os.environ.setdefault("KAFKA_ENABLED", "false")
os.environ.setdefault("REDIS_ENABLED", "false")
os.environ.setdefault("REQUIRE_INBOUND_HMAC", "false")
os.environ.setdefault("REQUIRE_NONCE_GUARD", "false")
os.environ.setdefault("ALEMBIC_CHECK_ON_STARTUP", "false")

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.cache.redis_rate_limiter import InMemoryRateLimiter
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService
from app.infrastructure.email.jinja_template_renderer import JinjaTemplateRenderer
from app.infrastructure.email.smtp_email_gateway import FakeEmailGateway
from app.infrastructure.messaging.kafka_producer import NullEventPublisher
from app.infrastructure.persistence.models import Base, NotificationChannelModel, NotificationTemplateModel
from app.infrastructure.persistence.repositories.notification_repository import PgNotificationRepository
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.preference_repository import PgPreferenceRepository
from app.infrastructure.persistence.repositories.template_repository import TemplateRepository


@pytest.fixture
def crypto_service():
    return LocalDevCryptoService("test-notification-crypto-key-32!")


@pytest.fixture
def event_publisher():
    return NullEventPublisher()


@pytest.fixture
def audit_logger(crypto_service, event_publisher):
    return KafkaAuditLogger(crypto_service, event_publisher)


@pytest_asyncio.fixture
async def session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        channel = NotificationChannelModel(id="channel-email", code="email", name="Email", provider="gmail_smtp")
        session.add(channel)
        session.add(
            NotificationTemplateModel(
                id="template-order-confirmed",
                code="order_confirmed",
                channel_id="channel-email",
                category="order",
                subject_template="Order {{ order_number }} confirmed",
                html_template="<p>Hello {{ customer_name }}</p>",
                text_template="Hello {{ customer_name }}",
                variables=["order_number", "customer_name"],
            )
        )
        await session.commit()
    yield factory
    await engine.dispose()


@pytest_asyncio.fixture
async def session(session_factory):
    async with session_factory() as db:
        yield db


@pytest.fixture
def send_use_case(session, audit_logger):
    from app.application.use_cases.send_notification import SendNotificationUseCase

    gateway = FakeEmailGateway()
    use_case = SendNotificationUseCase(
        session,
        TemplateRepository(),
        PgNotificationRepository(),
        PgPreferenceRepository(),
        PgOutboxRepository(),
        JinjaTemplateRenderer(),
        gateway,
        InMemoryRateLimiter(),
        audit_logger,
    )
    return use_case, gateway
