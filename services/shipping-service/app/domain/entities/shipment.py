from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.domain.value_objects.shipment_status import ShipmentStatus, assert_transition


@dataclass
class Shipment:
    id: str
    order_id: str
    merchant_id: str
    provider_id: str
    status: ShipmentStatus = ShipmentStatus.PENDING
    tracking_number: str | None = None
    provider_shipment_id: str | None = None
    provider_label_url: str | None = None
    version: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def transition_to(self, target: ShipmentStatus) -> None:
        assert_transition(self.status, target)
        self.status = target
        self.version += 1
        self.updated_at = datetime.now(timezone.utc)
