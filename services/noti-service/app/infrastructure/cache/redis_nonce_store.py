import time

from app.domain.ports.nonce_store import NonceStore


class InMemoryNonceStore(NonceStore):
    def __init__(self):
        self._items: dict[str, float] = {}

    async def consume_nonce(self, nonce: str, ttl_seconds: int) -> bool:
        now = time.time()
        self._items = {k: expiry for k, expiry in self._items.items() if expiry > now}
        if nonce in self._items:
            return False
        self._items[nonce] = now + ttl_seconds
        return True


class RedisNonceStore(NonceStore):
    def __init__(self, redis, key_prefix: str = "notification-svc:nonce:"):
        self._redis = redis
        self._key_prefix = key_prefix

    async def consume_nonce(self, nonce: str, ttl_seconds: int) -> bool:
        return bool(await self._redis.set(f"{self._key_prefix}{nonce}", b"1", nx=True, ex=ttl_seconds))
