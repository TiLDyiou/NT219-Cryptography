from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class PaymentChargeRequest:
    order_id: str
    user_id: str
    amount: Decimal
    payment_method_type: str
    idempotency_key: str
    currency: str = "VND"
    line_items: list[dict[str, Any]] = field(default_factory=list)


@dataclass(frozen=True)
class PaymentChargeResult:
    payment_id: str
    status: str
    transaction_ref: str | None = None
    checkout_url: str | None = None


@dataclass(frozen=True)
class PaymentRefundRequest:
    payment_id: str
    order_id: str
    amount: Decimal
    reason: str


@dataclass(frozen=True)
class PaymentRefundResult:
    refund_id: str
    status: str


class PaymentGateway(ABC):
    @abstractmethod
    async def charge(self, request: PaymentChargeRequest) -> PaymentChargeResult:
        raise NotImplementedError

    @abstractmethod
    async def refund(self, request: PaymentRefundRequest) -> PaymentRefundResult:
        raise NotImplementedError
