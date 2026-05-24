import pytest

from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService


@pytest.mark.asyncio
async def test_local_crypto_encrypt_decrypt_roundtrip():
    crypto = LocalDevCryptoService("test-secret-key")
    plaintext = "Nguyen Van A"
    encrypted = await crypto.encrypt_field(plaintext)
    assert encrypted is not None
    assert encrypted != plaintext.encode()
    decrypted = await crypto.decrypt_field(encrypted)
    assert decrypted == plaintext


@pytest.mark.asyncio
async def test_local_hmac_sign_and_verify():
    crypto = LocalDevCryptoService("test-secret-key")
    body = b'{"order_id":"123"}'
    signature = await crypto.sign_request(
        method="POST",
        path="/api/v1/payments/charge",
        body=body,
        timestamp="1719432000",
        nonce="11111111-1111-1111-1111-111111111111",
    )
    valid = await crypto.verify_request(
        method="POST",
        path="/api/v1/payments/charge",
        body=body,
        timestamp="1719432000",
        nonce="11111111-1111-1111-1111-111111111111",
        signature=signature.value,
    )
    assert valid is True


@pytest.mark.asyncio
async def test_local_event_sign_and_verify():
    crypto = LocalDevCryptoService("test-secret-key")
    event = {
        "event_id": "evt-1",
        "event_type": "order.created",
        "aggregate_id": "order-1",
        "timestamp": "2026-04-12T10:30:00+00:00",
        "version": 1,
        "source": "order-service",
        "payload": {"status": "payment_processing"},
    }
    signature = await crypto.sign_event(event)
    envelope = {**event, "signature": signature.__dict__}
    assert await crypto.verify_event(envelope) is True
