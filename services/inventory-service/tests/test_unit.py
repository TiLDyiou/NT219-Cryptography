import pytest

from app.core.exceptions import (
    EntityNotFoundException,
    IdempotencyConflictException,
    OptimisticLockException,
    OutOfStockException,
)
from app.domain.events import (
    InventoryConfirmed,
    InventoryReleased,
    InventoryReserved,
    StockUpdated,
)
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore
from app.infrastructure.cache.redis_nonce_store import InMemoryNonceStore
from app.infrastructure.crypto.hmac_signer import build_canonical_request
from app.infrastructure.crypto.vault_crypto_service import LocalDevCryptoService
from tests.factories import get_mock_inventory_item, get_mock_reserve_payload


class TestInventoryItemEntity:
    def test_quantity_available_is_on_hand_minus_reserved(self):
        item = get_mock_inventory_item({"quantity_on_hand": 10, "quantity_reserved": 3})
        assert item.quantity_available == 7

    def test_quantity_available_with_no_reservations(self):
        item = get_mock_inventory_item({"quantity_on_hand": 5, "quantity_reserved": 0})
        assert item.quantity_available == 5


class TestDomainEvents:
    def test_inventory_reserved_to_dict(self):
        event = InventoryReserved(
            order_id="order-1",
            reservations=[{"id": "res-1", "quantity": 2}],
        )
        data = event.to_dict()
        assert data["order_id"] == "order-1"
        assert data["reserved"] is True
        assert len(data["reservations"]) == 1

    def test_inventory_released_to_dict(self):
        event = InventoryReleased(order_id="order-1", released_count=2)
        data = event.to_dict()
        assert data["released"] is True
        assert data["released_count"] == 2

    def test_inventory_confirmed_to_dict(self):
        event = InventoryConfirmed(order_id="order-1", confirmed_count=1)
        data = event.to_dict()
        assert data["confirmed"] is True
        assert data["confirmed_count"] == 1

    def test_stock_updated_to_dict(self):
        event = StockUpdated(
            inventory_item_id="item-1",
            product_id="prod-1",
            variant_id=None,
            quantity_on_hand=3,
            quantity_available=3,
        )
        data = event.to_dict()
        assert data["inventory_item_id"] == "item-1"
        assert data["quantity_available"] == 3


class TestLocalDevCryptoService:
    @pytest.fixture
    def crypto(self):
        return LocalDevCryptoService("unit-test-crypto-secret-key-32!")

    @pytest.mark.asyncio
    async def test_encrypt_decrypt_roundtrip(self, crypto):
        encrypted = await crypto.encrypt_field("secret address")
        decrypted = await crypto.decrypt_field(encrypted)
        assert decrypted == "secret address"

    @pytest.mark.asyncio
    async def test_encrypt_none_returns_none(self, crypto):
        assert await crypto.encrypt_field(None) is None
        assert await crypto.decrypt_field(None) is None

    @pytest.mark.asyncio
    async def test_sign_and_verify_request(self, crypto):
        body = b'{"order_id":"order-1"}'
        signature = await crypto.sign_request(
            "POST", "/api/v1/internal/reservations/reserve", body, "1700000000", "nonce-1"
        )
        valid = await crypto.verify_request(
            "POST",
            "/api/v1/internal/reservations/reserve",
            body,
            "1700000000",
            "nonce-1",
            signature.value,
        )
        assert valid is True

    @pytest.mark.asyncio
    async def test_reject_tampered_request_body(self, crypto):
        body = b'{"order_id":"order-1"}'
        signature = await crypto.sign_request(
            "POST", "/api/v1/internal/reservations/reserve", body, "1700000000", "nonce-1"
        )
        tampered = b'{"order_id":"order-2"}'
        valid = await crypto.verify_request(
            "POST",
            "/api/v1/internal/reservations/reserve",
            tampered,
            "1700000000",
            "nonce-1",
            signature.value,
        )
        assert valid is False

    @pytest.mark.asyncio
    async def test_sign_and_verify_event(self, crypto):
        event = {"order_id": "order-1", "reserved": True}
        signature = await crypto.sign_event(event)
        envelope = {**event, "signature": signature.__dict__}
        assert await crypto.verify_event(envelope) is True


class TestBuildCanonicalRequest:
    def test_includes_method_path_timestamp_nonce_and_body_hash(self):
        body = b'{"test":true}'
        canonical = build_canonical_request(
            "post", "/api/v1/test", "1700000000", "nonce-abc", body
        )
        assert canonical.startswith("POST\n/api/v1/test\n1700000000\nnonce-abc\n")


class TestInMemoryIdempotencyStore:
    @pytest.mark.asyncio
    async def test_first_claim_is_new(self):
        store = InMemoryIdempotencyStore()
        status, cached = await store.claim_or_wait("user-1", "key-1", "hash-a")
        assert status.value == "new"
        assert cached is None

    @pytest.mark.asyncio
    async def test_replay_returns_cached_response(self):
        store = InMemoryIdempotencyStore()
        response = {"order_id": "order-1", "reserved": True}

        await store.claim_or_wait("user-1", "key-1", "hash-a")
        await store.save_response("user-1", "key-1", "hash-a", response)

        status, cached = await store.claim_or_wait("user-1", "key-1", "hash-a")
        assert status.value == "cached"
        assert cached == response

    @pytest.mark.asyncio
    async def test_same_key_different_payload_raises_conflict(self):
        store = InMemoryIdempotencyStore()
        await store.claim_or_wait("user-1", "key-1", "hash-a")
        await store.save_response("user-1", "key-1", "hash-a", {"ok": True})

        with pytest.raises(IdempotencyConflictException):
            await store.claim_or_wait("user-1", "key-1", "hash-b")


class TestInMemoryNonceStore:
    @pytest.mark.asyncio
    async def test_first_nonce_is_accepted(self):
        store = InMemoryNonceStore()
        assert await store.consume_nonce("nonce-1", 60) is True

    @pytest.mark.asyncio
    async def test_reused_nonce_is_rejected(self):
        store = InMemoryNonceStore()
        assert await store.consume_nonce("nonce-1", 60) is True
        assert await store.consume_nonce("nonce-1", 60) is False


class TestInventoryExceptions:
    def test_out_of_stock_includes_product_id(self):
        exc = OutOfStockException("prod-1", "SKU-1")
        assert exc.error_code == "OUT_OF_STOCK"
        assert exc.status_code == 409
        assert "prod-1" in exc.message

    def test_entity_not_found(self):
        exc = EntityNotFoundException("Warehouse", "wh-missing")
        assert exc.status_code == 404
        assert "wh-missing" in exc.message

    def test_optimistic_lock(self):
        exc = OptimisticLockException(1, 2)
        assert exc.error_code == "OPTIMISTIC_LOCK_ERROR"
        assert "Expected 1" in exc.message


class TestReservePayloadFactory:
    def test_factory_provides_valid_defaults(self):
        payload = get_mock_reserve_payload()
        assert payload["order_id"] == "order-1"
        assert payload["items"][0]["quantity"] == 2

    def test_factory_allows_overrides(self):
        payload = get_mock_reserve_payload({"order_id": "custom-order"})
        assert payload["order_id"] == "custom-order"
