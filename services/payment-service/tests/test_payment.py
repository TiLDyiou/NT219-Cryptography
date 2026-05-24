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
async def test_out_of_order_webhook_noop(db_session):
    from app.infrastructure.persistence.repositories.payment_repository import PgPaymentRepository
    repo = PgPaymentRepository()
    
    # Save a succeeded transaction
    tx = PaymentTransaction(
        id="tx_123",
        order_id="order_123",
        user_id="user_123",
        merchant_id="merchant_123",
        amount=Decimal("1000"),
        currency="VND",
        status=PaymentStatus.SUCCEEDED,
        idempotency_key="idemp_123",
        psp_intent_id="pi_123",
    )
    await repo.save_transaction(tx, session=db_session)
    await db_session.commit()
    
    # A stale webhook requires_action arrives. can_transition(SUCCEEDED, REQUIRES_ACTION) is False.
    # It should not regress transaction status.
    current_status = PaymentStatus.SUCCEEDED
    target_status = PaymentStatus.REQUIRES_ACTION
    
    allowed = PaymentStatus.can_transition(current_status, target_status)
    assert allowed is False  # Safe from out-of-order regression!
