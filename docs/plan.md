# PLAN — NT219-Cryptography / UIT Store

> Tài liệu duy nhất tổng hợp: hiện trạng, delta giữa tài liệu và code thực, và danh sách việc cần làm theo thứ tự ưu tiên.
> Ngày lập: 2026-05-30

---

## 1. Bức tranh tổng thể

UIT Store là sàn TMĐT microservices cho môn NT219 Cryptography. Mục tiêu chính là **minh hoạ và đánh giá các cơ chế mật mã** (mTLS, HMAC, Vault, JWT, ECDSA) qua giao tiếp service-to-service thực — không phải monolith.

### Kiến trúc triển khai (4 VM)

| Node | Zone | Dịch vụ | IP tĩnh |
|------|------|---------|---------|
| NODE-1 | Ingress | Nginx + Envoy (WAF + JWT validation) + Keycloak | `192.168.122.11` |
| NODE-2 | Service Mesh | catalog, cart, order, inventory, shipping, noti | `192.168.122.12` |
| NODE-3 | PCI DSS | payment-service + HashiCorp Vault | `192.168.122.13` |
| NODE-4 | Data + Obs | PostgreSQL, Kafka, ELK, Prometheus, Grafana | `192.168.122.14` |

**Thứ tự khởi động bắt buộc:** NODE-4 → NODE-3 → NODE-2 → NODE-1

### Stack công nghệ

| Thành phần | Lựa chọn | Vai trò |
|------------|---------|---------|
| API Gateway | Envoy 1.30.x | TLS termination, JWT validation, WAF Lua, rate limiting |
| Identity Provider | Keycloak 24 | OAuth2/OIDC, MFA, JWT signing |
| KMS / Secrets | HashiCorp Vault | Transit engine (envelope encryption, HMAC, ECDSA), AppRole |
| Database | PostgreSQL 15 | Database-per-service, TDE + FLE |
| Event Bus | Kafka 3.7.1 | Saga request-reply, audit logs, event sourcing |
| Nonce Store | Redis 7.4 | Anti-replay (SET NX EX), idempotency lock |
| Observability | ELK + Prometheus + Grafana | Audit logs, metrics, dashboards |
| Backend | FastAPI + Python 3.11 | 7 microservices |
| Frontend | Vanilla JSX (CDN React) | Single-file SPA, deploy Vercel |

---

## 2. Hiện trạng các service (đối chiếu docs ↔ code)

### 2.1 order-service ✅ Đã triển khai phần lớn

Kế hoạch cũ trong file này ghi tất cả TODO là `pending`, nhưng **code thực tế đã có**:

| Layer | Tình trạng |
|-------|-----------|
| `domain/` (entities, ports, events) | ✅ Có |
| `infrastructure/crypto/` (vault_client, envelope_encryption, hmac_signer, digital_signature) | ✅ Có |
| `infrastructure/messaging/` (kafka_producer, kafka_consumer) | ✅ Có |
| `infrastructure/persistence/` (repositories) | ✅ Có |
| `api/middleware/` (hmac_verification, nonce_guard) | ✅ Có |
| Saga orchestrator | 🔶 Có model, cần xác minh logic compensation |
| Vault AppRole login + token renewal | 🔶 Cần xác minh lifespan hook |

### 2.2 payment-service 🔶 Kiến trúc đúng, nhưng có bug runtime chắc chắn gây sập

| Vấn đề | File | Mức độ |
|--------|------|--------|
| `error_code` ≠ `failure_code` (tên field lệch nhau) | `infrastructure/persistence/repositories/payment_repository.py` | 🔴 CRASH |
| `client_secret` không tồn tại trong ORM model | `infrastructure/persistence/models/payment_transaction.py` | 🔴 CRASH |
| `dev_stub_on_failure = True` — giả mạo success khi service lỗi | adapter config | 🔴 DATA LOSS |
| `ENABLE_SQLITE_FALLBACK = True` — phân mảnh data | config defaults | 🟠 DATA INTEGRITY |

### 2.3 noti-service ✅ Triển khai tốt

- Kafka consumer đúng event routing
- Outbox pattern + retry worker
- HMAC inbound guard có (nhưng `REQUIRE_INBOUND_HMAC=False` theo default)
- **Port thực tế: 8008** (docs deploy guide cũ ghi 8007 — sai)

### 2.4 shipping-service ✅ Triển khai tốt

- Async consume `order.confirmed`
- GHN carrier integration (HMAC-SHA256 webhook verify)
- PII encrypted qua CryptoService
- **Port thực tế: 8007** (vm-deployment-plan cũ ghi 8006 — sai)

