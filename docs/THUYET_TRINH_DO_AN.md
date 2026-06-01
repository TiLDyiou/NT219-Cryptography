# THUYẾT TRÌNH ĐỒ ÁN NT219
## Thiết kế & Đánh giá An toàn Mật mã — Nền tảng Thương mại Điện tử

> **Quy ước:** Mỗi slide có **nội dung slide** (bullet ngắn ≤ 8 từ) và **[Speaker note]** (nói miệng, không hiện trên slide).

---

## SLIDE 1 — TRANG BÌA

**Thiết kế & Đánh giá An toàn Mật mã**  
**cho Nền tảng Thương mại Điện tử**

NT219 — Cryptography · UIT Store Prototype  
_(Tên thành viên & MSSV)_

4 phần chính:
- Kiến trúc & Trust Boundaries
- Cơ chế mật mã học (TLS · HMAC · JWT · Tokenization · Vault)
- Phân tích mối đe dọa STRIDE
- Lỗ hổng thực tế & Bài học rút ra

---

## SLIDE 2 — BỐI CẢNH & CÂU HỎI NGHIÊN CỨU

**E-commerce xử lý đồng thời:**
- Dữ liệu thẻ (PAN) — phạm vi PCI-DSS
- PII người dùng — GDPR
- Hàng triệu giao dịch từ nguồn không tin cậy

**3 câu hỏi nghiên cứu:**
- RQ1: Điểm yếu mật mã nào phổ biến nhất?
- RQ2: Tokenization giảm rủi ro payment như thế nào?
- RQ3: Trade-off Vault/KMS vs software keys?

**Giả thuyết:** Tokenization + KMS + mTLS/HMAC giảm đáng kể rủi ro, với overhead ~5–10ms server-side — chấp nhận được.

---

## SLIDE 3 — TẠI SAO MICROSERVICES?

**Lý do cốt lõi: mật mã chỉ có ý nghĩa khi có ranh giới mạng**

```
MONOLITH                      MICROSERVICES
┌──────────────────┐           ┌──────┐  mTLS  ┌─────────┐
│ Cart → Payment   │  không    │ Cart │ ──────▶ │ Payment │
│ (function call)  │  có mạng  └──────┘  HMAC   └─────────┘
└──────────────────┘           giao tiếp qua mạng → CẦN mật mã
```

- mTLS / HMAC / API Gateway — chỉ áp dụng được khi có network
- Cách ly PCI-DSS — Payment Service riêng biệt
- Least Privilege — mỗi service chỉ có quyền tối thiểu
- 5 thí nghiệm bảo mật đều cần ranh giới mạng thật

> [Speaker] Trade-off: phức tạp hơn monolith về vận hành — đây chính là đối tượng đo lường.

---

## SLIDE 4 — KIẾN TRÚC HỆ THỐNG

```
[User]
  │ TLS 1.3
  ▼
[Envoy Gateway] — JWT, rate limit, WAF
  │ mTLS
  ├─▶ [Keycloak]        OAuth2/OIDC + MFA
  ├─▶ [Catalog :8001]   public
  ├─▶ [Cart    :8002]   authenticated
  └─▶ [Order   :8003]   Saga Orchestrator
           │ HTTP + HMAC
           ├─▶ [Inventory :8005]
           ├─▶ [Payment   :8004] ─▶ Stripe
           ├─▶ [Shipping  :8006] ─▶ GHN
           └─▶ [Noti      :8007] ─▶ Gmail SMTP

[Kafka] · [PostgreSQL] · [Vault] · [ELK + Prometheus + Grafana]
```

**Stack chính:** Python/FastAPI · Envoy · Keycloak · HashiCorp Vault · Kafka · k3s

---

## SLIDE 5 — TRUST BOUNDARIES & DFD

**8 ranh giới tin cậy — nơi dữ liệu phải được xác thực lại:**

| TB | Layer | Bảo vệ bằng |
|----|-------|------------|
| TB1 | Internet | (untrusted) |
| TB2 | Edge — CDN + Envoy | TLS 1.3 + JWT |
| TB3 | Backend Services | mTLS + HMAC |
| TB4 | Data — PostgreSQL, ELK | TLS + TDE + FLE |
| TB5 | Key Mgmt — Vault | AppRole + audit |
| TB6 | Stripe | HTTPS + webhook HMAC |
| TB7 | ML API | HTTPS + key từ Vault |
| TB8 | Gmail SMTP | SMTP/TLS + creds từ Vault |

