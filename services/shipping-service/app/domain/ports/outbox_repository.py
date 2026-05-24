from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class OutboxRepository(ABC):
    @abstractmethod
    async def add_event(
        self,
        session: AsyncSession,
        *,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        raise NotImplementedError
