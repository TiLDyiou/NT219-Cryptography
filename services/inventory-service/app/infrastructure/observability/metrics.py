from prometheus_client import Counter

inventory_reserve_total = Counter(
    "inventory_reserve_total",
    "Inventory reserve operations",
    ["status"],
)
inventory_out_of_stock_total = Counter(
    "inventory_out_of_stock_total",
    "Out of stock failures during reserve",
)
inventory_release_total = Counter(
    "inventory_release_total",
    "Released reservation units",
)
inventory_confirm_total = Counter(
    "inventory_confirm_total",
    "Confirmed reservation units",
)
reservation_expire_total = Counter(
    "inventory_reservations_expired_total",
    "Expired held reservations released",
)
optimistic_lock_conflict_total = Counter(
    "optimistic_lock_conflict_total",
    "Optimistic lock conflicts during stock updates",
)