> [Speaker] Vault: tất cả external credentials đều lấy từ đây — không hardcode trong code.

---

## SLIDE 6 — XÁC THỰC NGƯỜI DÙNG: OAUTH2/OIDC + PKCE

```
User ─▶ Keycloak login (MFA: TOTP / WebAuthn)
Keycloak ─▶ Authorization Code
Frontend ─▶ Exchange: Code + code_verifier (PKCE) ─▶ JWT
JWT ─▶ Envoy validate (JWKS cache) ─▶ forward X-User-Id
Backend đọc X-User-Id đã được Gateway xác minh
```

**Tính năng bảo mật đã triển khai:**
- PKCE — chống authorization code interception
- Access Token TTL: 15 phút
- Refresh Token Rotation — token cũ hủy ngay sau dùng
- MFA: TOTP + WebAuthn
- `redirect_uri` whitelist chính xác (không wildcard)

---

## SLIDE 7 — HMAC REQUEST SIGNING (SERVICE-TO-SERVICE)

**Vấn đề:** Làm sao Inventory biết request đến từ Order Service thật?

```python
# Order Service gửi đi:
sig = HMAC-SHA256(key, METHOD + PATH + SHA256(body) + Timestamp + Nonce)
headers: X-Signature, X-Timestamp, X-Nonce

# Inventory Service kiểm tra:
1. |now - Timestamp| ≤ 5 min     → chống replay cũ
2. Nonce chưa dùng (Redis)       → chống replay exact
3. Recompute + compare sig       → xác minh danh tính
```

**Trạng thái thực tế:**
- ✅ Code có sẵn: `CryptoService`, `HmacVerificationMiddleware`, `NonceGuardMiddleware`
- ⚠️ Đang bị tắt: `REQUIRE_INBOUND_HMAC = False` — technical debt cần giải quyết

---

## SLIDE 8 — THANH TOÁN & TOKENIZATION (NO PAN)

**Nguyên tắc: Server không bao giờ nhìn thấy số thẻ thật**

```
❌ Truyền thống:  User → số thẻ → Backend lưu DB  (vi phạm PCI-DSS)

✅ UIT Store:     User → Stripe.js mã hóa tại browser
                       → Stripe trả PaymentMethod Token
                       → Backend chỉ lưu Token, không lưu PAN
```

**Luồng 3DS/SCA:**
1. Backend tạo `PaymentIntent` → Stripe trả `client_secret`
2. Frontend xác nhận với Stripe (3DS nếu cần)
3. Stripe webhook → Backend verify `Stripe-Signature` (HMAC-SHA256)
4. Order cập nhật trạng thái

- Webhook idempotency: cùng event ID không xử lý 2 lần
- PSP key lưu trong Vault — không hardcode

---

## SLIDE 9 — QUẢN LÝ KHÓA: HASHICORP VAULT

**Tại sao Vault thay vì env vars?**

| | Env Vars | Vault |
|--|----------|-------|
| Audit log | ✗ | ✅ |
| Rotation không redeploy | ✗ | ✅ |
| Dynamic secrets (TTL) | ✗ | ✅ |
| Per-service access policy | ✗ | ✅ |

**Envelope Encryption:**
```
Data  ──[DEK]──▶ Ciphertext     }
DEK   ──[KEK]──▶ Encrypted DEK  } lưu trong DB
KEK              lưu trong Vault Transit (không rời Vault)
```

- Ít gọi Vault hơn: cache DEK trong memory 5 phút
- Key rotation: chỉ re-wrap DEK, không re-encrypt toàn bộ data

---

## SLIDE 10 — MÃ HÓA DATABASE

**2 lớp độc lập:**

**TDE — Transparent Data Encryption:**
- Mã hóa toàn bộ files `.db` trên disk
- Attacker lấy được ổ cứng / backup → không đọc được
- Trong suốt với application

