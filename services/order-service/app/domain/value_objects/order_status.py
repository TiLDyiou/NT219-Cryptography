from enum import StrEnum


class OrderStatus(StrEnum):
    PENDING_PAYMENT = "pending_payment"
    PAYMENT_PROCESSING = "payment_processing"
    PAYMENT_FAILED = "payment_failed"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    READY_TO_SHIP = "ready_to_ship"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLATION_REQUESTED = "cancellation_requested"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


VALID_TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.PENDING_PAYMENT: frozenset(
        {OrderStatus.PAYMENT_PROCESSING, OrderStatus.CONFIRMED, OrderStatus.CANCELLED}
    ),
    OrderStatus.PAYMENT_PROCESSING: frozenset(
        {OrderStatus.CONFIRMED, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED}
    ),
    OrderStatus.PAYMENT_FAILED: frozenset({OrderStatus.CONFIRMED, OrderStatus.CANCELLED}),
    OrderStatus.CONFIRMED: frozenset({OrderStatus.PROCESSING, OrderStatus.CANCELLED}),
    OrderStatus.PROCESSING: frozenset({OrderStatus.READY_TO_SHIP, OrderStatus.CANCELLED}),
    OrderStatus.READY_TO_SHIP: frozenset({OrderStatus.SHIPPED, OrderStatus.CANCELLED}),
    OrderStatus.SHIPPED: frozenset({OrderStatus.DELIVERED}),
    OrderStatus.DELIVERED: frozenset({OrderStatus.COMPLETED, OrderStatus.DISPUTED}),
    OrderStatus.COMPLETED: frozenset(),
    OrderStatus.CANCELLATION_REQUESTED: frozenset({OrderStatus.CANCELLED}),
    OrderStatus.CANCELLED: frozenset(),
    OrderStatus.DISPUTED: frozenset(),
}


def can_transition(from_status: OrderStatus, to_status: OrderStatus) -> bool:
    allowed = VALID_TRANSITIONS.get(from_status, frozenset())
    return to_status in allowed


def status_for_payment_method(payment_method_type: str) -> OrderStatus:
    if payment_method_type == "cod":
        return OrderStatus.CONFIRMED
    return OrderStatus.PAYMENT_PROCESSING
