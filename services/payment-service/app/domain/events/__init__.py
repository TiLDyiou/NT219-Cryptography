from dataclasses import dataclass, asdict
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class PaymentCompleted:
    payment_id: str
    order_id: str
    amount: Decimal
    currency: str
    paid_at: str

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["amount"] = str(self.amount)
        return data


@dataclass(frozen=True)
class PaymentFailed:
    payment_id: str
    order_id: str
    failure_code: str
    failure_message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class PaymentRequiresAction:
    payment_id: str
    order_id: str
    next_action_url: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class RefundCompleted:
    payment_id: str
    order_id: str
    refund_id: str
    refund_amount: Decimal
    is_full: bool

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["refund_amount"] = str(self.refund_amount)
        return data


@dataclass(frozen=True)
class SettlementPaid:
    settlement_id: str
    merchant_id: str
    net_amount: Decimal
    currency: str
    paid_at: str

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["net_amount"] = str(self.net_amount)
        return data
