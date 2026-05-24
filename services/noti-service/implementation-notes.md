# Notification Service Implementation Notes

## Event Routing

- `order.status_changed` to `confirmed` sends `order_confirmed`.
- `order.status_changed` to `payment_failed` sends `payment_failed`.
- `order.status_changed` to `cancelled` sends `order_cancelled`.
- `PaymentCompleted` sends `payment_received`.
- `PaymentFailed` sends `payment_failed`.
- `RefundCompleted` sends `refund_processed`.
- `shipping.created` sends `shipment_created`.
- `shipping.tracking_recorded` with `delivered` sends `shipment_delivered`.

`order.created` is intentionally ignored to avoid notifying users before the checkout saga finishes.

## Reliability

Kafka offsets are committed only after the use case completes. Outbound notification events are written to `notification_outbox` in the same request path as the notification status update, then published by `outbox_worker`.

SMTP failures mark `notification_log.status=failed` and set `next_retry_at` with exponential backoff. `retry_worker` scans retryable rows separately from the outbox worker.

## Security

Inbound Kafka envelopes are verified through `EventPublisher.verify_inbound`. Admin endpoints can require HMAC and nonce headers. Logs and audit events contain `recipient_masked` and `content_hash`, not email body content.
