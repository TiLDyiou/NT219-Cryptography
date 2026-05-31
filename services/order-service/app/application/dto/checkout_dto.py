from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class AddressDTO:
    full_name: str
    phone: str
    email: str | None
    address_line1: str
    address_line2: str | None
    city: str
    state_province: str | None
    postal_code: str | None


@dataclass(frozen=True)
class CheckoutItemDTO:
    product_id: str
    variant_id: str | None
    merchant_id: str
    sku: str
    product_name: str
    variant_label: str | None
    image_url: str | None
    quantity: int
    unit_price: Decimal


@dataclass(frozen=True)
class CheckoutInput:
    cart_id: str
    payment_method_type: str
    shipping_fee: Decimal
    customer_note: str | None
    items: list[CheckoutItemDTO]
    shipping_address: AddressDTO


@dataclass(frozen=True)
class CheckoutOrderSummaryDTO:
    order_id: str
    order_number: str
    merchant_id: str
    status: str
    total_amount: Decimal


@dataclass(frozen=True)
class CheckoutOutput:
    order_group_id: str
    parent_order_number: str
    status: str
    orders: list[CheckoutOrderSummaryDTO]
    checkout_url: str | None = None


@dataclass(frozen=True)
class CheckoutContext:
    user_id: str
    idempotency_key: str
    correlation_id: str | None
    ip_address: str | None
    user_agent: str | None
    payload: CheckoutInput


@dataclass(frozen=True)
class SagaStepResult:
    success: bool
    data: dict[str, Any] | None = None
    error: str | None = None
    retryable: bool = False
