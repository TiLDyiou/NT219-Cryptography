import time

from app.domain.ports.rate_limiter import RateLimiter


class InMemoryRateLimiter(RateLimiter):
    def __init__(self):
        self._buckets: dict[str, list[float]] = {}

    async def allow(self, user_id: str, category: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        key = f"{user_id}:{category}"
        bucket = [ts for ts in self._buckets.get(key, []) if ts > now - window_seconds]
        if len(bucket) >= limit:
            self._buckets[key] = bucket
            return False
        bucket.append(now)
        self._buckets[key] = bucket
        return True


class RedisRateLimiter(RateLimiter):
    def __init__(self, redis, key_prefix: str = "notification:rate:"):
        self._redis = redis
        self._key_prefix = key_prefix

    async def allow(self, user_id: str, category: str, limit: int, window_seconds: int) -> bool:
        now_ms = int(time.time() * 1000)
        window_start = now_ms - window_seconds * 1000
        key = f"{self._key_prefix}{user_id}:{category}"
        pipe = self._redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now_ms): now_ms})
        pipe.expire(key, window_seconds)
        _, count, _, _ = await pipe.execute()
        if int(count) >= limit:
            await self._redis.zrem(key, str(now_ms))
            return False
        return True
