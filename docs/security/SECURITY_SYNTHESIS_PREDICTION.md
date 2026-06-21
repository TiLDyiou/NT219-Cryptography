# Báo cáo Tổng hợp & Dự đoán — Sau khi fix luồng chính (Thanh toán + Thông tin người dùng)

> **Hệ thống:** Enmerce / UIT Store — NT219 Cryptography
> **Ngày tổng hợp:** 2026-06-02
> **Nguồn:** tổng hợp & đối chiếu 4 tài liệu:
>
> 1. `docs/SECURITY_BENCHMARK_TESTS.md` (31/05) — kế hoạch test (trạng thái "trước").
> 2. `SERVICES_CODEBASE_REVIEW.md` (HEAD `3569a66`) — review mã nguồn 7 service (C/H/M).
> 3. `docs/BENCHMARK_RESULTS.md` (01/06) — kết quả benchmark tự báo "sau khi deploy fixes".
> 4. `docs/PENTEST_NGROK_REPORT.md` (02/06) — pentest **trực tiếp** hệ thống live qua ngrok.
>
> **Mục đích:** Tổng hợp toàn bộ phát hiện, **chỉ ra mâu thuẫn giữa các báo cáo**, chốt một **hiện trạng trung thực**, rồi **dự đoán** điểm số/kết quả nếu đội fix dứt điểm hai luồng cốt lõi: **danh tính người dùng** và **thanh toán**.

---

## 0. TL;DR (đọc trong 60 giây)

- **Hạ tầng làm tốt** (TLS, security headers, ẩn service nội bộ, ẩn Keycloak/Vault, WAF, rate-limit, không lộ `/docs`). Phần này không cần đụng tới.
- **Tầng ứng dụng đang vi phạm zero-trust ở mức nền tảng**: mọi service (trừ `catalog`) **tin tuyệt đối header `X-User-Id`/`X-Merchant-Id`/`X-Admin-Id`**, không verify chữ ký JWT. Đây là gốc rễ của hầu hết lỗ hổng nghiêm trọng.
- **Hai báo cáo mâu thuẫn**: `BENCHMARK_RESULTS.md` báo "đã fix gần hết", nhưng `PENTEST_NGROK_REPORT.md` (mới hơn) + `SERVICES_CODEBASE_REVIEW.md` **chứng minh các lỗ hổng critical vẫn sống**. Báo cáo này lấy pentest + code review làm chuẩn.
- **"Fix luồng chính"** = sửa **2 cụm**:
  - **(A) Danh tính** — C-01, C-02 + Envoy strip header → diệt PT-01 và là tiền đề cho mọi authz.
  - **(B) Thanh toán** — C-04…C-08, C-11, H-01 → diệt price-tampering (PT-02) và các lỗi mất tiền.
- **Dự đoán nếu fix xong (A)+(B):**
  - Pentest confirmed-live: **PT-01, PT-02 → PASS**; PT-03/PT-04 vẫn cần fix riêng (noti/shipping).
  - OWASP API Top 10: từ thực tế **~2–3 PASS → 8–9 PASS** (API1/API2/API3/API6 chuyển xanh thật).
  - ASVS L2: V3/V4 từ FAIL → PASS; tổng **~9 PASS / 3 Partial**.
  - PCI DSS: Req 3.3/6.3.3/7.2/10.x củng cố; Req 2.2 vẫn vướng password `123456` (config, không thuộc luồng chính).
  - **Overhead hiệu năng gần như bằng 0** (JWT verify dùng JWKS cache ~0.001ms; điểm nghẽn thật là Stripe 200–500ms).

---

## 1. Bốn tài liệu nói gì — và mâu thuẫn cốt lõi

### 1.1. Dòng thời gian

| Ngày           | Tài liệu                      | Vai trò                          | Kết luận chính                                                          |
| -------------- | ----------------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| 31/05          | `SECURITY_BENCHMARK_TESTS.md` | Kế hoạch test (baseline "trước") | Liệt kê nhiều FAIL dự kiến: JWT không verify, IDOR, CORS `*`, HTTP-only |
| HEAD `3569a66` | `SERVICES_CODEBASE_REVIEW.md` | Sự thật về **code**              | 11 Critical + 18 High vẫn nằm trong code                                |
| 01/06          | `BENCHMARK_RESULTS.md`        | Kết quả tự báo "sau fix"         | Tuyên bố 25/26 PASS, API Top 10 10/10, IDOR 403                         |
| 02/06          | `PENTEST_NGROK_REPORT.md`     | Test **live** (mới nhất)         | PT-01…PT-04 critical/high **khai thác được bằng `curl`**                |

