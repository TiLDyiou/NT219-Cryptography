# Shipping Service Implementation Notes

Shipping consumes `order.confirmed` asynchronously instead of exposing an internal create endpoint. This keeps Order decoupled from carrier latency and lets Shipping handle duplicate events with a unique `shipments.order_id`.

Carrier integration is behind `CarrierGateway`. `mock` is the default for local tests; `ghn` uses `httpx` plus `tenacity` retries and verifies webhooks with HMAC-SHA256 over `timestamp.payload`.

PII fields are encrypted through `CryptoService` before persistence. Merchant detail responses decrypt PII; public tracking responses only return city/state/country.

```mermaid
sequenceDiagram
  participant GHN
  participant API as Shipping API
  participant UC as RecordTrackingEventUseCase
  participant DB as shipping_db
  participant Outbox
  GHN->>API: POST /api/v1/public/webhooks/ghn
  API->>API: Verify HMAC + timestamp
  API->>UC: tracking_number + status event
  UC->>DB: insert tracking_events
  UC->>DB: optimistic status update
  UC->>Outbox: shipping.tracking_recorded
```
