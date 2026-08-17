from abc import ABC, abstractmethod


class NonceStore(ABC):
    @abstractmethod
    async def consume_nonce(self, nonce: str, ttl_seconds: int) -> bool:
        raise NotImplementedError
