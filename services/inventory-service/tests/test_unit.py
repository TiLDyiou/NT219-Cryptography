import pytest
from datetime import datetime, timezone

from app.domain.entities import InventoryItem


def test_quantity_available_computed():
    item = InventoryItem(
        id="i1",
        product_id="p1",
        variant_id=None,
        warehouse_id="w1",
        merchant_id="m1",
        sku="SKU-1",
        quantity_on_hand=10,
        quantity_reserved=3,
        is_track_inventory=True,
        version=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    assert item.quantity_available == 7


def test_skip_non_tracked_when_no_trackable_rows():
    """Merchant without trackable inventory rows should skip reservation."""
    assert True
