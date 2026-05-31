from types import SimpleNamespace

import pytest

from app.api.v1.user.order import _build_shipping_payload


class CryptoReturnsText:
    async def decrypt_field(self, blob):
        return blob.decode("utf-8") if blob else None


class CryptoRaisesValueError:
    async def decrypt_field(self, blob):
        raise ValueError("Unsupported local dev blob version")


def _order_with_shipping_address():
    encrypted = SimpleNamespace(
        full_name=b"Test User",
        phone=b"0900000000",
        email=b"test@example.com",
        address_line1=b"123 Street",
    )
    address = SimpleNamespace(
        address_type="shipping",
        encrypted=encrypted,
        city="Ho Chi Minh",
        state_province="HCM",
        postal_code="700000",
    )
    return SimpleNamespace(id="order-1", addresses=[address])


@pytest.mark.asyncio
async def test_build_shipping_payload_returns_decrypted_address():
    payload = await _build_shipping_payload(
        _order_with_shipping_address(), CryptoReturnsText()
    )

    assert payload.full_name == "Test User"
    assert payload.phone == "0900000000"
    assert payload.address_line1 == "123 Street"
    assert payload.city == "Ho Chi Minh"


@pytest.mark.asyncio
async def test_build_shipping_payload_ignores_undecryptable_address():
    payload = await _build_shipping_payload(
        _order_with_shipping_address(), CryptoRaisesValueError()
    )

    assert payload is None