**FLE — Field-Level Encryption cho PII:**
```python
email_enc   = AES-256-GCM(email,   DEK)  # lưu vào DB
address_enc = AES-256-GCM(address, DEK)  # DBA không đọc được
```
Áp dụng cho: email, address, phone, payment token

**Database-per-Service (lab):** 1 PostgreSQL instance, nhiều databases tách biệt → user bị lộ chỉ access được DB của service đó

---

## SLIDE 11 — LUỒNG CHECKOUT: SAGA PATTERN

**Vấn đề:** checkout cần 4 services — không có distributed ACID transaction

**Order Service = Saga Orchestrator:**
```
(1) ReserveInventory  ──▶ Inventory   [HELD 10 min]
(2) CheckFraud        ──▶ Fraud Svc   [ML score]
(3) ProcessPayment    ──▶ Payment ──▶ Stripe 3DS
    ─── Order: CONFIRMED ───
(4) ConfirmReservation ──▶ Inventory
(5) CreateShipment     ──▶ Shipping
(6) SendEmail          ──▶ Notification
```

**Compensation khi lỗi:**
- Fraud flagged → `ReleaseInventory`
- Payment fail → `ReleaseInventory`

**Idempotency key** trên mỗi bước — retry không tạo duplicate

---

## SLIDE 12 — PHÂN TÍCH STRIDE: PHƯƠNG PHÁP

**STRIDE = 6 loại mối đe dọa:**

| | Tên | Vi phạm | Ví dụ trong dự án |
|--|-----|---------|-----------------|
| **S** | Spoofing | Authentication | Fake JWT, fake webhook |
| **T** | Tampering | Integrity | Sửa amount, SQL injection |
| **R** | Repudiation | Non-repudiation | Phủ nhận đơn hàng |
| **I** | Info Disclosure | Confidentiality | PAN lộ, token trong log |
| **D** | Denial of Service | Availability | DDoS payment endpoint |
| **E** | Privilege Escalation | Authorization | User gọi admin API |

**Phạm vi:** 8 thành phần × 6 loại = ~50 threat scenarios

---

## SLIDE 13 — STRIDE: 6 THREATS CRITICAL NHẤT

| ID | Nơi | Mối đe dọa | Mitigation |
|----|-----|-----------|-----------|
| S-GW-01 | API Gateway | JWT `alg:none` bypass auth | Whitelist RS256/ES256 |
| T-PAY-01 | Payment | Amount tampering Order→Payment | Server-side calc + signed intent |
| S-PAY-01 | Payment | Fake Stripe webhook | Verify `Stripe-Signature` HMAC |
| I-PAY-01 | Payment | PAN lộ vì lưu số thẻ thật | PSP tokenization |
| I-KMS-02 | Vault | Vault root token bị lộ | Shamir's sharing, revoke sau setup |
| T-DB-01 | Database | SQL Injection | ORM parameterized queries, WAF |

*(7 threats Critical còn lại — xem Phụ lục)*

---

## SLIDE 14 — LỖ HỔNG PHÁT HIỆN TRONG CODEBASE (1/2)

**[T1 — Critical] Trust-based auth: không verify JWT**
```python
# Hiện tại — bất kỳ ai cũng gửi được:
user_id = request.headers.get("X-User-Id")

# Cần: Gateway verify JWT → inject header
user_id = request.headers.get("X-Verified-User-Id")
```
→ Attacker gửi `X-User-Id: 1` = mạo danh bất kỳ user

---

**[T2 — High] HMAC guards bị tắt toàn bộ**
```python
REQUIRE_INBOUND_HMAC = False  # mọi request nội bộ đều pass
REQUIRE_NONCE_GUARD  = False  # replay attack không bị chặn
```
→ Attacker lọt vào mạng nội bộ → gọi thẳng Payment/Inventory

---

## SLIDE 15 — LỖ HỔNG PHÁT HIỆN TRONG CODEBASE (2/2)

**[T3 — High] Payment Service crash khi giao dịch thất bại**
```python
# payment_repository.py dùng tên sai:
model.error_code = ...    # ← không tồn tại (đúng: failure_code)
model.client_secret = ... # ← column không có trong schema
```
→ Mọi giao dịch thất bại → `AttributeError` → service sập

