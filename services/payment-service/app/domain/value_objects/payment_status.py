from enum import Enum
from typing import ClassVar


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    REQUIRES_ACTION = "requires_action"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUND_PENDING = "refund_pending"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"

    # Allowed state machine transitions
    _ALLOWED: ClassVar[dict[str, set[str]]] = {
        "pending": {"processing", "requires_action", "succeeded", "failed", "cancelled"},
        "processing": {"requires_action", "succeeded", "failed", "cancelled"},
        "requires_action": {"succeeded", "failed", "cancelled", "processing"},
        "succeeded": {"refund_pending", "refunded"},  # support direct refund too
        "refund_pending": {"refunded", "partially_refunded", "succeeded"},  # succeeded means refund fail rollback
        "partially_refunded": {"refund_pending", "refunded"},
        "failed": set(),
        "cancelled": set(),
        "refunded": set(),
    }

    @classmethod
    def can_transition(cls, current: "PaymentStatus", target: "PaymentStatus") -> bool:
        # Self transitions are always allowed (NO-OP)
        if current == target:
            return True
        return target.value in cls._ALLOWED.get(current.value, set())
