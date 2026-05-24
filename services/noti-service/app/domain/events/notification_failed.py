from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class NotificationFailed:
    notification_id: str
    user_id: str
    category: str
    error_code: str
    failed_at: datetime = datetime.now(timezone.utc)