### 1.2. Mâu thuẫn — và cách giải thích trung thực

`BENCHMARK_RESULTS.md` nói đã fix, nhưng pentest một ngày sau lại khai thác thành công. Lý do **không phải** vì hệ thống "vừa hỏng lại": mà vì **benchmark đo nhầm tầng**.

| Hạng mục                                | Benchmark đo gì                                   | Vì sao ra "PASS"                   | Pentest/Code thực sự cho thấy                                          |
| --------------------------------------- | ------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| JWT `alg:none`, claim forgery (1.1/1.2) | Gửi tới **Keycloak** & **catalog**                | Keycloak và catalog verify thật    | Các service khác **không** verify (C-02)                               |
| IDOR refund (2.5)                       | Ghi chú "verified prior session — code unchanged" | Không re-test được (Kafka timeout) | `payment/internal/payments.py:34-48` **không** check chủ sở hữu (H-01) |
| Identity                                | Suy ra từ catalog                                 | Catalog là đối chứng dương tính    | `cart/order/...` tin `X-User-Id` (C-01) → PT-01 sống                   |

> **Chốt:** Điểm "xanh" của benchmark phần lớn là **đúng cho `catalog` + Keycloak + hạ tầng**, không phải cho các service ứng dụng còn lại. Pentest đập trực tiếp vào `cart`/`order`/`noti` nên thấy đỏ. Báo cáo này dùng **pentest + code review** làm chuẩn vàng.

---

## 2. Hiện trạng trung thực (reconciled baseline)

Cột "Benchmark tự báo" để đối chiếu; cột "Thực tế" là điều ta dùng để dự đoán.

| Vùng                             | Benchmark tự báo | Thực tế (pentest + code)       | Bằng chứng                                   |
| -------------------------------- | ---------------- | ------------------------------ | -------------------------------------------- |
| Hạ tầng (TLS/headers/ẩn service) | PASS             | **PASS** (đồng thuận)          | Pentest mục 5, 9 điểm PASS                   |
| Danh tính người dùng (JWT)       | PASS             | **FAIL**                       | PT-01 (curl `X-User-Id` → 200); C-01, C-02   |
| Cart pricing                     | ⚠️ WARNING (COD) | **FAIL nặng hơn**              | PT-02 (`subtotal=1.00`); C-11                |
| Payment money logic              | PASS / N-A       | **FAIL (code-level)**          | C-04…C-08; không lộ ngrok nên chưa test live |
| Noti admin / SSTI                | (không nêu)      | **FAIL**                       | PT-03 (đọc template không auth); C-09, H-15  |
| Shipping mock webhook            | (không nêu)      | **FAIL**                       | PT-04 (route public 405); C-10               |
| Refund IDOR/authz                | PASS (403)       | **FAIL (code-level)**          | H-01 (không check owner)                     |
| Rate-limit / WAF                 | PASS             | **PASS** (có, cần tinh chỉnh)  | PT-07 (100/60s global)                       |
| Vault/Redis/Kafka fallback       | ⚠️ Partial       | **Rủi ro "fail-open" im lặng** | C-03, H-06, H-07                             |

**Một câu:** _Hạ tầng tốt, nhưng tầng ứng dụng "tin client". Bất kỳ ai có URL đều mạo danh user, thao túng giá, đọc/sửa cấu hình noti — chỉ bằng `curl`._

---

## 3. Định nghĩa chính xác "fix luồng chính"

Luồng chính của e-commerce: `đăng nhập → giỏ hàng → checkout → thanh toán → đơn hàng`. "Thanh toán + thông tin người dùng" = **2 cụm fix**:

### 3.1. Cụm A — Thông tin người dùng / Danh tính (gốc rễ)

| Mã        | Nội dung fix                                                    | File tiêu biểu                                                                     | Cách fix                                                                                                             |
| --------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| C-01      | Service tin header thô `X-User-Id`/`X-Merchant-Id`/`X-Admin-Id` | `*/api/dependencies.py` (order:49, cart:30, inventory:52, payment:25, shipping:53) | Bỏ ưu tiên header thô; chỉ tin danh tính sau verify JWT                                                              |
| C-02      | JWT chỉ base64-decode, không verify chữ ký                      | `_decode_jwt_sub` ở 6 service                                                      | **Nhân bản** `catalog/dependencies.py:47-95` (verify RS256 + `exp`/`iss`/`aud`) cho mọi service                      |
| (hạ tầng) | Envoy không strip header client                                 | `infra/patches/envoy.yaml`                                                         | Envoy `jwt_authn` filter + **strip mọi `X-User-*`/`X-Merchant-*`/`X-Admin-*` từ client**, chỉ gắn lại sau khi verify |
| H-05      | Catalog thiếu kiểm `iss`/realm/role                             | `catalog/dependencies.py:65-95`                                                    | Thêm kiểm `iss` + role để merchant API không mở cho mọi user                                                         |

