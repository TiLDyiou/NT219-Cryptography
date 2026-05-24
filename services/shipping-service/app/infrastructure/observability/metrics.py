from prometheus_client import Counter

shipping_created_total = Counter(
    "shipping_created_total",
    "Shipments created from confirmed orders",
    ["status"],
)
shipping_carrier_failures_total = Counter(
    "shipping_carrier_failures_total",
    "Carrier label creation failures",
)
shipping_cancelled_total = Counter(
    "shipping_cancelled_total",
    "Merchant cancelled shipments",
)
shipping_tracking_events_total = Counter(
    "shipping_tracking_events_total",
    "Carrier tracking events recorded",
)
shipping_label_retry_total = Counter(
    "shipping_label_retry_total",
    "Shipment label retry attempts",
)
optimistic_lock_conflict_total = Counter(
    "optimistic_lock_conflict_total",
    "Optimistic lock conflicts during shipping updates",
)
