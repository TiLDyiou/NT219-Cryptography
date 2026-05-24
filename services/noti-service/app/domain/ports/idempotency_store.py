from abc import ABC, abstractmethod


class IdempotencyStore(ABC):
    @abstractmethod
    async def mark_processed(self, key: str, ttl_seconds: int) -> bool:
        raise NotImplementedError
