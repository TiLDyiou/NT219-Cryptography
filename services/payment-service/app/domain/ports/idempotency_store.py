from abc import ABC, abstractmethod
from typing import Any
from enum import Enum


class IdempotencyClaimStatus(str, Enum):
    NEW = "new"
    CACHED = "cached"


class IdempotencyStore(ABC):
    @abstractmethod
    async def claim_or_wait(
        self, user_id: str, key: str, request_hash: str, wait_timeout: int = 30
    ) -> tuple[IdempotencyClaimStatus, dict[str, Any] | None]:
        raise NotImplementedError

    @abstractmethod
    async def save_response(
        self, user_id: str, key: str, request_hash: str, response: dict[str, Any]
    ) -> None:
        raise NotImplementedError