**Diệt trực tiếp:** PT-01 (mạo danh). **Tiền đề cho:** mọi kiểm soát authz phía sau (refund owner, settlement admin, noti admin).

### 3.2. Cụm B — Thanh toán (tính đúng tiền, không mất tiền)

| Mã   | Nội dung                                                       | File                                                                    | Cách fix                                                                                              |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| C-11 | Client tự đặt `unit_price_snapshot`                            | `cart/schemas/cart.py:11-12`, `crud/cart.py:160-166`                    | **Bỏ giá khỏi input**; cart tự lấy giá từ catalog theo `product_id`+`merchant_id`; tự tính `subtotal` |
| C-04 | Webhook commit-log **trước** khi xử lý → event lỗi không retry | `payment/use_cases/handle_webhook.py:43-55`                             | Chỉ đánh dấu "đã xử lý" **sau** khi nghiệp vụ commit thành công                                       |
| C-05 | Đua charge → tính tiền 2 lần                                   | `payment/use_cases/charge.py:54-79`; `models/payment_transaction.py:11` | Thêm **UNIQUE/advisory-lock theo `order_id`**                                                         |
| C-06 | Refund ×100 sai với VND                                        | `payment/stripe_client.py:202-206`                                      | Dùng `to_minor_units()` (giống lúc tạo intent)                                                        |
| C-07 | Refund nhầm `cs_...` làm PaymentIntent                         | `payment/use_cases/refund.py:65-66`                                     | Truy `pi_...` thật từ Checkout Session trước khi refund                                               |
| C-08 | Admin settlement không auth                                    | `payment/api/v1/admin/settlements.py:11-41`                             | Thêm JWT role admin (sau khi có Cụm A)                                                                |
| H-01 | Refund không check owner + không idempotent                    | `payment/internal/payments.py:34-48`; `refund.py:63-69`                 | Đối chiếu `requesting_user_id` với chủ giao dịch; refund-ref ổn định                                  |

**Diệt trực tiếp:** PT-02 (price tampering). **Củng cố:** integrity của toàn bộ tiền bạc.

> **Lưu ý phạm vi:** PT-03 (noti SSTI) và PT-04 (shipping mock webhook) **không** thuộc 2 cụm này. Fix Cụm A cho noti/shipping một **danh tính đáng tin**, nhưng vẫn phải **thêm role-check** trên route admin noti (C-09) và **tắt route mock** shipping (C-10). Tôi xếp chúng vào "rủi ro còn lại" ở Mục 5.

---

## 4. Dự đoán kết quả SAU khi fix luồng chính

Quy ước: **Trước** = hiện trạng trung thực (Mục 2). **Sau** = dự đoán khi hoàn tất Cụm A + B.

### 4.1. Pentest — Confirmed-live findings

| ID    | Mức      | Trước (live)                | Sau fix A+B                 | Giải thích dự đoán                                                                |
| ----- | -------- | --------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| PT-01 | Critical | FAIL (curl `X-User-Id`→200) | **PASS (401)**              | Cụm A: service verify JWT thật; Envoy strip header → lặp lại PoC phải nhận 401    |
| PT-02 | Critical | FAIL (`subtotal=1.00`)      | **PASS**                    | C-11: giá lấy từ catalog → server trả 50.000đ hoặc từ chối                        |
| PT-03 | Critical | FAIL (đọc template no-auth) | **PARTIAL → cần fix riêng** | A cho danh tính, nhưng phải thêm role-check + `SandboxedEnvironment` (C-09, H-15) |
| PT-04 | High     | FAIL (route mock public)    | **PARTIAL → cần fix riêng** | Phải tắt route mock (C-10); A không tự diệt                                       |
| PT-05 | Medium   | FAIL (no HSTS)              | Không đổi                   | Thuộc hạ tầng, không nằm trong luồng chính                                        |
| PT-06 | Medium   | WARN (lockout/enum)         | Không đổi                   | Thuộc Keycloak config                                                             |
| PT-07 | Info     | Rate-limit global           | Không đổi                   | Cần per-IP/identity, ngoài phạm vi                                                |

