from abc import ABC, abstractmethod
from typing import Any


class NonceStore(ABC):
    @abstractmethod
    async def consume_nonce(self, nonce: str, ttl_seconds: int) -> bool:
        raise NotImplementedError
