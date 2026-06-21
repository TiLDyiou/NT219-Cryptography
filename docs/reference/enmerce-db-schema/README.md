# Enmerce Database Schema — DBML Files

## Cách sử dụng

### Option 1: dbdiagram.io (Recommend — Miễn phí)

1. Truy cập [https://dbdiagram.io](https://dbdiagram.io)
2. Đăng nhập (miễn phí)
3. Tạo diagram mới
4. Copy nội dung file `.dbml` paste vào editor bên trái
5. Diagram tự động render bên phải
6. Export: PNG, PDF, hoặc SQL (PostgreSQL)

> **Lưu ý:** dbdiagram.io chỉ render 1 file tại 1 thời điểm.
> Mỗi file = 1 service database (đúng theo database-per-service pattern).

### Option 2: dbml-cli (Command Line)

```bash
# Cài đặt
npm install -g @dbml/cli

# Convert DBML → SQL (PostgreSQL)
dbml2sql dbml/01_catalog.dbml --postgres -o sql/01_catalog.sql
dbml2sql dbml/02_cart.dbml --postgres -o sql/02_cart.sql
dbml2sql dbml/03_order.dbml --postgres -o sql/03_order.sql
dbml2sql dbml/04_payment.dbml --postgres -o sql/04_payment.sql
dbml2sql dbml/05_inventory.dbml --postgres -o sql/05_inventory.sql
dbml2sql dbml/06_shipping.dbml --postgres -o sql/06_shipping.sql
dbml2sql dbml/07_notification.dbml --postgres -o sql/07_notification.sql
```

### Option 3: dbdocs.io (Online Documentation)

```bash
# Cài đặt
npm install -g dbdocs

# Publish (tạo trang web)
dbdocs build dbml/01_catalog.dbml --project enmerce-catalog
```

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                   7 PostgreSQL Databases                │
├──────────────┬──────────────┬──────────────┬────────────┤
│   Catalog    │  Cart        │ Order        │ Payment    │
│ 10 tables    │ 2 tables     │ 6 tables     │ 8 tables   │
├──────────────┼──────────────┼──────────────┴────────────┤
│ Inventory    │ Shipping     │ Notification              │
│ 4 tables     │ 5 tables     │ 6 tables                  │
└──────────────┴──────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│    Fraud Service = STATELESS (no DB)                    │
│ - Risk rules - config files (YAML/JSON)                 │
│ - Blocklist - Redis                                     │
│ - Full logs - ELK Stack (Elasticsearch + Kibana)        │
│ - Decisions - stored in Order DB (fraud_score/status)   │
│ - Correlation - fraud_trace_id links PG <> ELK          │
└─────────────────────────────────────────────────────────┘
```

## Database Summary

| #   | Database     | Tables | Key Features                                                                |
| --- | ------------ | ------ | --------------------------------------------------------------------------- |
| 1   | Catalog      | 10     | Multi-merchant, multi-lang (i18n), RLS, full-text search, audit log       |
| 2   | Cart         | 2      | User carts, price snapshots, 7-day TTL                                    |
| 3   | Order        | 6      | Saga orchestration, idempotency, fraud result storage, audit log          |
| 4   | Payment      | 8      | PCI-DSS, tokenized (no PAN), marketplace settlement, HMAC audit, webhooks |
| 5   | Inventory    | 4      | Marketplace model, optimistic locking, reservations (15m TTL), audit log  |
| 6   | Shipping     | 5      | Multi-carrier, real-time tracking, config audit log                        |
| 7   | Notification | 6      | Multi-channel, i18n templates, retry mechanism, delivery tracking         |

**Total: ~41 tables across 7 databases**

## Security Markers

- Field-Level Encryption (via Vault Transit / pgcrypto)
- All audit logs = append-only, partitioned monthly, HMAC tamper detection
- HMAC keys managed by Vault Transit (cached key for non-PCI, API call for PCI)
- Audit triggers = hybrid approach (PG trigger + app session vars for context)
- Payment audit = HMAC via Vault Transit API (key never leaves Vault — PCI-DSS)
- No PAN stored anywhere (PCI-DSS compliance)
- `fraud_trace_id` = ELK correlation for full fraud investigation
- `correlation_id` = bidirectional tracing PG audit ↔ ELK logs
- Retention: Payment 7y, Order 5y, Catalog 3y, Inventory/Shipping 2y, Notification 1y