> **Kết quả pentest dự đoán:** **2/4** lỗ hổng critical-live (PT-01, PT-02) **đóng hoàn toàn**. PT-03/PT-04 chỉ đóng nếu làm thêm bước nhỏ (xem Mục 5) — rất nên gộp vào cùng đợt.

### 4.2. Code review — Trạng thái C-01…C-11 sau fix

| Mã                          | Trước | Sau A+B    | Ghi chú                                   |
| --------------------------- | ----- | ---------- | ----------------------------------------- |
| C-01 Tin header thô         | Open  | **Closed** | Cụm A                                     |
| C-02 JWT không verify       | Open  | **Closed** | Cụm A                                     |
| C-04 Webhook commit sớm     | Open  | **Closed** | Cụm B                                     |
| C-05 Đua charge 2 lần       | Open  | **Closed** | Cụm B (UNIQUE `order_id`)                 |
| C-06 Refund ×100 VND        | Open  | **Closed** | Cụm B                                     |
| C-07 Refund nhầm `cs_`      | Open  | **Closed** | Cụm B                                     |
| C-08 Settlement no-auth     | Open  | **Closed** | Cụm B (nhờ A có danh tính)                |
| C-11 Client đặt giá         | Open  | **Closed** | Cụm B                                     |
| C-03 Vault fallback im lặng | Open  | **Open**   | Không thuộc luồng chính (fail-fast riêng) |
| C-09 Noti SSTI              | Open  | **Open\*** | Cần fix riêng (Mục 5)                     |
| C-10 Shipping mock webhook  | Open  | **Open\*** | Cần fix riêng (Mục 5)                     |

→ **8/11 Critical đóng** chỉ với 2 cụm. 3 cái còn lại (C-03, C-09, C-10) nên xử lý ngay sau, chi phí thấp.

### 4.3. OWASP ASVS v4.0 Level 2 (dự đoán)

| Chapter             | Thực tế trước              | Sau A+B             | Lý do                                     |
| ------------------- | -------------------------- | ------------------- | ----------------------------------------- |
| V2 Authentication   | Partial                    | Partial→**PASS**    | Keycloak + verify JWT đồng bộ mọi service |
| V3 Session Mgmt     | **FAIL** (không check exp) | **PASS**            | Verify `exp`/`iss`/`aud` (Cụm A)          |
| V4 Access Control   | **FAIL** (IDOR)            | **PASS**            | C-01/C-08/H-01 đóng                       |
| V5 Input Validation | PASS                       | PASS                | ORM + Pydantic                            |
| V6 Cryptography     | Partial                    | Partial             | FLE runtime + C-03 còn treo               |
| V7 Error Handling   | Partial                    | Partial→PASS        | M-06 (lộ `str(e)`) nên dọn kèm            |
| V8 Data Protection  | Partial                    | Partial             | FLE chưa kích hoạt                        |
| V9 Communication    | (ngrok ép HTTPS)           | Partial             | HSTS/CSP header (PT-05) còn thiếu         |
| V11 Business Logic  | PASS                       | **PASS** (chắc hơn) | C-05 idempotency theo `order_id`          |
| V13 API             | **FAIL** (CORS)            | Partial             | M-14 CORS regex cần siết                  |

→ **Dự đoán: ~9 PASS / 3 Partial / 0 FAIL** — khớp con số benchmark từng "vẽ ra", nhưng giờ là **thật**.

### 4.4. OWASP API Security Top 10 (2023) — dự đoán

| ID    | Threat                 | Thực tế trước         | Sau A+B                                         |
| ----- | ---------------------- | --------------------- | ----------------------------------------------- |
| API1  | BOLA (IDOR)            | **FAIL** (PT-01)      | **PASS**                                        |
| API2  | Broken Auth            | **FAIL** (C-02)       | **PASS**                                        |
| API3  | Property-level Auth    | Partial               | **PASS** (giá server-side, C-11)                |
| API4  | Resource Consumption   | Partial               | Partial (rate-limit global, PT-07)              |
| API5  | Function-level Auth    | **FAIL** (C-08, C-09) | Partial→PASS\* (settlement xong; noti cần thêm) |
| API6  | Sensitive Flows        | Partial               | **PASS** (idempotency `order_id`)               |
| API7  | SSRF                   | PASS                  | PASS                                            |
| API8  | Misconfig              | Partial               | Partial (CORS/HSTS còn)                         |
| API9  | Inventory Mgmt         | PASS (/docs off)      | PASS                                            |
| API10 | Unsafe API Consumption | PASS (Stripe HMAC)    | PASS                                            |

