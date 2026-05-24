from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from app.domain.value_objects.order_status import OrderStatus, can_transition


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class OrderItemEntity:
    id: str
    product_id: str
    variant_id: str | None
    merchant_id: str
    sku: str
    product_name: str
    variant_label: str | None
    image_url: str | None
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    fulfilled_qty: int = 0
    status: str = "pending"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class EncryptedAddressFields:
    full_name: bytes
    phone: bytes
    email: bytes | None
    address_line1: bytes
    address_line2: bytes | None


@dataclass
class OrderAddressEntity:
    id: str
    address_type: str
    encrypted: EncryptedAddressFields
    city: str
    district: str
    state_province: str | None
    postal_code: str | None


@dataclass
class OrderEntity:
    id: str
    order_group_id: str
    parent_order_id: str | None
    order_number: str
    user_id: str
    merchant_id: str | None
    status: OrderStatus
    subtotal: Decimal
    shipping_fee: Decimal
    total_amount: Decimal
    item_count: int
    payment_method_type: str | None
    idempotency_key: str
    idempotency_fingerprint: str
    fraud_status: str = "pending"
    payment_id: str | None = None
    customer_note: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    items: list[OrderItemEntity] = field(default_factory=list)
    addresses: list[OrderAddressEntity] = field(default_factory=list)
    created_at: datetime = field(default_factory=_utcnow)

    @property
    def is_parent(self) -> bool:
        return self.parent_order_id is None and self.merchant_id is None

    @property
    def is_child(self) -> bool:
        return self.parent_order_id is not None and self.merchant_id is not None

    def transition_to(self, new_status: OrderStatus) -> None:
        if not can_transition(self.status, new_status):
            raise ValueError(
                f"Invalid status transition: {self.status.value} -> {new_status.value}"
            )
        self.status = new_status
