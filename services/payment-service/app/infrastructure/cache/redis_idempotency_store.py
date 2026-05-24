import asyncio
import json
import time
from typing import Any
from redis.asyncio import Redis
from app.domain.ports.idempotency_store import IdempotencyStore, IdempotencyClaimStatus
from app.core.exceptions import IdempotencyConflictException, BusinessRuleException


class RedisIdempotencyStore(IdempotencyStore):
    def __init__(self, redis: Redis, key_prefix: str = "payment:idemp:"):
        self._redis = redis
        self._prefix = key_prefix

    async def claim_or_wait(
        self, user_id: str, key: str, request_hash: str, wait_timeout: int = 30
    ) -> tuple[IdempotencyClaimStatus, dict[str, Any] | None]:
        redis_key = f"{self._prefix}{user_id}:{key}"
        
        # Atomically set NX
        claimed = await self._redis.set(
            redis_key,
            json.dumps({"status": "processing", "hash": request_hash}),
            nx=True,
            ex=86400,  # 24 hours
        )
        if claimed:
            return IdempotencyClaimStatus.NEW, None

        # Race loser: poll for completion
        deadline = time.monotonic() + wait_timeout
        while time.monotonic() < deadline:
            cached = await self._redis.get(redis_key)
            if not cached:
                # Key expired or cleared in between? Re-claim.
                return await self.claim_or_wait(user_id, key, request_hash, wait_timeout)
                
            data = json.loads(cached)
            if data["status"] == "completed":
                if data["hash"] != request_hash:
                    raise IdempotencyConflictException(
                        "Idempotency key already used with different payload."
                    )
                return IdempotencyClaimStatus.CACHED, data["response"]
                
            await asyncio.sleep(0.2)
            
        raise BusinessRuleException(
            message="Concurrent request in progress, please try again later.",
            error_code="CONCURRENT_REQUEST_LOCK_TIMEOUT"
        )

    async def save_response(
        self, user_id: str, key: str, request_hash: str, response: dict[str, Any]
    ) -> None:
        redis_key = f"{self._prefix}{user_id}:{key}"
        await self._redis.set(
            redis_key,
            json.dumps({"status": "completed", "hash": request_hash, "response": response}),
            ex=86400,
        )


class InMemoryIdempotencyStore(IdempotencyStore):
    def __init__(self):
        self._store: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def claim_or_wait(
        self, user_id: str, key: str, request_hash: str, wait_timeout: int = 30
    ) -> tuple[IdempotencyClaimStatus, dict[str, Any] | None]:
        store_key = f"{user_id}:{key}"
        
        async with self._lock:
            if store_key not in self._store:
                self._store[store_key] = {"status": "processing", "hash": request_hash, "created_at": time.time()}
                return IdempotencyClaimStatus.NEW, None
                
        deadline = time.monotonic() + wait_timeout
        while time.monotonic() < deadline:
            async with self._lock:
                data = self._store.get(store_key)
                if not data:
                    return await self.claim_or_wait(user_id, key, request_hash, wait_timeout)
                if data["status"] == "completed":
                    if data["hash"] != request_hash:
                        raise IdempotencyConflictException()
                    return IdempotencyClaimStatus.CACHED, data["response"]
            await asyncio.sleep(0.2)
            
        raise BusinessRuleException(
            message="Concurrent request in progress, please try again later.",
            error_code="CONCURRENT_REQUEST_LOCK_TIMEOUT"
        )

    async def save_response(
        self, user_id: str, key: str, request_hash: str, response: dict[str, Any]
    ) -> None:
        store_key = f"{user_id}:{key}"
        async with self._lock:
            self._store[store_key] = {"status": "completed", "hash": request_hash, "response": response}