→ **Dự đoán: 8–9 / 10 PASS** (API4/API8 còn Partial vì rate-limit & CORS/HSTS nằm ngoài luồng chính; API5 PASS hẳn nếu gộp noti).

### 4.5. PCI DSS v4.0 — dự đoán

| Req       | Nội dung            | Trước               | Sau A+B                                             |
| --------- | ------------------- | ------------------- | --------------------------------------------------- |
| 2.2       | No default creds    | **FAIL** (`123456`) | **FAIL** (config, ngoài luồng chính — vẫn phải đổi) |
| 3.3       | No PAN              | PASS                | **PASS** (chắc hơn)                                 |
| 4.2.1     | TLS 1.2+            | PASS (ngrok)        | PASS                                                |
| 6.3.3     | Patch CVE           | PASS                | PASS                                                |
| 7.2       | Least-privilege     | Partial             | **PASS** (authz đóng)                               |
| 8.3       | MFA admin           | Keycloak TOTP       | PASS                                                |
| 10.2/10.3 | Audit log integrity | PASS                | **PASS** (danh tính thật → audit có ý nghĩa)        |

→ Cải thiện rõ Req 7.2 và 10.x. **Req 2.2 vẫn đỏ** cho tới khi đổi password DB — nhắc lại: việc này **không** thuộc luồng chính nhưng là P0 nhanh-gọn.

### 4.6. Security Experiments (exp1–5) — dự đoán

| Exp         | Test                                  | Trước                        | Sau A+B                                         |
| ----------- | ------------------------------------- | ---------------------------- | ----------------------------------------------- |
| 1.1/1.2/1.3 | JWT forge/expired tới **mọi service** | FAIL ở service ngoài catalog | **PASS toàn bộ**                                |
| 2.3         | Idempotency 3 request                 | PASS                         | PASS                                            |
| 2.4         | Amount tampering (checkout)           | FAIL                         | **PASS** (giá server-side)                      |
| 2.5         | IDOR refund                           | FAIL (code)                  | **PASS (403)** thật, không còn "code unchanged" |
| 2.1/2.2     | Webhook no/forged sig                 | PASS                         | PASS                                            |
| 3.x         | Rate-limit/WAF/CORS                   | Hỗn hợp                      | Không đổi (ngoài phạm vi)                       |
| 4.x/5.x     | Vault/Supply chain                    | Partial                      | Không đổi                                       |

### 4.7. Tác động hiệu năng — dự đoán

Fix danh tính = thêm **verify chữ ký RS256 + check claims**, dùng **JWKS cache**:

```
JWT validation (JWKS cache)   +~0.001 ms   ← gần như bằng 0
Cart gọi catalog lấy giá       +1 HTTP nội bộ (cache được)
Server-side crypto total       ~3–28 ms (không đổi)
Điểm nghẽn thật                Stripe 200–500ms (không đổi)
```

→ **Overhead an ninh < 6%** so với độ trễ Stripe — không ảnh hưởng UX. Rủi ro hiệu năng của việc fix là **không đáng kể**.

---

## 5. Rủi ro CÒN LẠI sau khi fix luồng chính

Fix A+B **không** tự đóng các mục sau — cần liệt kê để không tạo "an toàn giả":

| Mã        | Vấn đề                             | Vì sao còn                                      | Đề xuất (chi phí thấp, nên gộp)                                      |
| --------- | ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| C-09/H-15 | Noti admin no-auth + SSTI/XSS      | A cho danh tính, chưa thêm role-check & sandbox | Role admin trên `/admin/*` + `SandboxedEnvironment` + whitelist biến |
| C-10/H-13 | Shipping mock webhook public       | Là route test, không bị tắt                     | Tắt route mock ở prod; verify chữ ký GHN                             |
| C-03      | Vault lỗi → crypto dev im lặng     | Fail-open ở tầng hạ tầng                        | **Fail-fast** khi `ENVIRONMENT=production`                           |
| H-06/H-07 | Redis/Kafka lỗi → mất chống replay | Fallback im lặng                                | Fail-fast hoặc cảnh báo cứng                                         |
| PT-05     | Thiếu HSTS; CSP qua meta           | Hạ tầng                                         | Header HSTS + CSP tại Nginx/Envoy                                    |
| PT-07     | Rate-limit global                  | Cấu hình Envoy                                  | Rate-limit per-IP/identity                                           |
| Req 2.2   | PostgreSQL `123456`                | Config                                          | Đổi password (P0, 5 phút)                                            |
| M-14      | CORS regex `https?://.*`           | Catalog/cart                                    | Whitelist origin cụ thể                                              |

