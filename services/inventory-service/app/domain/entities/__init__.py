from dataclasses import dataclass
from datetime import datetime


@dataclass
class Warehouse:
    id: str
    merchant_id: str
    code: str
    name: str
    address_plaintext: str | None
    city: str | None
    country_code: str
    is_active: bool
    priority: int
    metadata: dict
    created_at: datetime
    updated_at: datetime


@dataclass
class InventoryItem:
    id: str
    product_id: str
    variant_id: str | None
    warehouse_id: str
    merchant_id: str
    sku: str
    quantity_on_hand: int
    quantity_reserved: int
    is_track_inventory: bool
    version: int
    created_at: datetime
    updated_at: datetime

    @property
    def quantity_available(self) -> int:
        return self.quantity_on_hand - self.quantity_reserved


@dataclass
class Reservation:
    id: str
    inventory_item_id: str
    order_id: str
    saga_id: str | None
    quantity: int
    status: str
    held_at: datetime
    expires_at: datetime
    confirmed_at: datetime | None
    released_at: datetime | None
    release_reason: str | None
    warehouse_id: str | None = None
