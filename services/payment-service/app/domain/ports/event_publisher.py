from abc import ABC, abstractmethod
from typing import Any


class EventPublisher(ABC):
    @abstractmethod
    async def publish(self, event_type: str, aggregate_id: str, payload: dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    async def verify_inbound(self, envelope: dict[str, Any]) -> bool:
        raise NotImplementedError
