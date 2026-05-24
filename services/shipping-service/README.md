# Shipping Service

FastAPI shipping service for async shipment creation from `order.confirmed`, carrier label creation, merchant shipment management, public tracking, and GHN-style webhooks.

Run locally:

```bash
cd services/shipping-service
cp .env.example .env
pytest
uvicorn app.main:app --reload --port 8007
```

Main endpoints:

- `GET /health`, `GET /ready`, `GET /metrics`
- `GET /api/v1/public/track/{tracking_number}`
- `POST /api/v1/public/rates/quote`
- `POST /api/v1/public/webhooks/ghn`
- `GET /api/v1/merchant/shipments`
- `GET /api/v1/merchant/shipments/{id}`
- `POST /api/v1/merchant/shipments/{id}/cancel`
- `GET/POST/PUT /api/v1/merchant/rates`
- `GET/POST/PUT /api/v1/admin/providers`
