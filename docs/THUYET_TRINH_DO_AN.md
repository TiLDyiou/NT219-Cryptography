# THUYẾT TRÌNH ĐỒ ÁN NT219
## Thiết kế & Đánh giá An toàn Mật mã — Nền tảng Thương mại Điện tử

> **Quy ước:** Mỗi slide có nội dung ngắn ≤ 8 từ/bullet và `[Speaker note]` để nói miệng.

---

## SLIDE 1 — TRANG BÌA

**Thiết kế & Đánh giá An toàn Mật mã**  
**cho Nền tảng Thương mại Điện tử — UIT Store**

NT219 Cryptography · _(Tên & MSSV)_

4 phần chính:
- Kiến trúc & Trust Boundaries
- Cơ chế mật mã: TLS · HMAC · JWT · Tokenization · Vault
- Phân tích STRIDE + 4 lỗ hổng thực tế
- 30/30 security tests PASS — kết quả thực nghiệm

---

## SLIDE 2 — BỐI CẢNH & CÂU HỎI NGHIÊN CỨU

**E-commerce cần bảo vệ đồng thời:**
- Dữ liệu thẻ (PAN) — phạm vi PCI-DSS
- PII người dùng — GDPR
- Hàng triệu giao dịch từ nguồn không tin cậy

**3 câu hỏi nghiên cứu:**
- RQ1: Điểm yếu mật mã phổ biến nhất?
- RQ2: Tokenization giảm rủi ro payment như thế nào?
- RQ3: Vault/KMS vs software keys — trade-off?

**Giả thuyết:** Tokenization + KMS + mTLS/HMAC giảm đáng kể rủi ro, overhead ~3–28ms — chấp nhận được.

> [Speaker] Đề tài trả lời 3 RQ này bằng cách xây dựng prototype và chạy 30 security tests thực tế.

---

## SLIDE 3 — TẠI SAO MICROSERVICES?

**Mật mã chỉ có ý nghĩa khi có ranh giới mạng**

```
MONOLITH                          MICROSERVICES
┌──────────────────┐              ┌──────┐  mTLS  ┌─────────┐
│ Cart → Payment   │  không có    │ Cart │───────▶│ Payment │
│ (function call)  │  network     └──────┘  HMAC   └─────────┘
└──────────────────┘              ← giao tiếp qua mạng → CẦN mật mã
```

4 lý do chọn microservices:
1. mTLS / HMAC / API Gateway — chỉ áp dụng được khi có network
2. Cách ly PCI-DSS — Payment Service riêng biệt
3. Least Privilege — mỗi service chỉ có quyền tối thiểu
4. 5 thí nghiệm bảo mật đều cần ranh giới mạng

> [Speaker] Trade-off: phức tạp hơn monolith — đây chính là đối tượng đo lường của đề tài.

---

## SLIDE 4 — KIẾN TRÚC & TRIỂN KHAI

```
[User]
  │ TLS 1.3 (HTTPS)
  ▼
[Envoy Gateway :10000]  ← JWT · Rate limit · WAF · CORS
  │ mTLS
  ├─▶ [Keycloak]         OAuth2/OIDC + MFA
  ├─▶ [Catalog :8001]
  ├─▶ [Cart    :8002]
  └─▶ [Order   :8003]   ← Saga Orchestrator
           │ HTTP + HMAC
           ├─▶ [Inventory :8005]
           ├─▶ [Payment   :8004] ─▶ Stripe
           └─▶ [Noti      :8007] ─▶ Gmail SMTP

[Kafka] · [PostgreSQL] · [Vault] · [ELK + Prometheus + Grafana]
```

**Topology:** 4 VMs qua Tailscale WireGuard
- Node 1 (ingress): Envoy + Keycloak
- Node 2 (services): catalog/cart/order/inventory/shipping/noti
- Node 3 (payment): payment-service + Vault
- Node 4 (data, macOS): PostgreSQL + Kafka + ELK + Prometheus + Grafana

---

## SLIDE 5 — TRUST BOUNDARIES & DFD

**8 Trust Boundaries — mỗi ranh giới phải xác thực lại:**

| TB | Layer | Bảo vệ |
|----|-------|--------|
| TB1 | Internet | Untrusted |
| TB2 | Edge — CDN + Envoy | TLS 1.3 + JWT |
| TB3 | Backend Services | mTLS + HMAC |
| TB4 | Data — PostgreSQL, ELK | TLS + TDE + FLE |
| TB5 | Key Management — Vault | AppRole + audit log |
| TB6 | Stripe PSP | HTTPS + webhook HMAC |
| TB7 | ML API | HTTPS + key từ Vault |
| TB8 | Gmail SMTP | SMTP/TLS + creds từ Vault |

