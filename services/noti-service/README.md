# Notification Service

Kafka-driven email notification service for Enmerce.

## Scope

- Consumes `order.checkout`, `payment.events`, and `shipping.events`.
- Sends email through Gmail SMTP with STARTTLS.
- Records notification log, delivery attempts, outbox events, audit events, and processed inbound event ids.
- Exposes only `/health`, `/ready`, `/metrics`, and HMAC-protected admin template/retry endpoints.

## Local Run

```bash
cd services/noti-service
VAULT_ENABLED=false KAFKA_ENABLED=false REDIS_ENABLED=false DATABASE_URL=sqlite+aiosqlite:///./noti_service.db uvicorn app.main:app --reload --port 8008
```

Without SMTP credentials the service uses `FakeEmailGateway`, so local tests do not send real mail.

## Environment

- `DATABASE_URL`
- `VAULT_ENABLED`, `VAULT_ADDR`, `VAULT_TOKEN`, `VAULT_ROLE_ID`, `VAULT_SECRET_ID`
- `REDIS_ENABLED`, `REDIS_URL`
- `KAFKA_ENABLED`, `KAFKA_BOOTSTRAP_SERVERS`
- `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`
- `REQUIRE_INBOUND_HMAC`, `REQUIRE_NONCE_GUARD`

Vault KV2 SMTP path: `secret/data/notification/smtp`.

## Admin Endpoints

- `GET /api/v1/admin/templates`
- `POST /api/v1/admin/templates`
- `PATCH /api/v1/admin/templates/{code}`
- `POST /api/v1/admin/notifications/{id}/retry`

Production should set `REQUIRE_INBOUND_HMAC=true` and `REQUIRE_NONCE_GUARD=true`.
