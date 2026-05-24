from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class TrackingEvent:
    shipment_id: str
    status: str
    description: str
    location: str | None = None
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
