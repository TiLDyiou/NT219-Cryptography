import pytest

from app.infrastructure.cache.redis_idempotency_store import InMemoryIdempotencyStore


@pytest.mark.asyncio
async def test_idempotency_store_dedupes_event():
    store = InMemoryIdempotencyStore()
    assert await store.mark_processed("event-1", 60) is True
    assert await store.mark_processed("event-1", 60) is False
