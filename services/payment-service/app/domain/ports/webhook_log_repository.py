from abc import ABC, abstractmethod
from typing import Any


class WebhookLogRepository(ABC):
    @abstractmethod
    async def insert_if_new(
        self,
        event_id: str,
        psp_provider: str,
        payload: dict[str, Any],
        signature: str,
        session: Any = None,
    ) -> str | None:
        """
        Inserts webhook log atomically.
        Returns the log ID if inserted, or None if already exists (race loser).
        """
        raise NotImplementedError

    @abstractmethod
    async def mark_as_processed(self, log_id: str, session: Any = None) -> None:
        raise NotImplementedError
