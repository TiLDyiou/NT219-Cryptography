from enum import Enum

from app.core.exceptions import BusinessRuleException


class ShipmentStatus(str, Enum):
    PENDING = "pending"
    LABEL_CREATED = "label_created"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    DELIVERY_FAILED = "delivery_failed"
    CANCELLED = "cancelled"
    RETURNED = "returned"


TRANSITIONS: dict[ShipmentStatus, set[ShipmentStatus]] = {
    ShipmentStatus.PENDING: {ShipmentStatus.LABEL_CREATED, ShipmentStatus.CANCELLED},
    ShipmentStatus.LABEL_CREATED: {ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED},
    ShipmentStatus.PICKED_UP: {ShipmentStatus.IN_TRANSIT, ShipmentStatus.RETURNED},
    ShipmentStatus.IN_TRANSIT: {
        ShipmentStatus.OUT_FOR_DELIVERY,
        ShipmentStatus.DELIVERY_FAILED,
        ShipmentStatus.RETURNED,
    },
    ShipmentStatus.OUT_FOR_DELIVERY: {
        ShipmentStatus.DELIVERED,
        ShipmentStatus.DELIVERY_FAILED,
        ShipmentStatus.RETURNED,
    },
    ShipmentStatus.DELIVERY_FAILED: {ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED},
    ShipmentStatus.DELIVERED: set(),
    ShipmentStatus.CANCELLED: set(),
    ShipmentStatus.RETURNED: set(),
}


def can_transition(current: ShipmentStatus | str, target: ShipmentStatus | str) -> bool:
    current_status = ShipmentStatus(current)
    target_status = ShipmentStatus(target)
    return target_status == current_status or target_status in TRANSITIONS[current_status]


def assert_transition(current: ShipmentStatus | str, target: ShipmentStatus | str) -> None:
    if not can_transition(current, target):
        raise BusinessRuleException(
            f"Cannot transition shipment from '{current}' to '{target}'.",
            "INVALID_STATUS_TRANSITION",
        )
