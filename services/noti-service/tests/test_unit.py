import pytest
from sqlalchemy import select

from app.application.use_cases.event_mapping import command_from_order_event
from app.application.use_cases.send_notification import SendNotificationCommand, SendNotificationUseCase
from app.infrastructure.cache.redis_rate_limiter import InMemoryRateLimiter
from app.infrastructure.email.jinja_template_renderer import JinjaTemplateRenderer
from app.infrastructure.email.smtp_email_gateway import FakeEmailGateway
from app.infrastructure.persistence.models import NotificationLogModel, UserNotificationPreferenceModel
from app.infrastructure.persistence.repositories.notification_repository import PgNotificationRepository
from app.infrastructure.persistence.repositories.outbox_repository import PgOutboxRepository
from app.infrastructure.persistence.repositories.preference_repository import PgPreferenceRepository
from app.infrastructure.persistence.repositories.template_repository import TemplateRepository


def _command():
    return SendNotificationCommand(
        user_id="user-1",
        recipient_email="testy@gmail.com",
        template_code="order_confirmed",
        category="order",
        variables={"order_number": "ORD-1", "customer_name": "Testy"},
        reference_type="order",
        reference_id="order-1",
    )


@pytest.mark.asyncio
async def test_send_notification_success(session, send_use_case):
    use_case, gateway = send_use_case
    result = await use_case.execute(_command())
    assert result.status == "sent"
    assert gateway.sent[0].to_email == "testy@gmail.com"
    rows = (await session.execute(select(NotificationLogModel))).scalars().all()
    assert rows[0].recipient_masked == "t***y@gmail.com"
    assert rows[0].status == "sent"


@pytest.mark.asyncio
async def test_send_notification_failure(session, audit_logger):
    use_case = SendNotificationUseCase(
        session,
        TemplateRepository(),
        PgNotificationRepository(),
        PgPreferenceRepository(),
        PgOutboxRepository(),
        JinjaTemplateRenderer(),
        FakeEmailGateway(fail=True),
        InMemoryRateLimiter(),
        audit_logger,
    )
    result = await use_case.execute(_command())
    assert result.status == "failed"


@pytest.mark.asyncio
async def test_send_notification_opt_out(session, send_use_case):
    session.add(
        UserNotificationPreferenceModel(
            user_id="user-1",
            channel_id="channel-email",
            category="order",
            is_enabled=False,
        )
    )
    await session.commit()
    use_case, _ = send_use_case
    result = await use_case.execute(_command())
    assert result.status == "skipped"
    assert result.reason == "preference_opt_out"


@pytest.mark.asyncio
async def test_rate_limited(session, audit_logger):
    use_case = SendNotificationUseCase(
        session,
        TemplateRepository(),
        PgNotificationRepository(),
        PgPreferenceRepository(),
        PgOutboxRepository(),
        JinjaTemplateRenderer(),
        FakeEmailGateway(),
        InMemoryRateLimiter(),
        audit_logger,
        rate_limit_tokens=0,
    )
    result = await use_case.execute(_command())
    assert result.status == "skipped"
    assert result.reason == "rate_limited"


def test_order_event_mapping_ignores_order_created():
    assert command_from_order_event({"event_type": "order.created", "payload": {}}) is None


def test_order_event_mapping_confirmed():
    command = command_from_order_event(
        {
            "event_type": "order.status_changed",
            "aggregate_id": "order-1",
            "payload": {
                "to_status": "confirmed",
                "user_id": "user-1",
                "customer_email": "u@example.com",
                "order_number": "ORD-1",
            },
        }
    )
    assert command.template_code == "order_confirmed"
