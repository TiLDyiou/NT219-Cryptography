from enum import StrEnum


class NotificationStatus(StrEnum):
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"
    EXPIRED = "expired"


ALLOWED_TRANSITIONS: dict[NotificationStatus, set[NotificationStatus]] = {
    NotificationStatus.QUEUED: {NotificationStatus.SENDING, NotificationStatus.FAILED, NotificationStatus.EXPIRED},
    NotificationStatus.SENDING: {NotificationStatus.SENT, NotificationStatus.FAILED},
    NotificationStatus.SENT: {NotificationStatus.DELIVERED, NotificationStatus.BOUNCED, NotificationStatus.FAILED},
    NotificationStatus.DELIVERED: set(),
    NotificationStatus.FAILED: {NotificationStatus.QUEUED, NotificationStatus.SENDING, NotificationStatus.EXPIRED},
    NotificationStatus.BOUNCED: set(),
    NotificationStatus.EXPIRED: set(),
}


def can_transition(current: NotificationStatus, target: NotificationStatus) -> bool:
    return target in ALLOWED_TRANSITIONS[current]