> **Khuyến nghị thực tế:** gộp C-09, C-10 vào **cùng đợt** với luồng chính. Cả hai khai thác được qua ngrok (PT-03/PT-04), chi phí fix nhỏ, mà nếu bỏ lại thì "fix luồng chính" vẫn để hệ thống bị RCE/giả webhook — mất ý nghĩa.

---

## 6. Kế hoạch verify (định nghĩa "Done")

Mỗi fix phải kèm một phép thử **lặp lại được** trên hệ thống live:

| #   | Fix                      | Lệnh verify                                                | PASS khi                            |
| --- | ------------------------ | ---------------------------------------------------------- | ----------------------------------- |
| 1   | C-01/C-02 (danh tính)    | `curl -H "X-User-Id: <victim>" .../api/v1/cart/user/carts` | **HTTP 401**                        |
| 2   | C-02 (JWT forge)         | gửi JWT `alg:none`/sai chữ ký tới **mọi** service          | **401** ở tất cả                    |
| 3   | C-11 (giá)               | lặp PoC PT-02 với `unit_price_snapshot:1`                  | server trả giá thật/từ chối         |
| 4   | C-05 (đua charge)        | 2 request `/charge` cùng `order_id`, khác idem-key         | chỉ **1** giao dịch                 |
| 5   | C-06 (refund VND)        | refund 50.000 VND                                          | Stripe nhận đúng 50000 (không ×100) |
| 6   | H-01 (refund owner)      | user B refund payment user A                               | **403**                             |
| 7   | C-08 (settlement)        | gọi `/admin/settlements/*` không role                      | **401/403**                         |
| 8   | C-09 (noti, nếu gộp)     | `GET /admin/templates` không token                         | **401/403**                         |
| 9   | C-10 (shipping, nếu gộp) | `POST /shipping/public/webhooks/mock`                      | **404/401**                         |

> Harness sẵn có ở `docs/pentest/` (exp1–exp5) có thể tái dùng để chạy regression sau fix.

---

## 7. Lộ trình thực hiện (thứ tự ưu tiên)

1. **Cụm A — Danh tính (P0, gốc rễ):** nhân bản verify JWT của `catalog` cho 6 service + Envoy strip header. _Mở khóa_ mọi authz phía sau. → verify #1, #2.
2. **Cụm B — Thanh toán (P0):** C-11 (giá server-side) → C-04…C-07 (tiền) → C-08/H-01 (authz, cần A xong trước). → verify #3–#7.
3. **Gộp kèm (P0, rẻ):** C-09 (noti role + sandbox), C-10 (tắt mock shipping). → verify #8, #9.
4. **Hardening hạ tầng (P1):** C-03/H-06/H-07 fail-fast; HSTS/CSP; rate-limit per-IP; đổi password DB (Req 2.2); siết CORS.
5. **Re-run benchmark + pentest** bằng harness `docs/pentest/` → cập nhật điểm số **thật** (kỳ vọng khớp Mục 4).

---

## 8. Bảng tổng điểm dự đoán (one-look)

```
                          THỰC TẾ TRƯỚC      SAU FIX A+B        SAU + GỘP C-09/C-10
Pentest critical-live     4 sống             2 sống (PT-03/04)  0 sống
Code Critical (C-xx)      11 open            3 open             1 open (C-03)
OWASP API Top 10          ~2-3 PASS          8 PASS             9 PASS
OWASP ASVS L2             ~3 FAIL            0 FAIL, 3 Partial  0 FAIL, 2-3 Partial
PCI DSS (trừ 2.2)         nhiều Partial      hầu hết PASS       hầu hết PASS
Overhead hiệu năng        —                  < 6% vs Stripe     < 6% vs Stripe
```

---

_Báo cáo này cố tình KHÔNG dùng con số lạc quan của `BENCHMARK_RESULTS.md` làm chuẩn, mà lấy `PENTEST_NGROK_REPORT.md` + `SERVICES_CODEBASE_REVIEW.md`. Mọi "PASS" dự đoán đều kèm phép thử ở Mục 6 để kiểm chứng, tránh lặp lại lỗi "xanh ở tầng sai"._
