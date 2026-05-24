import pytest

from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService
from app.infrastructure.messaging.event_schemas import build_envelope


@pytest.mark.asyncio
async def test_signed_event_rejects_tampered_payload():
    crypto = LocalDevCryptoService("test-notification-crypto-key-32!")
    payload = {"notification_id": "n1", "status": "sent"}
    signature = await crypto.sign_event(
        {
            "event_id": "event-1",
            "event_type": "notification.delivered",
            "aggregate_id": "n1",
            "payload": payload,
            "occurred_at": "2026-01-01T00:00:00+00:00",
        }
    )
    envelope = build_envelope(
        "notification.delivered",
        "n1",
        payload,
        {
            "algorithm": signature.algorithm,
            "key_version": signature.key_version,
            "value": signature.value,
            "signed_hash": signature.signed_hash,
        },
        event_id="event-1",
    )
    envelope["occurred_at"] = "2026-01-01T00:00:00+00:00"
    assert await crypto.verify_event(envelope) is True
    envelope["payload"]["status"] = "failed"
    assert await crypto.verify_event(envelope) is False
