from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class InventoryReserveRequest:
    order_id: str
    saga_id: str | None
    idempotency_key: str
    items: list[dict[str, Any]]
    correlation_id: str | None = None


@dataclass(frozen=True)
class InventoryReserveResult:
    reserved: bool
    order_id: str
    reservations: list[dict[str, Any]]


@dataclass(frozen=True)
class InventoryReleaseRequest:
    order_id: str
    saga_id: str | None
    reason: str = "saga_compensated"


@dataclass(frozen=True)
class InventoryConfirmRequest:
    order_id: str
    saga_id: str | None = None


class InventoryGateway(ABC):
    @abstractmethod
    async def reserve(self, request: InventoryReserveRequest) -> InventoryReserveResult:
        raise NotImplementedError

    @abstractmethod
    async def release(self, request: InventoryReleaseRequest) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def confirm(self, request: InventoryConfirmRequest) -> dict[str, Any]:
        raise NotImplementedError
