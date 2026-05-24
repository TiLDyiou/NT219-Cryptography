from abc import ABC, abstractmethod

from app.domain.events.base import DomainEvent


class EventPublisher(ABC):
    @abstractmethod
    async def publish(self, event: DomainEvent) -> None:
        raise NotImplementedError

    @abstractmethod
    async def verify_inbound(self, envelope: dict) -> bool:
        raise NotImplementedError
