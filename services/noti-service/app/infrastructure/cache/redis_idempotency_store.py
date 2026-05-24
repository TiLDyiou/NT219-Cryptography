import time

from app.domain.ports.idempotency_store import IdempotencyStore


class InMemoryIdempotencyStore(IdempotencyStore):
    def __init__(self):
        self._items: dict[str, float] = {}

    async def mark_processed(self, key: str, ttl_seconds: int) -> bool:
        now = time.time()
        self._items = {k: expiry for k, expiry in self._items.items() if expiry > now}
        if key in self._items:
            return False
        self._items[key] = now + ttl_seconds
        return True


class RedisIdempotencyStore(IdempotencyStore):
    def __init__(self, redis, key_prefix: str = "notification:idemp:"):
        self._redis = redis
        self._key_prefix = key_prefix

    async def mark_processed(self, key: str, ttl_seconds: int) -> bool:
        return bool(await self._redis.set(f"{self._key_prefix}{key}", b"1", nx=True, ex=ttl_seconds))