> [Speaker] Tất cả external credentials (Stripe, SMTP, ML API) đều lấy từ Vault — không hardcode trong code.

---

## SLIDE 6 — OAUTH2/OIDC + PKCE

```
User ─▶ Keycloak login (MFA: TOTP / WebAuthn)
      ─▶ Authorization Code + PKCE
      ─▶ Exchange ─▶ JWT (RS256, TTL=120s)
      ─▶ Envoy validate JWT (JWKS cache)
      ─▶ Backend nhận X-User-Id đã verified
```

Tính năng bảo mật đã triển khai:
- PKCE — chống code interception
- Access Token TTL: **120s** (client-level config)
- Refresh Token Rotation — token cũ hủy ngay
- MFA: TOTP (Google Authenticator)
- `redirect_uri` whitelist chính xác

**Test 1.1–1.4: ✅ 4/4 PASS** (alg:none, forgery, expiry, rotation)

---

## SLIDE 7 — HMAC SERVICE-TO-SERVICE

**Vấn đề:** Attacker lọt vào mạng nội bộ → gọi thẳng Payment/Inventory

```python
# Order Service ký request:
sig = HMAC-SHA256(key, METHOD+PATH+SHA256(body)+Timestamp+Nonce)
headers: X-Signature: dev:v1:{sig}, X-Timestamp, X-Nonce

# Inventory kiểm tra:
1. |now - Timestamp| ≤ 5 min   → chống replay cũ
2. Nonce chưa dùng (Redis)     → chống replay exact
3. Recompute sig               → xác minh danh tính
```

**Trạng thái:**
- ✅ Code đầy đủ: `CryptoService`, `HmacVerificationMiddleware`, `NonceGuardMiddleware`
- ✅ Bật production: `REQUIRE_INBOUND_HMAC=true` tất cả `.env`
- Overhead: **0.0013ms median** — negligible

---

## SLIDE 8 — TOKENIZATION & STRIPE (NO PAN)

```
❌ Nguy hiểm:  User → số thẻ → Backend lưu DB → vi phạm PCI-DSS

✅ UIT Store:  User → Stripe.js mã hóa tại browser
             → Backend nhận PaymentMethod Token (pm_xxx)
             → Stripe charge bằng token
             → Backend KHÔNG BAO GIỜ thấy PAN
```

**Test 2.1–2.2B: ✅ 3/3 PASS** — webhook no sig/forged/replay đều HTTP 400  
**Test 2.6: ✅ PASS** — DB schema chỉ có `card_last4` + `psp_payment_method_id`  
**Real Stripe:** Checkout Session `cs_test_...` tạo thành công

PCI-DSS scope: chỉ Payment Service (SAQ A-EP)

---

## SLIDE 9 — KEY MANAGEMENT: HASHICORP VAULT

**Tại sao Vault thay vì env vars?**

| | Env Vars | Vault |
|--|----------|-------|
| Audit log | ✗ | ✅ mọi lần đọc key |
| Rotation không redeploy | ✗ | ✅ |
| Dynamic secrets (TTL) | ✗ | ✅ |
| Per-service policy | ✗ | ✅ |

**Envelope Encryption:**
```
Data ──[DEK]──▶ Ciphertext  ]
DEK  ──[KEK]──▶ Enc. DEK    ] lưu trong DB
KEK            lưu trong Vault Transit (không rời Vault)
```

**9 Transit keys provisioned:** payment/order/inventory-key (AES-256-GCM + ECDSA-P256)  
**KMS latency đo thực tế:** median **24.6ms** → DEK caching 5 phút bắt buộc

---

## SLIDE 10 — DATABASE ENCRYPTION

**2 lớp độc lập:**

**TDE** — Transparent Data Encryption:
- Mã hóa toàn bộ files `.db` trên disk
- Attacker lấy ổ cứng → không đọc được
- Transparent với application

**FLE** — Field-Level Encryption cho PII:
```python
email_enc   = AES-256-GCM(email,   DEK)  # lưu DB
address_enc = AES-256-GCM(address, DEK)  # DBA không đọc được
```

**Append-only audit log:** Migration 0007 — PostgreSQL RULE ngăn DELETE/UPDATE  
→ Thỏa mãn **PCI Req 10.3** · **STRIDE: chống Repudiation**

---

## SLIDE 11 — CHECKOUT: SAGA PATTERN

**Vấn đề:** 4 services, không có distributed ACID transaction

```
User ─▶ Order (PENDING_PAYMENT)
  (1) ReserveInventory ─▶ Inventory   [HELD 10 min]
  (2) CheckFraud       ─▶ Fraud Svc   [ML score]
  (3) ProcessPayment   ─▶ Payment ─▶ Stripe 3DS
      ─── Order: CONFIRMED ───
  (4) ConfirmReservation ─▶ Inventory
  (5) CreateShipment     ─▶ Shipping
  (6) SendEmail          ─▶ Notification
```

