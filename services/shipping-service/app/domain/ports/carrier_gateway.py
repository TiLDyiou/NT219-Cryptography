from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class RateQuote:
    provider_code: str
    service_name: str
    amount: Decimal
    currency: str = "VND"
    estimated_days: int | None = None


@dataclass(frozen=True)
class LabelResult:
    provider_shipment_id: str
    tracking_number: str
    provider_label_url: str | None = None
    raw_response: dict[str, Any] = field(default_factory=dict)


class CarrierGateway(ABC):
    @abstractmethod
    async def quote(self, rate_request: dict[str, Any]) -> RateQuote:
        raise NotImplementedError

    @abstractmethod
    async def create_label(self, shipment: Any) -> LabelResult:
        raise NotImplementedError

    @abstractmethod
    async def cancel(self, provider_shipment_id: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def fetch_tracking(self, tracking_number: str) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def verify_webhook(self, payload: bytes, headers: dict[str, str]) -> dict[str, Any]:
        raise NotImplementedError
