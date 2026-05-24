import asyncio
import time
from redis.asyncio import Redis
from app.domain.ports.nonce_store import NonceStore


class RedisNonceStore(NonceStore):
    def __init__(self, redis: Redis, key_prefix: str = "shipping-svc:nonce:"):
        self._redis = redis
        self._prefix = key_prefix

    async def consume_nonce(self, nonce: str, ttl_seconds: int) -> bool:
        key = f"{self._prefix}{nonce}"
        was_set = await self._redis.set(key, "1", nx=True, ex=ttl_seconds)
        return bool(was_set)


class InMemoryNonceStore(NonceStore):
    def __init__(self):
        self._store: dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def consume_nonce(self, nonce: str, ttl_seconds: int) -> bool:
        now = time.time()
        async with self._lock:
            expired = [k for k, exp in self._store.items() if exp <= now]
            for key in expired:
                del self._store[key]
            if nonce in self._store:
                return False
            self._store[nonce] = now + ttl_seconds
            return True
        #
