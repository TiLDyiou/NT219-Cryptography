from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class OutboxRepository(ABC):
    @abstractmethod
    async def save_event(
        self,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
        session: AsyncSession,
    ) -> None:
        raise NotImplementedError