---

**[T4 — High] Ghost Orders: dev stub ẩn lỗi kết nối**
```python
dev_stub_on_failure   = True  # Inventory down → trả "success" giả
ENABLE_SQLITE_FALLBACK = True  # Postgres lỗi → SQLite local
```
→ Đơn hàng confirmed, kho không trừ, dữ liệu phân mảnh

> [Speaker] Đây là kết quả nghiên cứu thực tế — phát hiện lỗ hổng trong production path, không chỉ thiết kế trên lý thuyết.

---

## SLIDE 16 — TRIỂN KHAI: 4 NODES QUA TAILSCALE

```
Node 1 — Edge/Auth
  Envoy (TLS + JWT + rate limit) · Keycloak

Node 2 — Core Services
  Catalog :8001 · Cart :8002 · Order :8003 · Fraud

Node 3 — Payment & Fulfillment
  Payment :8004→Stripe · Inventory :8005
  Shipping :8006→GHN  · Noti :8007→Gmail

Node 4 — Data Platform
  PostgreSQL 15 · Kafka (5 topics)
  ELK Stack · Prometheus · Grafana
```

- **Tailscale** = WireGuard overlay — kết nối 4 nodes không cần config VPN
- Kafka topics: `order-commands` · `order-events` · `inventory-commands` · `payment-commands` · `notification-events`

---

## SLIDE 17 — OBSERVABILITY: 3 LAYERS

**Metrics — Prometheus + Grafana**
- Scrape từ: Envoy, Keycloak, Order, Payment, Kafka, PostgreSQL, Vault
- Alert: payment failure spike, auth failure rate, KMS anomaly

**Audit Logs — ELK Stack**
- Pipeline: Services → Logstash → Elasticsearch → Kibana
- Append-only → không thể xóa/sửa → chống **Repudiation** (chữ R trong STRIDE)
- PII masked trước khi ghi log

**Distributed Tracing**
- Correlation ID qua toàn bộ request chain
- Debug saga fail ở step nào

---

## SLIDE 18 — 5 THÍ NGHIỆM BẢO MẬT

| # | Thí nghiệm | Attack Vector | Expected Result |
|---|-----------|--------------|-----------------|
| 1 | Token Replay | Replay JWT từ device khác | Bị chặn — expiry + rotation |
| 2 | Payment Fraud | Fake webhook, idempotency test | Reject — Stripe-Signature mismatch |
| 3 | API Abuse | 1000 req/min credential stuffing | Rate limit + progressive delay |
| 4 | Key Rotation | Rotate HMAC secret trong Vault | Services pick up key mới, 0 downtime |
| 5 | Supply Chain | Deploy image đã bị tamper | Admission controller reject |

**Tool:** JMeter · OWASP ZAP · Stripe CLI · cosign

---

## SLIDE 19 — KẾT QUẢ & TRẢ LỜI NGHIÊN CỨU

**Performance overhead (ước tính):**

| Component | Overhead | Ghi chú |
|-----------|----------|---------|
| TLS 1.3 | +1–3ms | Session resumption ~0ms |
| JWT validation | +1–2ms | JWKS cache hit ~0ms |
| HMAC signing | +0.5ms | Local computation |
| Vault DEK unwrap | +20–30ms | Cache 5 phút → ~0ms |
| Kafka publish | ~0ms | Async, fire-and-forget |

**Tổng overhead server-side: ~5–10ms** — không đáng kể so với Stripe round-trip (~200ms)

**Trả lời RQ:**
- **RQ1:** Trust-based auth + disabled HMAC guards — phát hiện trực tiếp
- **RQ2:** PSP tokenization loại bỏ PAN → PCI-DSS scope giảm mạnh ✅
- **RQ3:** Vault (lab) ~5ms, Cloud KMS (prod) ~10–20ms, HSM ~1ms nhưng $500+/tháng

---

## SLIDE 20 — KẾT LUẬN

