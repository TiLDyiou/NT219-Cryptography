from abc import ABC, abstractmethod
from typing import Any

from app.domain.entities.notification import NotificationEntity


class NotificationRepository(ABC):
    @abstractmethod
    async def create(self, session, notification: NotificationEntity) -> Any:
        raise NotImplementedError

    @abstractmethod
    async def record_attempt(
        self,
        session,
        notification_id: str,
        status: str,
        provider_response: dict | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    async def mark_sent(self, session, notification_id: str, provider_response: dict | None = None) -> None:
        raise NotImplementedError

    @abstractmethod
    async def mark_failed(
        self,
        session,
        notification_id: str,
        error_code: str | None,
        error_message: str | None,
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    async def get(self, session, notification_id: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    async def list_retryable(self, session, limit: int = 50) -> list[Any]:
        raise NotImplementedError