### 2.5 catalog-service, cart-service, inventory-service 🔶 Chưa review sâu

- Cấu trúc service có, chưa đối chiếu chi tiết với DB schema
- `dev_stub_on_failure` và `ENABLE_SQLITE_FALLBACK` cần kiểm tra từng service

---

## 3. Vấn đề bảo mật hiện tại (Critical — đang trong production code)

### T1 — Auth tin tưởng mù (Trust-based Auth) 🔴 Critical

Các service đọc trực tiếp `X-User-Id`, `X-Merchant-Id` từ HTTP header mà **không verify JWT**. Kẻ tấn công chỉ cần:

```bash
curl -H "X-User-Id: 1" http://service:port/admin  # → Thành công
```

**Fix:** Envoy phải verify JWT tại edge (config WAF Lua đã có trên NODE-1). Services nội bộ chỉ tin header được Envoy inject sau khi verify — không tin header do client gửi thẳng.

### T2 — HMAC/Nonce Guard bị tắt 🔴 Critical

```python
REQUIRE_INBOUND_HMAC = False   # bất kỳ request nào cũng qua được
REQUIRE_NONCE_GUARD = False    # replay attack không bị chặn
```

Kẻ lọt vào mạng nội bộ (lateral movement) có thể gọi thẳng bất kỳ service nào với payload tự tạo.

**Fix:** Set `True` ở tất cả môi trường trừ local dev. Dùng `.env.local` riêng cho dev.

### T3 — Dev stubs đang chạy trong production code 🟠 High

```python
dev_stub_on_failure = True     # inventory lỗi → giả thành công → phantom orders
ENABLE_SQLITE_FALLBACK = True  # postgres down → SQLite local → data split
```

**Fix:** Tắt hẳn, áp dụng fail-fast (thà crash sớm còn hơn lưu data sai).

### T4 — Payment service crash khi giao dịch thất bại 🔴 Critical

Field name mismatch → `AttributeError` → toàn bộ payment flow sập hoàn toàn.

---

## 4. Danh sách việc cần làm (ưu tiên từ cao xuống thấp)

### P0 — Fix trước khi demo (Blocking)

| # | Việc cần làm | File cần sửa |
|---|-------------|-------------|
| P0-1 | Sửa field name payment_repository: `error_code` → `failure_code`, `error_message` → `failure_message`, thêm column `client_secret` vào ORM model | `services/payment-service/app/infrastructure/persistence/repositories/payment_repository.py` + model |
| P0-2 | Tắt `dev_stub_on_failure = False` ở tất cả adapters (order-service inventory/payment adapter) | order-service adapter config |
| P0-3 | Tắt `ENABLE_SQLITE_FALLBACK = False` ở production env | config.py của từng service |
| P0-4 | Bật `REQUIRE_INBOUND_HMAC=True`, `REQUIRE_NONCE_GUARD=True` ở .env production | `.env` của inventory, payment, shipping, noti |
| P0-5 | Fix port noti-service trong docs: thực tế là **8008**, không phải 8007 | `docs/DEPLOY-GUIDE.md`, `docs/vm-deployment-plan.md`, `infra/vm-setup/README.md` |
| P0-6 | Fix port shipping-service: thực tế là **8007** | Envoy cluster config, Prometheus scrape config trong setup scripts |

### P1 — Quan trọng cho bảo mật demo

| # | Việc cần làm | Ghi chú |
|---|-------------|---------|
| P1-1 | Xác minh order-service: Vault AppRole login chạy trong FastAPI lifespan hook | Nếu không thì service fail khi Vault không sẵn |
| P1-2 | Xác minh order-service: Saga compensation logic đầy đủ (release inventory, refund) | `application/saga/compensations/` |
| P1-3 | Kiểm tra Envoy config trên NODE-1: JWT validation filter có active không | `02-setup-ingress.sh` WAF Lua section |
| P1-4 | Verify Vault transit keys tồn tại: `order-fle-key`, `order-hmac-key`, `order-sign-key`, `payment-fle-key` | `infra/vault/scripts/init-vault.sh` |
| P1-5 | Kiểm tra Kafka topics đã được tạo: `order.checkout`, `payment.events`, `shipping.events`, `audit-logs` | NODE-4 setup script |

### P2 — Frontend còn thiếu (nối dây button chưa làm)

