from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class NotificationDelivered:
    notification_id: str
    user_id: str
    category: str
    delivered_at: datetime = datetime.now(timezone.utc)
