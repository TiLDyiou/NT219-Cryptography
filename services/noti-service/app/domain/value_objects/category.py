from enum import StrEnum


class NotificationCategory(StrEnum):
    ORDER = "order"
    PAYMENT = "payment"
    SHIPPING = "shipping"
    SECURITY = "security"
    MARKETING = "marketing"
