from abc import ABC, abstractmethod


class NonceStore(ABC):
    @abstractmethod
    async def consume_nonce(self, nonce: str, ttl_seconds: int) -> bool:
        """Return True if nonce was newly stored, False if already used."""
        raise NotImplementedError
