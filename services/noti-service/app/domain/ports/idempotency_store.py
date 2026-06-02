from abc import ABC, abstractmethod


class IdempotencyStore(ABC):
    @abstractmethod
    async def mark_processed(self, key: str, ttl_seconds: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def remove(self, key: str) -> None:
        """Nhả 'claim' đã đặt bằng mark_processed (dùng khi xử lý thất bại)."""
        raise NotImplementedError
