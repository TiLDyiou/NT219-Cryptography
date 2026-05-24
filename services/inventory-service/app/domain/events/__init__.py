from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class InventoryReserved:
    order_id: str
    reservations: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "order_id": self.order_id,
            "reserved": True,
            "reservations": self.reservations,
        }


@dataclass(frozen=True)
class InventoryReleased:
    order_id: str
    released_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "order_id": self.order_id,
            "released": True,
            "released_count": self.released_count,
        }


@dataclass(frozen=True)
class InventoryConfirmed:
    order_id: str
    confirmed_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "order_id": self.order_id,
            "confirmed": True,
            "confirmed_count": self.confirmed_count,
        }


@dataclass(frozen=True)
class StockUpdated:
    inventory_item_id: str
    product_id: str
    variant_id: str | None
    quantity_on_hand: int
    quantity_available: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "inventory_item_id": self.inventory_item_id,
            "product_id": self.product_id,
            "variant_id": self.variant_id,
            "quantity_on_hand": self.quantity_on_hand,
            "quantity_available": self.quantity_available,
        }