**Compensation khi lỗi:** Fraud flagged / Payment fail → `ReleaseInventory`  
**Idempotency key:** Test 2.3 — 3 requests → cùng `payment_id`, request 2+3 chỉ **3ms** (cache hit)

---

## SLIDE 12 — STRIDE: PHÂN TÍCH MỐI ĐE DỌA

**~50 threat scenarios cho 8 thành phần:**

| | Tên | Vi phạm | Ví dụ trong dự án |
|--|-----|---------|-----------------|
| **S** | Spoofing | Authentication | JWT forgery, fake webhook |
| **T** | Tampering | Integrity | Amount manipulation, SQLi |
| **R** | Repudiation | Non-repudiation | Phủ nhận đặt hàng |
| **I** | Info Disclosure | Confidentiality | PAN lộ, token trong log |
| **D** | Denial of Service | Availability | DDoS payment endpoint |
| **E** | Privilege Escalation | Authorization | User gọi admin API |

**13 threats Critical** — tập trung vào JWT, Payment, Vault, CI/CD

---

## SLIDE 13 — LỖ HỔNG PHÁT HIỆN TRONG CODEBASE

**4 lỗ hổng tìm thấy từ code review:**

**[T1 — Critical] Trust-based auth**
```python
# Nguy hiểm: bất kỳ ai gửi được
user_id = request.headers.get("X-User-Id")
# Fix: chỉ nhận từ Gateway đã verify JWT
```

**[T2 — High] HMAC guards bị tắt**
```python
REQUIRE_INBOUND_HMAC = False  # ← ĐÃ FIX → True
```

**[T3 — High] dev stubs ẩn lỗi**
```python
dev_stub_on_failure = True   # ← ĐÃ TẮT
ENABLE_SQLITE_FALLBACK = True # ← ĐÃ TẮT
```

**[T4 — Medium] Webhook 500 thay vì 400**  
`InvalidSignatureError` → generic handler → ĐÃ FIX: catch riêng → 400

> [Speaker] Phát hiện lỗ hổng thực tế = kết quả nghiên cứu, không phải điểm yếu đề tài.

---

## SLIDE 14 — KẾT QUẢ THỰC NGHIỆM

**30/30 security tests PASS (sau khi fix lỗ hổng)**

```
Static Analysis:
  pip-audit CVEs:     40 → 8   (-80%)  ✅
  Trivy HIGH/CRITICAL: 1 → 0          ✅
  gitleaks real keys:  0 → 0          ✅

JWT & Auth:       4/4 PASS  (alg:none, forgery, expiry, rotation)
Payment:          7/7 PASS  (webhook, idempotency, IDOR, no PAN)
API Abuse:        7/7 PASS  (rate limit, CORS, WAF 5/5, enumeration)
Key Management:   2/2 PASS  (Vault health, KMS 24.6ms)
Supply Chain:     2/2 PASS  (0 CVE HIGH, 0 real secrets)
```

---

## SLIDE 15 — HIỆU NĂNG MẬT MÃ

**Overhead thực tế đo trên Apple Silicon (5000 iterations):**

| Operation | Median | Throughput |
|-----------|--------|------------|
| AES-256-GCM encrypt | **0.0005 ms** | 2.2M ops/s |
| HMAC-SHA256 sign | **0.0013 ms** | 960K ops/s |
| JWT decode (cached) | **0.0013 ms** | — |
| Vault roundtrip | **24.6 ms** | cache 5 phút |

**Tổng overhead server-side:** ~3–28ms  
**Bottleneck thực sự:** Stripe API ~200–500ms

> Kết luận RQ3: Vault/KMS overhead 24.6ms là chấp nhận được với DEK caching. Không ảnh hưởng UX.

---

## SLIDE 16 — TRẢ LỜI CÁC CÂU HỎI NGHIÊN CỨU

**RQ1 — Điểm yếu mật mã phổ biến:**
1. Trust-based auth (headers không verify) → **phát hiện trong codebase**
2. HMAC guards bị disabled → **phát hiện trong codebase**
3. JWT `alg:none` / shared secret yếu → **threat model S-GW-01**
4. Long-lived tokens → **mitigated: TTL 120s**

**RQ2 — Tokenization hiệu quả không?**
- Stripe tokenization: PAN hoàn toàn không vào hệ thống ✅
- PCI-DSS scope giảm: toàn bộ → chỉ Payment Service (SAQ A-EP)
- Overhead: +200–500ms Stripe round-trip (network, không phải crypto)

**RQ3 — Vault/KMS vs software keys:**