| # | Màn hình | Việc cần làm |
|---|---------|-------------|
| P2-1 | HomeScreen | Filter tabs (Mới nhất/Bán chạy/Đánh giá cao) — thêm state `sortMode` |
| P2-2 | HomeScreen | Sidebar danh mục — thêm state `activeCategory` |
| P2-3 | HomeScreen | Header search — thêm prop `onSearch(query)` + lọc PRODUCTS |
| P2-4 | CheckoutScreen | Delivery radio — state `delivery`, cập nhật phí ship |
| P2-5 | OrdersScreen | Order row click → `onOrderDetail(id)` |
| P2-6 | ThreeDSModal | Nút "Gửi lại" → reset OTP timer |
| P2-7 | ProductScreen | Wishlist toggle (heart icon) |
| P2-8 | CartScreen | Checkbox chọn item → tính tổng theo selected |

### P3 — Merchant Center (NT219 security demo section)

| # | Section | Việc cần làm |
|---|---------|-------------|
| P3-1 | `screens-merchant-orders.jsx` (MỚI) | Bảng đơn hàng merchant, xác nhận/giao/huỷ |
| P3-2 | `screens-merchant-products.jsx` (MỚI) | CRUD sản phẩm, hiện HMAC signing log |
| P3-3 | MerchantScreen dashboard | Nối KPI với data thật từ mock_server |
| P3-4 | `screens-merchant-security.jsx` (MỚI) | API Key rotation, mTLS cert, Audit log table — **quan trọng nhất cho NT219** |
| P3-5 | `screens-merchant-finance.jsx` (MỚI) | Balance, giao dịch, masked bank account (masked = demo AES-256-GCM) |
| P3-6 | `screens-merchant-analytics.jsx` (MỚI) | Charts doanh thu, top sản phẩm |
| P3-7 | `scripts/mock_server.py` | Thêm merchant order/product/security/finance endpoints |

### P4 — Dọn dẹp tài liệu (Docs hygiene)

| # | Việc cần làm |
|---|-------------|
| P4-1 | Xoá `docs/payment-service_production_architecture_v2_*.plan.md` sau khi verify payment-service done |
| P4-2 | Gộp `frontend/FRONTEND_PLAN.md` + `frontend/BUTTON_WIRING_PLAN.md` + `frontend/MERCHANT_PLAN.md` vào mục P2/P3 của file này, xoá 3 file đó |
| P4-3 | Hợp nhất `docs/vm-deployment-plan.md` (single-VM cũ) vào `infra/vm-setup/README.md` (4-VM hiện tại), xoá file single-VM |
| P4-4 | Cập nhật `SERVICES_CODEBASE_REVIEW.md`: ghi chú các mục đã được fix |

---

## 5. Cryptographic primitives (tóm tắt)

| Cơ chế | Thuật toán | Service | Vault Key | Trạng thái |
|--------|-----------|---------|-----------|-----------|
| Field-Level Encryption (PII) | AES-256-GCM + Vault Transit envelope | order, shipping | `order-fle-key` | 🔶 Code có, cần verify runtime |
| Request Signing (sync calls) | HMAC-SHA256 via Vault Transit | order → payment | `order-hmac-key` | 🔴 Code có, guard đang TẮT |
| Event Signing (Kafka) | ECDSA P-256 via Vault Transit | order | `order-sign-key` | 🔶 Code có, cần verify |
| Anti-replay | Nonce (UUID) + timestamp 300s + Redis SET NX | all services | — | 🔴 Guard đang TẮT |
| JWT validation | RS256 (Keycloak JWKS) | Envoy edge | JWKS endpoint | 🔶 Cần verify Envoy filter active |
| Webhook verify (Stripe) | HMAC-SHA256, tolerance 300s | payment | Stripe webhook secret | ✅ Code có |
| Webhook verify (GHN) | HMAC-SHA256 | shipping | GHN shared secret | ✅ Code có |
| Audit log integrity | HMAC-SHA256 + Vault Transit | order, payment | `payment-audit-key` | 🔶 Cần verify |
| Secrets management | Vault KV2 + AppRole auth | all services | per-service AppRole | 🔶 Cần verify NODE-3 |

---

## 6. Quy trình vận hành (tham chiếu nhanh)

### Cập nhật code lên VM
```bash
cd ~/src/NT219-Cryptography/ && git pull origin main
sudo cp -r services/<tên-service>/* /opt/uitstore/services/<tên-service>/
sudo systemctl restart <tên-service>
journalctl -u <tên-service> -f
```

