from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ShippingCreated:
    shipment_id: str
    order_id: str
    merchant_id: str
    tracking_number: str | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "shipment_id": self.shipment_id,
            "order_id": self.order_id,
            "merchant_id": self.merchant_id,
            "tracking_number": self.tracking_number,
        }


@dataclass(frozen=True)
class ShippingStatusChanged:
    shipment_id: str
    old_status: str
    new_status: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "shipment_id": self.shipment_id,
            "old_status": self.old_status,
            "new_status": self.new_status,
        }


@dataclass(frozen=True)
class TrackingRecorded:
    shipment_id: str
    status: str
    description: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "shipment_id": self.shipment_id,
            "status": self.status,
            "description": self.description,
        }
