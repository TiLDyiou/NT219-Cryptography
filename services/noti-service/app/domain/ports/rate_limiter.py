from abc import ABC, abstractmethod


class RateLimiter(ABC):
    @abstractmethod
    async def allow(self, user_id: str, category: str, limit: int, window_seconds: int) -> bool:
        raise NotImplementedError