**Đã hoàn thành:**
- ✅ 7 microservices + 8 trust boundaries + DFD đầy đủ
- ✅ OAuth2/OIDC + PKCE + MFA *(triển khai)*
- ✅ HMAC-SHA256 + Nonce Guard *(code có sẵn, cần bật)*
- ✅ PSP Tokenization — No PAN *(triển khai)*
- ✅ Envelope Encryption với Vault *(thiết kế)*
- ✅ STRIDE: ~50 threats · 13 Critical · 4 lỗ hổng thực tế
- ✅ Observability: ELK + Prometheus + Grafana

**Bước tiếp theo để production-ready:**
- Bật `REQUIRE_INBOUND_HMAC=True` + fix Payment column mismatch
- Tắt `dev_stub_on_failure` + `ENABLE_SQLITE_FALLBACK`
- Hoàn thiện mTLS (Istio service mesh)
- Chạy 5 thí nghiệm → có số liệu thực

---

## SLIDE 21 — DEMO PLAN

| # | Demo | Chứng minh | Thời gian |
|---|------|-----------|-----------|
| 1 | Đăng nhập OAuth2 → Keycloak → JWT | Auth flow | 2 phút |
| 2 | Checkout → Stripe `4242...` → email | Happy path | 3 phút |
| 3 | Webhook replay → bị reject | Idempotency + HMAC | 1 phút |
| 4 | Grafana + Kibana audit trail | Observability | 2 phút |
| 5 | Spam login → rate limit trigger | API protection | 1 phút |

**Test cards:**
- `4242 4242 4242 4242` — success
- `4000 0000 0000 0002` — declined
- `4000 0027 6000 3184` — 3DS required

---

# PHỤ LỤC A — 7 CRITICAL THREATS CÒN LẠI

| ID | Thành phần | Mối đe dọa | Mitigation |
|----|-----------|-----------|-----------|
| E-GW-01 | API Gateway | Envoy Admin API expose Internet | Chỉ bind 127.0.0.1 |
| I-GW-02 | API Gateway | TLS private key lộ | PFS (ECDHE), HSM, auto-rotate |
| T-IDP-01 | Keycloak | JWT claim manipulation | RS256, signing key trong Vault |
| E-PAY-01 | Payment | Lộ Stripe secret key | Vault least-privilege |
| I-KMS-01 | Vault | Key material lộ qua memory dump | HSM boundary |
| S-CI-01 | CI/CD | Compromised CI runner | Ephemeral runners |
| T-CI-01 | CI/CD | Deploy unsigned image | cosign + admission controller |

---

# PHỤ LỤC B — CÂU HỎI THƯỜNG GẶP

**Q: Monolith có gì sai?**
> Cart gọi Payment là function call — không có network, không thể áp dụng mTLS/HMAC. Microservices tạo ranh giới mạng để đánh giá các cơ chế mật mã.

**Q: TLS vs mTLS?**
> TLS: 1 chiều — client verify server. mTLS: 2 chiều — cả 2 present certificate. Microservices cần mTLS để không có "rogue service" giả mạo.

**Q: Vault vs env vars?**
> Env vars: dễ log ra, inherited bởi child processes, khó rotate. Vault: audit log, dynamic secrets với TTL, per-service policy, rotation không cần redeploy.

**Q: HMAC vs chữ ký số (RS256)?**
> HMAC symmetric: 2 bên đều biết secret → bên nhận có thể giả mạo bên gửi. RS256 asymmetric: chỉ private key mới ký được, public key để verify. JWT dùng RS256 vì nhiều bên cần verify.

**Q: PCI-DSS scope giảm thế nào nhờ tokenization?**
> Lưu PAN: toàn bộ hệ thống nằm trong PCI-DSS scope. Dùng PSP tokenization: chỉ Payment Service nằm trong scope → audit đơn giản hơn nhiều (SAQ A).

**Q: Saga đảm bảo consistency không?**
> Eventual consistency, không phải strong ACID. Khi fail → compensating transactions rollback. Idempotency keys đảm bảo mỗi bước chỉ chạy 1 lần dù retry.

**Q: 4 lỗ hổng codebase có phải điểm yếu của đề tài không?**
> Không — phát hiện lỗ hổng thực tế trong production path là kết quả nghiên cứu. Đây là mục tiêu của threat modeling (mục 8.2 đề bài): "identify weaknesses" chứ không chỉ build feature.
