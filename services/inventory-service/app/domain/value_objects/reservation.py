from enum import Enum


class ReservationStatus(str, Enum):
    HELD = "held"
    CONFIRMED = "confirmed"
    RELEASED = "released"
    EXPIRED = "expired"


class ReleaseReason(str, Enum):
    SAGA_COMPENSATED = "saga_compensated"
    USER_CANCELLED = "user_cancelled"
    EXPIRED = "expired"