### Khởi động lại toàn hệ thống (sau khi tắt máy host)
```
NODE-4 → chờ 30-45s → NODE-3 → NODE-2 → NODE-1
sudo bash 03-start-all.sh   # chạy trên từng node
```

### Vault unseal (mỗi lần NODE-3 restart)
```bash
# Tự động nếu /root/vault-init.txt còn: 03-start-all.sh xử lý
# Thủ công nếu mất file:
vault operator unseal <UNSEAL_KEY>
```

### Seed dữ liệu sản phẩm (1.440 sản phẩm điện tử Tiki)
```bash
# Trên NODE-2, sau khi catalog-service đang chạy:
python3 scripts/seed_products.py --file scripts/data/tiki_electronics.csv
```

---

## 7. Demo scenarios (checklist cho báo cáo)

| # | Kịch bản | Components liên quan |
|---|---------|---------------------|
| D1 | Luồng mua hàng đầy đủ: browse → cart → checkout → 3DS OTP → order confirmed | Frontend → Envoy → order → inventory → payment (Stripe) → shipping → noti |
| D2 | JWT verification: giả header `X-User-Id` bị Envoy chặn | Envoy WAF + JWT filter |
| D3 | HMAC signing: xem audit log Kibana khi order-service ký request đến payment | Vault Transit + ELK |
| D4 | Vault Transit demo: encrypt/decrypt PII field, rotate key | Vault UI + order-service FLE |
| D5 | 3DS challenge flow: Stripe test card `4000 0027 6000 3184` | payment-service + Stripe sandbox |
| D6 | Phantom order prevention: tắt inventory-service, verify order fail-fast (không phantom) | order-service dev_stub_on_failure=False |
| D7 | Merchant Security: rotate API key, xem audit log với HMAC signature | MerchantScreen security section |

---

## 8. Trạng thái tất cả file tài liệu

| File | Loại | Trạng thái |
|------|------|-----------|
| `docs/PLAN.md` (file này) | Master plan | ✅ Mới tạo |
| `docs/README.md` | Kiến trúc rationale | ✅ Valid |
| `docs/NT219-Cryptography-threat-model.md` | Threat model | ✅ Valid |
| `docs/stride_threat_model.md` | STRIDE analysis | ✅ Valid |
| `docs/data_flow_diagram.md` | DFD + Saga flow | ✅ Valid |
| `docs/ADRs/order-service_to_payment-service.md` | ADR sync vs async | ✅ Valid |
| `docs/DEPLOY-GUIDE.md` | Deploy Vercel + tunnel | ✅ Valid (cần fix port noti → P0-5) |
| `docs/QUY_TRINH_CAP_NHAT_CODE.md` | Ops runbook | ✅ Valid |
| `docs/QUY_TRINH_KHOI_DONG_LAI.md` | Ops runbook | ✅ Valid |
| `infra/readme.md` | Infra overview | ✅ Valid |
| `infra/vm-setup/README.md` | VM deploy guide (4-VM, mới) | ✅ Valid |
| `docs/vm-deployment-plan.md` | VM deploy guide (single-VM, cũ) | 🟡 Trùng lặp — gộp vào README.md rồi xoá (P4-3) |
| `scripts/SEEDING.md` | Seed guide | ✅ Valid |
| `docs/enmerce-db-schema/README.md` | DB schema guide | ✅ Valid |
| `docs/enmerce-db-schema/attribute_analysis_part1.md` | DB attr analysis | ✅ Valid |
| `docs/enmerce-db-schema/attribute_analysis_part2.md` | DB attr analysis | ✅ Valid |
| `SERVICES_CODEBASE_REVIEW.md` | Code review / known issues | ✅ Valid (update sau P0) |
| `docs/payment-service_production_architecture_v2_*.plan.md` | Payment plan | 🔴 Lỗi thời — xoá sau khi verify (P4-1) |
| `frontend/FRONTEND_PLAN.md` | Frontend plan | 🟡 Đã done — gộp vào đây rồi xoá (P4-2) |
| `frontend/BUTTON_WIRING_PLAN.md` | Button wiring | 🟡 Gộp vào P2 rồi xoá (P4-2) |
| `frontend/MERCHANT_PLAN.md` | Merchant plan | 🟡 Gộp vào P3 rồi xoá (P4-2) |
| `docs/17_Application Scenarios Online Shopping Service Platform.md` | Đề tài gốc | ✅ Giữ nguyên |

---

*File này là nguồn sự thật duy nhất cho kế hoạch dự án. Mọi cập nhật tiến độ ghi vào đây.*
