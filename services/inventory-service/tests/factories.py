from datetime import datetime, timezone
from typing import Any

from app.domain.entities import InventoryItem, Reservation, Warehouse
from app.infrastructure.persistence.models import InventoryItemModel, WarehouseModel


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_mock_warehouse(overrides: dict[str, Any] | None = None) -> Warehouse:
    defaults: dict[str, Any] = {
        "id": "wh-1",
        "merchant_id": "m-1",
        "code": "MAIN",
        "name": "Main Warehouse",
        "address_plaintext": "123 Test St",
        "city": "HCM",
        "country_code": "VN",
        "is_active": True,
        "priority": 10,
        "metadata": {},
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    if overrides:
        defaults.update(overrides)
    return Warehouse(**defaults)


def get_mock_inventory_item(overrides: dict[str, Any] | None = None) -> InventoryItem:
    defaults: dict[str, Any] = {
        "id": "item-1",
        "product_id": "prod-1",
        "variant_id": None,
        "warehouse_id": "wh-1",
        "merchant_id": "m-1",
        "sku": "SKU-1",
        "quantity_on_hand": 5,
        "quantity_reserved": 0,
        "is_track_inventory": True,
        "version": 1,
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    if overrides:
        defaults.update(overrides)
    return InventoryItem(**defaults)


def get_mock_reservation(overrides: dict[str, Any] | None = None) -> Reservation:
    now = _utc_now()
    defaults: dict[str, Any] = {
        "id": "res-1",
        "inventory_item_id": "item-1",
        "order_id": "order-1",
        "saga_id": "saga-1",
        "quantity": 1,
        "status": "held",
        "held_at": now,
        "expires_at": now,
        "confirmed_at": None,
        "released_at": None,
        "release_reason": None,
        "warehouse_id": "wh-1",
    }
    if overrides:
        defaults.update(overrides)
    return Reservation(**defaults)


def get_mock_warehouse_model(overrides: dict[str, Any] | None = None) -> WarehouseModel:
    now = _utc_now()
    defaults: dict[str, Any] = {
        "id": "wh-1",
        "merchant_id": "m-1",
        "code": "MAIN",
        "name": "Main",
        "country_code": "VN",
        "is_active": True,
        "priority": 10,
        "created_at": now,
        "updated_at": now,
    }
    if overrides:
        defaults.update(overrides)
    return WarehouseModel(**defaults)


def get_mock_inventory_item_model(
    overrides: dict[str, Any] | None = None,
) -> InventoryItemModel:
    now = _utc_now()
    defaults: dict[str, Any] = {
        "id": "item-1",
        "product_id": "prod-1",
        "variant_id": None,
        "warehouse_id": "wh-1",
        "merchant_id": "m-1",
        "sku": "SKU-1",
        "quantity_on_hand": 5,
        "quantity_reserved": 0,
        "is_track_inventory": True,
        "version": 1,
        "created_at": now,
        "updated_at": now,
    }
    if overrides:
        defaults.update(overrides)
    return InventoryItemModel(**defaults)


def get_mock_reserve_payload(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "order_id": "order-1",
        "saga_id": "saga-1",
        "idempotency_key": "idem-1",
        "items": [
            {
                "product_id": "prod-1",
                "variant_id": None,
                "merchant_id": "m-1",
                "sku": "SKU-1",
                "quantity": 2,
            }
        ],
    }
    if overrides:
        defaults.update(overrides)
    return defaults


def get_mock_warehouse_create(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "code": "WH-NEW",
        "name": "New Warehouse",
        "address": "456 Side St",
        "city": "HN",
        "country_code": "VN",
        "is_active": True,
        "priority": 5,
        "metadata": {"zone": "north"},
    }
    if overrides:
        defaults.update(overrides)
    return defaults


def get_mock_inventory_create(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "product_id": "prod-2",
        "variant_id": None,
        "warehouse_id": "wh-1",
        "sku": "SKU-2",
        "quantity_on_hand": 10,
        "is_track_inventory": True,
    }
    if overrides:
        defaults.update(overrides)
    return defaults
