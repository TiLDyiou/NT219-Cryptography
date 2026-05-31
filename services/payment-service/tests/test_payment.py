import asyncio
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.domain.value_objects.payment_status import PaymentStatus
from app.domain.entities.payment_transaction import PaymentTransaction
from app.core.exceptions import IdempotencyConflictException, BusinessRuleException, EntityNotFoundException
from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore
from app.infrastructure.persistence.models.base import Base
from app.infrastructure.persistence.database import create_async_engine, async_sessionmaker, AsyncSession


# SQLite in-memory engine for unit testing repositories
@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_payment_status_can_transition():
    # Test valid transitions
    assert PaymentStatus.can_transition(PaymentStatus.PENDING, PaymentStatus.PROCESSING) is True
    assert PaymentStatus.can_transition(PaymentStatus.PENDING, PaymentStatus.SUCCEEDED) is True
    assert PaymentStatus.can_transition(PaymentStatus.PENDING, PaymentStatus.FAILED) is True
    assert PaymentStatus.can_transition(PaymentStatus.SUCCEEDED, PaymentStatus.REFUND_PENDING) is True
    
    # Test invalid transitions
    assert PaymentStatus.can_transition(PaymentStatus.SUCCEEDED, PaymentStatus.PENDING) is False
    assert PaymentStatus.can_transition(PaymentStatus.FAILED, PaymentStatus.SUCCEEDED) is False
    assert PaymentStatus.can_transition(PaymentStatus.CANCELLED, PaymentStatus.PROCESSING) is False


@pytest.mark.asyncio
async def test_concurrent_idempotency_dedup():
    store = InMemoryIdempotencyStore()
    user_id = "user_123"
    key = "idemp_key_abc"
    req_hash = "hash_xyz"
    
    # Simulate first claim
    status_1, _ = await store.claim_or_wait(user_id, key, req_hash, wait_timeout=1)
    assert status_1 == "new"
    
    # Save response for first claim
    response_payload = {"payment_id": "tx_ok", "status": "succeeded"}
    await store.save_response(user_id, key, req_hash, response_payload)
    
    # Second claim with same hash should hit cache immediately
    status_2, cached = await store.claim_or_wait(user_id, key, req_hash, wait_timeout=1)
    assert status_2 == "cached"
    assert cached == response_payload
    
    # Third claim with different hash should raise conflict exception
    with pytest.raises(IdempotencyConflictException):
        await store.claim_or_wait(user_id, key, "different_hash", wait_timeout=1)


@pytest.mark.asyncio
async def test_out_of_order_webhook_noop():
    # A stale webhook requires_action arrives. can_transition(SUCCEEDED, REQUIRES_ACTION) is False.
    # It should not regress transaction status.
    current_status = PaymentStatus.SUCCEEDED
    target_status = PaymentStatus.REQUIRES_ACTION
    
    allowed = PaymentStatus.can_transition(current_status, target_status)
    assert allowed is False  # Safe from out-of-order regression!


class NoopAuditLogger:
    async def log_change(self, **kwargs):
        return None


class FakeStripeCheckoutGateway:
    async def create_checkout_session(
        self,
        order_id,
        amount,
        currency,
        line_items,
        idempotency_key,
        metadata=None,
    ):
        return {
            "id": "cs_test_123",
            "url": "https://checkout.stripe.test/cs_test_123",
            "payment_status": "unpaid",
        }

    async def create_payment_intent(self, *args, **kwargs):
        raise AssertionError("Checkout flow must not create PaymentIntent")

    async def confirm_payment_intent(self, *args, **kwargs):
        raise AssertionError("Checkout flow must not confirm PaymentIntent")

    async def retrieve_payment_intent(self, intent_id):
        return {"id": intent_id, "status": "succeeded"}

    async def create_refund(self, *args, **kwargs):
        return {"id": "re_test_123"}

    def verify_webhook_signature(self, payload, sig_header):
        return {}


class FakePaymentRepository:
    def __init__(self):
        self.transactions = {}

    async def save_transaction(self, tx, session=None):
        existing = self.transactions.get(tx.id)
        if existing:
            tx.version = existing.version + 1
        self.transactions[tx.id] = tx
        return tx

    async def get_transaction_by_order_id(self, order_id, session=None):
        for tx in self.transactions.values():
            if tx.order_id == order_id:
                return tx
        return None


class FakeOutboxRepository:
    async def save_event(self, **kwargs):
        return None


class FakeSession:
    async def commit(self):
        return None

    async def rollback(self):
        return None


@pytest.mark.asyncio
async def test_charge_credit_card_creates_checkout_session():
    from app.application.use_cases.charge import ChargeUseCase

    use_case = ChargeUseCase(
        payment_repository=FakePaymentRepository(),
        idempotency_store=InMemoryIdempotencyStore(),
        outbox_repository=FakeOutboxRepository(),
        stripe_gateway=FakeStripeCheckoutGateway(),
        crypto_service=MagicMock(),
        audit_logger=NoopAuditLogger(),
        session=FakeSession(),
    )

    result = await use_case.execute(
        {
            "user_id": "user_123",
            "order_id": "order_123",
            "amount": "125000",
            "currency": "VND",
            "payment_method_type": "credit_card",
            "idempotency_key": "idem_order_123",
            "line_items": [
                {"name": "Keyboard", "quantity": 1, "unit_amount": "125000"},
            ],
        }
    )

    assert result["status"] == "processing"
    assert result["checkout_url"] == "https://checkout.stripe.test/cs_test_123"
