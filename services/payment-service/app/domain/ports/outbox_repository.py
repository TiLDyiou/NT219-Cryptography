from abc import ABC, abstractmethod
from typing import Any


class OutboxRepository(ABC):
    @abstractmethod
    async def save_event(
        self,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
        session: Any = None,
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    async def get_pending_events(self, limit: int, session: Any = None) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def mark_as_published(self, event_id: str, session: Any = None) -> None:
        raise NotImplementedError

    @abstractmethod
    async def mark_as_failed(self, event_id: str, error_msg: str, session: Any = None) -> None:
        raise NotImplementedError
