import pytest

from app.domain.ports.email_gateway import EmailMessage
from app.infrastructure.email.smtp_email_gateway import FakeEmailGateway


@pytest.mark.asyncio
async def test_fake_email_gateway_records_message():
    gateway = FakeEmailGateway()
    result = await gateway.send(EmailMessage("u@example.com", "Subject", "<p>Hi</p>", "Hi"))
    assert result.success is True
    assert gateway.sent[0].subject == "Subject"
