from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from app.domain.value_objects.payment_status import PaymentStatus


@dataclass
class PaymentTransaction:
    id: str
    order_id: str
    user_id: str
    merchant_id: str
    amount: Decimal
    currency: str
    status: PaymentStatus
    psp_intent_id: str | None = None
    psp_status: str | None = None
    payment_method_id: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    client_secret: str | None = None
    version: int = 1
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: datetime | None = None
