from abc import ABC, abstractmethod
from typing import Any


class OutboxRepository(ABC):
    @abstractmethod
    async def add(
        self,
        session,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> Any:
        raise NotImplementedError