| Option | Latency | Security |
|--------|---------|----------|
| Local AES-GCM | 0.0005ms | Software boundary |
| Vault Transit (live) | **24.6ms** | Network + server |
| Cloud KMS | ~10–20ms | Hardware-backed |
| HSM appliance | ~1ms | Physical isolation |

→ **Vault phù hợp cho lab**, Cloud KMS/HSM cho production.

---

## SLIDE 17 — OWASP SCORECARD

**Kết quả cuối (đo trên live system):**

```
OWASP ASVS v4.0 L2:       9P / 3⚠ / 0❌   (trước: 1P/5⚠/4❌)
OWASP API Security Top 10: 10P / 0⚠ / 0❌  (trước: 2P/3⚠/2❌)
PCI DSS v4.0:              8P / 1⚠ / 0❌   (trước: 2P/3⚠/3❌)
```

**3 Partial còn lại (cần Vault token + infra):**
- V6/V8: FLE chưa kích hoạt runtime
- V14/PCI Req 2.2: PostgreSQL password `123456` cần đổi

---

## SLIDE 18 — KẾT LUẬN

**Đề tài đã đạt được:**

✅ Kiến trúc: 7 microservices · 8 trust boundaries · DFD đầy đủ

✅ Cơ chế mật mã **đã triển khai và verify:**
- TLS 1.3 + HTTPS trên Envoy *(HTTPS 200 verified)*
- HMAC-SHA256 + Nonce Guard *(bật production)*
- OAuth2/OIDC + PKCE + MFA *(TTL 120s, rotation)*
- JWT RS256 + audience verify *(verify_aud=account)*
- PSP Tokenization — No PAN *(DB schema verified)*
- Append-only audit log *(migration 0007)*
- PII masking filter trong logs

✅ STRIDE: ~50 threats · 13 Critical · **4 lỗ hổng thực tế đã fix**

✅ **30/30 security tests PASS** trên live infra (4 nodes)

**Còn lại:**
- FLE activation (cần Vault root token)
- PostgreSQL password thay
- cosign artifact signing

---

## SLIDE 19 — DEMO PLAN

| # | Demo | Chứng minh | Thời gian |
|---|------|-----------|-----------|
| 1 | Đăng nhập OAuth2 → Keycloak → JWT 120s | Auth flow | 2 phút |
| 2 | Checkout → Stripe `4242...` → email | Happy path | 3 phút |
| 3 | Webhook replay → HTTP 400 | Idempotency + HMAC | 1 phút |
| 4 | Grafana + Kibana audit trail | Observability | 2 phút |
| 5 | Rate limit: 105 requests → 429 | API protection | 1 phút |

**Test cards:**  `4242 4242 4242 4242` · `4000 0000 0000 0002` (declined) · `4000 0027 6000 3184` (3DS)

---

# PHỤ LỤC — FAQ KHI BẢO VỆ

**Q: Tại sao không dùng Monolith?**
> Cart gọi Payment là function call nội bộ — không có network, không thể áp dụng mTLS/HMAC. Microservices tạo ranh giới mạng để triển khai và đánh giá các cơ chế mật mã.

**Q: TLS vs mTLS?**
> TLS: server chứng minh danh tính với client. mTLS: cả 2 đều present certificate. Trong microservices, mTLS đảm bảo không có rogue service giả mạo.

**Q: Vault vs env vars?**
> Env vars: dễ log ra, inherited bởi child processes, khó rotate. Vault: audit log, dynamic secrets TTL, per-service policy, rotation không cần redeploy.

**Q: HMAC vs chữ ký số (RS256)?**
> HMAC symmetric: cả 2 bên biết secret → bên nhận có thể giả mạo. RS256 asymmetric: private key ký, public key verify → chỉ Keycloak mới ký được. JWT dùng RS256 vì nhiều bên cần verify.

**Q: 4 lỗ hổng trong codebase có phải điểm yếu?**
> Không — phát hiện lỗ hổng thực tế là kết quả nghiên cứu. Đây chính là mục 8.2 đề bài: "identify weaknesses" chứ không chỉ build feature. Tất cả 4 lỗ hổng đã được fix.

**Q: Saga đảm bảo consistency không?**
> Eventual consistency, không phải ACID. Khi fail → compensating transactions rollback. Idempotency keys đảm bảo mỗi bước chỉ chạy 1 lần dù retry.

**Q: Overhead mật mã có ảnh hưởng UX không?**
> Server-side crypto: ~3–28ms. Stripe API: ~200–500ms. Overhead mật mã < 6% tổng latency — người dùng không cảm nhận được.

**Q: PCI-DSS scope giảm thế nào?**
> Lưu PAN: toàn bộ hệ thống nằm trong scope. Dùng PSP tokenization: chỉ Payment Service trong scope (SAQ A-EP) — audit đơn giản hơn nhiều.
