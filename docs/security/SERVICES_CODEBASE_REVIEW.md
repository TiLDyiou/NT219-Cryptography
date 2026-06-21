# Đánh giá (Review) Codebase Services

> Tài liệu này được viết lại hoàn toàn sau khi đọc kỹ mã nguồn của **cả 7 service** (`order`, `inventory`, `payment`, `shipping`, `catalog`, `noti`, `cart`). Phạm vi review chỉ là **mã nguồn (code)**, bỏ qua tài liệu (docs) và bỏ qua giá trị trong `.env.example` (bạn sẽ tự cấu hình khi triển khai trên node thật). Tuy nhiên, các **giá trị mặc định (default) được hard-code thẳng trong code** — kích hoạt khi biến môi trường không được set — vẫn được liệt kê, vì chúng là rủi ro "fail-open" (lỗi theo hướng mở toang) nếu lỡ quên cấu hình.
>
> Ngày review: dựa trên trạng thái HEAD `3569a66`.

---

## 0. Tóm tắt cho người bận rộn (Executive Summary)

Có một tin tốt và một tin cần lưu ý.

**Tin tốt — codebase đã tiến bộ rõ rệt so với đợt review cũ:**
- Lỗi cấu trúc dữ liệu ở Payment (`client_secret`, `failure_code`, `failure_message`) **đã được sửa dứt điểm**, có cả migration `0006_add_client_secret`.
- Các cờ bảo mật giờ đã **mặc định AN TOÀN** (secure-by-default): `REQUIRE_INBOUND_HMAC` và `REQUIRE_NONCE_GUARD` mặc định `true`; `ENABLE_SQLITE_FALLBACK`, `PAYMENT_DEV_STUB_ON_FAILURE`, `INVENTORY_DEV_STUB_ON_FAILURE` mặc định `false`. Những cảnh báo về các cờ này trong báo cáo cũ **đã lỗi thời**.
- Nhiều mẫu thiết kế chuẩn production xuất hiện: mã hóa phong bì (envelope encryption) bằng AES-GCM + Vault, Outbox pattern, khóa lạc quan (optimistic locking), `FOR UPDATE SKIP LOCKED`, bộ lọc log che PII, xác minh chữ ký webhook Stripe, và `catalog-service` xác thực JWT Keycloak RS256 thật.

**Tin cần lưu ý — vấn đề cốt lõi không nằm ở config mà nằm ở logic và kiến trúc:**

1. **Toàn bộ mô hình xác thực người dùng đang "dựa trên niềm tin"**: Mọi service (TRỪ `catalog`) tin tưởng tuyệt đối các header thô như `X-User-Id`, `X-Merchant-Id`, `X-Admin-Id` mà **không** xác minh chữ ký JWT. Mô hình này CHỈ an toàn nếu có một API Gateway đứng trước chặn/ghi đè header — nhưng **gateway đó không tồn tại trong repo**. Đây là rủi ro nền tảng, cấu hình env không sửa được.

2. **Một loạt lỗi logic nghiêm trọng** mà cấu hình không cứu được: Payment ghi nhận webhook trước khi xử lý (event lỗi không bao giờ được thử lại), đua lệnh charge gây tính tiền 2 lần, hoàn tiền sai số tiền với VND; Noti cho phép chèn template tùy ý (SSTI/RCE); Cart cho phép client tự đặt giá; Shipping có webhook giả mạo không cần xác thực.

3. **Cơ chế "fallback im lặng"**: Khi Vault/Redis/Kafka lỗi, các service tự động tụt xuống chế độ dev (crypto bằng khóa hard-code, lưu nonce trong RAM, bỏ qua publish event) mà **không dừng (fail-fast)**, tạo cảm giác an toàn giả.

Bảng mức độ:

| Mức độ | Số lượng phát hiện | Ý nghĩa |
|--------|--------------------|---------|
| Critical | 11 | Khai thác được trực tiếp hoặc gây mất tiền/dữ liệu |
| High | 18 | Rủi ro cao, cần xử lý trước production |
| Medium | nhiều | Nợ kỹ thuật, nên xử lý |

---

## 1. Kiến trúc & luồng hoạt động hiện tại (Workflow)

- **`order-service` là Orchestrator (bộ điều phối trung tâm)**: chạy Saga, gọi HTTP đồng bộ (qua `httpx`) sang `inventory-service` (cổng 8005) và `payment-service` (cổng 8004), đồng thời gọi `cart-service` (cổng 8002) để lấy giỏ hàng. Các lời gọi đi (outbound) được ký bằng HMAC chuẩn hóa (canonical request signing).
- **Giao tiếp với bên thứ ba**: `payment` ↔ Stripe, `shipping` ↔ Giao Hàng Nhanh (GHN), `noti` ↔ SMTP, `catalog` ↔ Keycloak.
- **Kafka + Outbox**: `inventory`, `payment`, `shipping`, `noti` dùng Outbox pattern (ghi event vào DB trong cùng transaction rồi worker mới publish) — đây là điểm cộng lớn. `noti` là consumer chính (nhận event để gửi mail). Tuy nhiên **nghiệp vụ chính giữa order ↔ inventory ↔ payment vẫn chạy HTTP đồng bộ**, Kafka mới đóng vai trò phụ (event/audit).
- **Hai service "phẳng"**: `catalog` và `cart` có kiến trúc đơn giản (`api/crud/models/schemas`), không theo clean-architecture như 5 service kia, và **không có** middleware HMAC/nonce, Vault, hay Redis.

---

## 2. Phát hiện mức CRITICAL (Nghiêm trọng — xử lý ngay)

> *Critical = khai thác trực tiếp được, hoặc gây mất tiền/hỏng dữ liệu thật.*

### C-01. Tin tưởng `X-User-Id` / `X-Merchant-Id` / `X-Admin-Id` không xác minh chữ ký (toàn hệ thống)
**Tác động (1 câu):** Bất kỳ ai gọi thẳng được vào service chỉ cần gửi header `X-User-Id: <id-nạn-nhân>` là mạo danh được người dùng/merchant/admin bất kỳ.

Đây là lỗ hổng nền tảng, lặp lại ở gần như mọi service:
- `order`: `services/order-service/app/api/dependencies.py:49-50` (trả thẳng `X-User-Id`).
- `cart`: `services/cart-service/app/api/dependencies.py:30-35`.
- `inventory`: `services/inventory-service/app/api/dependencies.py:52-57` (`X-Merchant-Id`).
- `payment`: `services/payment-service/app/api/dependencies.py:25-30` (`get_current_user_id`).
- `shipping`: `services/shipping-service/app/api/dependencies.py:53-58` (`X-Merchant-Id`) và `66-74` (`X-Admin-Id` + `X-Admin-Scope`).

**Tại sao code lại làm vậy?** Comment trong `_decode_jwt_sub` ghi rõ "không verify signature vì gateway đã verify" (ví dụ `order .../dependencies.py:29`). Ý đồ là một API Gateway (Envoy/Keycloak) đứng trước xác thực rồi tự gắn header an toàn. **Vấn đề:** gateway đó không có trong repo, và bản thân service không phân biệt được header đến từ gateway hay từ kẻ tấn công. Thêm nữa, `X-User-Id` được **ưu tiên hơn** cả Bearer token (cart `:34-39`, inventory `:56-61`) → kể cả khi có JWT hợp lệ, header giả vẫn thắng.

**Ngoại lệ tích cực:** `catalog-service` làm ĐÚNG — xác minh JWT Keycloak RS256 thật (`services/catalog-service/app/api/dependencies.py:47-95`), không dùng header thô. Đây là hình mẫu nên nhân rộng cho các service khác.

### C-02. JWT chỉ được base64-decode, KHÔNG verify chữ ký (mọi service trừ catalog)
**Tác động:** Kẻ tấn công tự chế một JWT với `sub` tùy ý là chiếm được danh tính, nếu service bị expose mà không qua gateway.

`_decode_jwt_sub` chỉ tách phần payload giữa và đọc `sub`, bỏ qua chữ ký, `exp`, `iss`, `aud`:
- `order`: `dependencies.py:28-42`
- `cart`: `dependencies.py:12-24`
- `inventory`: `dependencies.py:20-35`
- `payment`: `dependencies.py:33-46` (hàm `get_current_user_id_from_jwt` có tồn tại nhưng **không được dùng**)
- `shipping`: `dependencies.py:21-36`

### C-03. Vault lỗi → tự tụt xuống crypto dev với khóa hard-code, KHÔNG dừng (im lặng)
**Tác động:** Trên production, nếu Vault tạm mất kết nối, service vẫn chạy tiếp nhưng ký HMAC/chữ ký event và mã hóa PII bằng một khóa ai cũng đoán được → phá vỡ toàn bộ niềm tin liên service.

`VAULT_ENABLED` mặc định `true`, nhưng mọi exception khi khởi tạo Vault chỉ ghi `warning` rồi rơi vào `LocalDevCryptoService(LOCAL_CRYPTO_SECRET)`:
- `order`: `infrastructure/container.py:124-127`, khóa `config.py:147-149` (`local-dev-order-crypto-key-32b!`)
- `inventory`: `container.py:125-139`, khóa `config.py:83-85`
- `payment`: `container.py:138-152`, khóa `config.py:106-108`
- `shipping`: `container.py:122-126`, khóa `config.py:88-90`
- `noti`: `container.py:107-120`, khóa `config.py:115-117`

**Khắc phục:** ở môi trường prod phải **fail-fast** (dừng khởi động) khi Vault bắt buộc mà không kết nối được, thay vì tụt hạng âm thầm.

### C-04. Payment ghi nhận webhook TRƯỚC khi xử lý → event lỗi không bao giờ được thử lại
**Tác động:** Đơn hàng kẹt ở trạng thái chưa thanh toán dù Stripe báo đã thu tiền — sai lệch trạng thái tiền bạc âm thầm.

`services/payment-service/app/application/use_cases/handle_webhook.py:43-55`: sau khi verify chữ ký, dòng webhook-log được insert và **commit ngay** (dòng 55). Nếu phần xử lý nghiệp vụ phía sau lỗi và rollback (`:186-188`), thì lần Stripe gửi lại sẽ rơi vào `insert_if_new → None → return "duplicate"` (`:50-52`) trả HTTP 200. Kết quả: giao dịch không bao giờ chuyển sang `succeeded`/`failed`.

### C-05. Đua lệnh charge → tính tiền 2 lần (thiếu ràng buộc UNIQUE trên `order_id`)
**Tác động:** Một đơn hàng có thể bị tạo nhiều phiên thanh toán/charge song song.

`services/payment-service/app/application/use_cases/charge.py:54-79`: idempotency chỉ khóa theo `(user_id, Idempotency-Key)`. Hai request `/charge` cùng `order_id` nhưng **khác** idempotency key đều qua được, đều không thấy bản ghi cũ, đều tạo phiên Stripe + bản ghi DB. Cột `payment_transactions.order_id` chỉ có index, **không unique** (`models/payment_transaction.py:11`, migration `0001:81`).

### C-06. Hoàn tiền (refund) sai số tiền với tiền tệ 0 chữ số thập phân (VND)
**Tác động:** Hoàn 50.000 VND có thể bị nhân thành 5.000.000 đơn vị → hoàn dư hoặc Stripe từ chối.

`services/payment-service/app/infrastructure/external/stripe_client.py`: lúc tạo intent dùng `to_minor_units()` xử lý đúng VND (`:17-20`), nhưng lúc refund lại cứng nhắc `int(amount * 100)` (`:202-206`). VND không có "xu" nên ×100 là sai.

### C-07. Refund dùng nhầm Checkout Session ID làm PaymentIntent
**Tác động:** Hoàn tiền cho các đơn thanh toán qua Checkout (thẻ tín dụng) sẽ thất bại/sai.

Luồng thẻ lưu Session ID dạng `cs_...` vào `psp_intent_id` (`charge.py:107-119`), nhưng refund lại truyền chuỗi đó vào `stripe.Refund.create(payment_intent=...)` (`refund.py:65-66`) — Stripe yêu cầu dạng `pi_...`.

### C-08. API admin settlement KHÔNG có xác thực
**Tác động:** Bất kỳ caller nào (qua được tầng HMAC) đều có thể tạo và "xử lý" (đánh dấu đã chi tiền) các đợt đối soát/chi trả cho merchant.

`services/payment-service/app/api/v1/admin/settlements.py:11-41`: endpoint `/admin/settlements/generate` và `/process/{id}` không có JWT, không internal token, không kiểm tra vai trò.

### C-09. Noti: chèn template email tùy ý không cần xác thực → SSTI/RCE
**Tác động:** Kẻ tấn công ghi template Jinja chứa mã thực thi, sẽ chạy trên server khi gửi mail → có thể RCE hoặc rò rỉ bí mật.

- API admin không có bất kỳ xác thực nào: `services/noti-service/app/api/v1/admin/templates.py:25-42` (HMAC middleware bỏ qua mọi path không chứa `/internal/`, mà không có route `/internal/` nào).
- `upsert_template` lưu `subject/html/text_template` tùy ý (`:31-35`), và bộ render dùng `jinja2.Environment` thường, **không phải `SandboxedEnvironment`** (`infrastructure/email/jinja_template_renderer.py:7-11, 20-22`).

### C-10. Shipping: webhook "mock" không xác thực có thể đổi trạng thái đơn vận chuyển
**Tác động:** Kẻ tấn công gửi JSON tùy ý để đặt `tracking_number` và `status` bất kỳ, lái trạng thái giao hàng.

`services/shipping-service/app/api/v1/public/webhooks_ghn.py:34-49`: `POST /api/v1/public/webhooks/mock` nhận JSON không kèm chữ ký/token/auth, rồi gọi thẳng `RecordTrackingEventUseCase`. Endpoint test này không được tắt ở môi trường thật.

### C-11. Cart: client tự đặt giá sản phẩm (`unit_price_snapshot`)
**Tác động:** Kẻ tấn công thêm hàng giá 0đ hoặc giá tùy ý; mọi luồng checkout tin vào subtotal của cart sẽ bị gian lận.

`services/cart-service/app/schemas/cart.py:11-12` nhận `unit_price_snapshot` từ client (chỉ chặn `ge=0`), và `crud/cart.py:160-166` lưu thẳng giá đó, **không** đối chiếu với catalog/product-service. `subtotal` tính từ snapshot này (`:115-123`).

---

## 3. Phát hiện mức HIGH (Cao — xử lý trước production)

### Nhóm xác thực / phân quyền
- **H-01. Refund không kiểm tra quyền sở hữu & không idempotent** — `payment .../internal/payments.py:34-48` (bắt `requesting_user_id` nhưng không đối chiếu chủ giao dịch) + `use_cases/refund.py:63-69` (mỗi lần retry sinh `ref-{id}-{uuid}` mới → hoàn tiền trùng).
- **H-02. `INTERNAL_API_TOKEN` được khai báo nhưng KHÔNG được kiểm ở đâu cả** — `payment/config.py:62`, `noti/config.py:72`: tạo cảm giác có bảo vệ nhưng thực tế các endpoint internal chỉ dựa vào HMAC + header giả mạo được.
- **H-03. Endpoint internal của inventory không có `verify_internal_token`** — `inventory .../internal/reservations.py:14-51`: reserve/release/confirm stock chỉ được HMAC che. Nếu `REQUIRE_INBOUND_HMAC=false` (hoặc cấu hình sai), ai cũng giữ/nhả/xác nhận tồn kho cho `order_id` bất kỳ.
- **H-04. Admin/merchant của shipping nhận diện qua header thô** — `shipping .../dependencies.py:53-74` (đã nêu ở C-01, nhắc lại vì admin có quyền ghi đè trạng thái và quản lý nhà vận chuyển).
- **H-05. Catalog thiếu kiểm `iss`/realm/role trên JWT** — `catalog .../dependencies.py:65-70, 88-95`: chỉ verify chữ ký RS256 + `audience="account"`. Bất kỳ user hợp lệ nào trong realm cũng gọi được API merchant và tự đăng ký làm seller.

### Nhóm crypto / fallback im lặng
- **H-06. Redis lỗi → lưu nonce/idempotency trong RAM (mất chống replay đa node)** — `order/container.py:132-142`, `inventory/container.py:141-154`, `payment/container.py:162-168`, `shipping/container.py:134-140`, `noti/container.py:130-134`. Trên nhiều pod, mỗi tiến trình một bộ nhớ riêng → nonce bị replay, idempotency thất bại, gửi mail/giữ kho trùng.
- **H-07. Kafka lỗi → `NullEventPublisher`, và `verify_inbound` luôn trả `True`** — `order/kafka_producer.py:56-57`, `inventory:73-74`, `shipping:62-63`, `noti:66-67`. Event bị âm thầm bỏ; nguy hiểm hơn là nếu code dùng `verify_inbound` để tin event đến thì sẽ chấp nhận mọi event chưa ký. (Shipping nặng nhất: C-tier vì consumer dùng đường này tạo shipment từ `order.confirmed` không cần chữ ký — xem báo cáo chi tiết shipping #4.)
- **H-08. Sai lệch chuẩn hóa giữa ký và verify event (order)** — `order .../crypto/digital_signature.py:19-27` (sign băm cả dict) vs `35-49` (verify chỉ băm `payload`). Event order ký ra có thể không verify được ở phía nhận, và event payment ký bằng Vault có thể bị order verify trượt → đơn kẹt ở `payment_processing`.

### Nhóm logic / đúng đắn
- **H-09. Inventory coi "đặt giữ 0 dòng" là thành công** — `inventory .../use_cases/reserve_stock.py:64-70, 125-143`: nếu mọi dòng đều bị `continue` (không có tồn kho theo dõi), vẫn commit và phát `reserved: True`. Saga tưởng đã giữ hàng trong khi thực tế chưa giữ gì.
- **H-10. Idempotency của checkout trả cache mà không tiếp tục/kiểm tra saga** — `order .../use_cases/checkout.py:83-92`: cùng `Idempotency-Key` + fingerprint thì return sớm, không resume saga lỗi dở. Retry có thể để inventory/payment lệch nhau trong khi client thấy "thành công".
- **H-11. PostgreSQL cho phép trùng idempotency key của đơn cha** — `order .../models/order_model.py:73-74`: `UniqueConstraint("idempotency_key","merchant_id")` với `merchant_id=NULL` (đơn cha) → theo luật NULL của Postgres, nhiều bản ghi cha cùng key vẫn lọt → đua tạo checkout trùng.
- **H-12. Webhook nhắm vào shipment có tracking NULL** — `shipping .../webhooks_ghn.py:29-30` + `shipment_repository.py:203-212`: thiếu cả `tracking_number` lẫn `order_code` → query `tracking_number IS NULL`, mà UNIQUE cho phép nhiều NULL → match nhầm hoặc raise.
- **H-13. Nonce guard chặn webhook GHN thật** — `shipping .../nonce_guard.py:11-33` áp cho mọi POST trừ health/ready/metrics; GHN không gửi `X-Timestamp`/`X-Nonce` → 401. Cập nhật tracking thật sẽ fail nếu không tắt nonce guard (mâu thuẫn availability).
- **H-14. Noti đánh dấu idempotency TRƯỚC khi gửi thành công** — `noti .../kafka_consumer.py:38-47`: `mark_processed(event_id)` chạy trước `dispatch()`. Nếu gửi mail/DB lỗi sau đó, Kafka không retry nữa → mất thông báo.
- **H-15. Noti: `autoescape` không có tác dụng với `from_string`** — `noti .../jinja_template_renderer.py:8-22`: `select_autoescape(["html","xml"])` chỉ escape theo **tên file**; template tạo bằng `from_string` có tên rỗng → biến do người dùng kiểm soát đổ vào `html_template` không bị escape → chèn HTML/XSS trong email.
- **H-16. Cart tạo trùng giỏ active cho cùng `(user_id, merchant_id)`** — `cart .../models/cart.py:37-40` (chỉ index, không unique) + `crud/cart.py:40-51`: hai `add_item` song song tạo nhiều cart `active`, hàng bị tách, subtotal sai.

### Nhóm bí mật hard-code (chỉ rủi ro nếu QUÊN set env — bạn đã nói sẽ tự cấu hình)
- **H-17. Token/secret/DB-credential mặc định đoán được trong code** — gom chung: `INTERNAL_API_TOKEN`, `LOCAL_CRYPTO_SECRET`, `DATABASE_URL` (kèm mật khẩu dev), `STRIPE_API_KEY=sk_test_mock`, `STRIPE_WEBHOOK_SECRET=whsec_mock`, `GHN_WEBHOOK_SECRET=dev-ghn-webhook-secret`, `ADMIN_TOKEN=admin_secret_dev` (catalog), `KC_ADMIN_PASSWORD=admin123` (catalog). Vị trí tiêu biểu: `payment/config.py:46-108`, `catalog/config.py:16-30`, `shipping/config.py:40-90`. Đặc biệt nguy hiểm là `STRIPE_WEBHOOK_SECRET` (xem H-18) vì nó quyết định việc giả mạo webhook được hay không.
- **H-18. Mặc định `whsec_mock` cho webhook Stripe** — `payment/config.py:90`: chữ ký webhook **CÓ** được verify (điểm tốt, không thể tắt bằng cờ — `stripe_client.py:216-225`), nhưng nếu quên set `STRIPE_WEBHOOK_SECRET`, ai biết giá trị mặc định này đều giả mạo được event `payment_intent.succeeded` → đánh dấu đơn đã trả tiền mà không trả.

---

## 4. Phát hiện mức MEDIUM (Nợ kỹ thuật — nên xử lý)

| ID | Vấn đề | Vị trí | Ghi chú |
|----|--------|--------|---------|
| M-01 | `CARRIER_FORCE_MOCK` mặc định `true` | `shipping/config.py:82`, `carrier_gateway_factory.py:16-17` | Ép dùng nhà vận chuyển giả kể cả khi `CARRIER_PROVIDER=ghn`; label/tracking không bao giờ chạm GHN thật nếu quên tắt. |
| M-02 | `BANK_PAYOUT_STUB` luôn dùng stub | `payment/container.py:207`, `bank_payout_stub.py:16-23` | Container luôn tạo `BankPayoutStub()` bất kể config → settlement đánh dấu "đã chi" mà không chuyển khoản thật; cờ config gây hiểu nhầm. |
| M-03 | `check_alembic_head()` chỉ là stub rỗng | `payment/main.py:41-43`, `inventory/main.py:31-33`, `shipping/main.py:32-33`, `noti/main.py:34-35` | `ALEMBIC_CHECK_ON_STARTUP=true` nhưng chỉ log "thành công", không thực sự so head → trôi schema không bị phát hiện. |
| M-04 | Settlement tính bằng `float` thay vì `Decimal` | `payment/use_cases/generate_settlement.py:42-65` | Sai số làm tròn khi chi trả merchant ở quy mô lớn. |
| M-05 | Charge không kiểm tra đơn tồn tại / số tiền | `payment/use_cases/charge.py:41-48` | `OrderHttpClient` có nhưng không dùng → tin `order_id`/`amount` do caller cung cấp. |
| M-06 | Webhook trả `str(e)` lộ chi tiết lỗi | `payment/api/v1/public/webhooks.py:44-47` | Rò rỉ thông tin nội bộ ra ngoài. |
| M-07 | Partial refund bị đánh dấu `REFUNDED` | `payment/use_cases/refund.py:73, 87-92` | State machine chặn refund tiếp → không hoàn từng phần đúng được. |
| M-08 | HMAC middleware chỉ áp cho path chứa `/internal/`, nhưng shipping/noti không có route `/internal/` | `shipping/hmac_verification.py:16-18`, `noti` tương tự | `REQUIRE_INBOUND_HMAC=true` thành no-op với mọi endpoint hiện có. |
| M-09 | HMAC không kiểm timestamp (chỉ nonce guard kiểm) | `*/hmac_verification.py:44-51` | Nếu tắt nonce guard, request đã ký có thể replay vĩnh viễn. |
| M-10 | Public tracking là "oracle" liệt kê + lộ PII thô | `shipping/api/v1/public/tracking.py:14-21`, `track_shipment_public.py:17-21` | Mã hợp lệ trả 200 + city/lịch sử sự kiện; mã sai trả 404 → xác nhận tồn tại; không rate-limit. |
| M-11 | Cart `system_convert` bỏ qua business rule & optimistic lock | `cart/api/v1/system/cart.py:25-35` | Set `status="converted"` inline, bỏ kiểm giỏ rỗng và version. |
| M-12 | Không xác thực sản phẩm thuộc về `merchant_id` | `cart/crud/cart.py:160-164`, `inventory reserve` `:61-77` | `merchant_id` từ URL, `product_id` từ body, không đối chiếu → ô nhiễm chéo merchant. |
| M-13 | Catalog: public GET-by-ID bỏ qua `status` | `catalog/api/v1/public/product.py:61-65` vs list `crud/product.py:56-57` | Sản phẩm `draft` (ẩn khỏi list) vẫn truy cập được qua ID → lộ hàng chưa publish. |
| M-14 | Catalog: CORS `allow_origin_regex=r"https?://.*"` + credentials | `catalog/main.py:37-43`, tương tự `cart/main.py:27-33` | Cho phép gọi credentialed từ mọi origin. |
| M-15 | Catalog: upload chỉ tin `Content-Type`, path ghi theo `sub` chưa validate UUID | `catalog/api/v1/merchant/product.py:106-127` | Thiếu magic-byte check; nếu `sub` chứa `../` có thể thoát thư mục (giảm nhẹ nếu Keycloak luôn cấp `sub` dạng UUID). |
| M-16 | Noti: lưu `subject` email dạng plaintext | `noti/use_cases/send_notification.py:115,125`, `models/__init__.py:64` | PII/thông tin nghiệp vụ lộ trong backup DB (recipient/variables thì đã mã hóa). |
| M-17 | Inventory: race confirm/release không check version | `inventory/repositories/inventory_repository.py:288-328` | read-modify-write không khóa lạc quan như `reserve_quantity`. |
| M-18 | Idempotency hạ tầng có nhưng không dùng | `shipping/container.py:133-140`, `noti processed_events_repository.py` không được consumer gọi | POST trùng (cancel, quote, webhook, retry) không được khử trùng. |
| M-19 | SQLite fallback dùng `create_all` thay vì Alembic | `inventory/database.py:57-67`, `payment/database.py:54-66`, `shipping`, `noti` | Khi bật fallback, thiếu các ràng buộc/index chỉ-Postgres (vd `ck_inv_reserved_le_on_hand`). Mặc định `false` nên rủi ro chỉ khi bật. |

---

## 5. Những điểm làm TỐT (giữ lại và nhân rộng)

Để tránh hiểu lầm rằng codebase "toàn lỗi", đây là các thực hành tốt thực sự có trong code:

- **Mặc định an toàn**: `REQUIRE_INBOUND_HMAC`/`REQUIRE_NONCE_GUARD` = `true`; `ENABLE_SQLITE_FALLBACK`/`*_DEV_STUB_ON_FAILURE` = `false` (vd `order/config.py:68-91, 126-145`).
- **Mã hóa phong bì (envelope encryption)** AES-GCM + DEK bọc bởi Vault cho PII (địa chỉ, recipient): `*/crypto/envelope_encryption.py:14-32`.
- **Outbox pattern** với `FOR UPDATE SKIP LOCKED` ở mọi service có Kafka: `*/messaging/outbox_worker.py`.
- **Khóa lạc quan (optimistic locking)** trên đơn/giao dịch/cart/shipment.
- **Giữ tồn kho an toàn**: `SELECT ... FOR UPDATE` + `UPDATE ... WHERE version` + check constraint (`inventory/repositories/inventory_repository.py:211,230-247`; migration `0001:71-75`).
- **Xác minh chữ ký webhook Stripe** bắt buộc, không có cờ tắt (`payment/stripe_client.py:216-230`).
- **Xác thực JWT Keycloak RS256 thật** ở catalog (`catalog/dependencies.py:47-95`) — chuẩn nên áp cho các service khác.
- **Bộ lọc log che PII** (email, số thẻ, Bearer, khóa Stripe) ở payment (`main.py:18-35`); che fingerprint thẻ trước khi lưu (`stripe_client.py:23-47`); không lưu PAN (`payment_method.py:14-16`).
- **`hmac.compare_digest`** (so sánh chống timing) ở các đường verify HMAC dev và verifier webhook GHN.
- **Tắt OpenAPI/docs** ở các service nhạy cảm (order/inventory/payment/shipping/noti `main.py`).
- **Kafka producer** dùng `acks=all` + `enable_idempotence=True` (`inventory/kafka_producer.py:80-81`).

---

## 6. Lộ trình khắc phục đề xuất (ưu tiên giảm dần)

1. **Đóng lỗ hổng danh tính (C-01, C-02)** — quan trọng nhất. Hoặc (a) các service tự verify JWT như catalog đã làm, hoặc (b) bắt buộc mọi traffic đi qua API Gateway và **không** tin header thô khi không có bằng chứng từ gateway. Đây là gốc rễ, env không sửa được.
2. **Sửa các lỗi tiền bạc của Payment** — C-04 (commit webhook trước xử lý), C-05 (UNIQUE/advisory-lock theo `order_id`), C-06 (minor units VND), C-07 (`pi_` cho refund Checkout), C-08 (auth admin settlement), H-01 (authz + idempotency refund).
3. **Fail-fast khi Vault/Redis/Kafka bắt buộc mà lỗi (C-03, H-06, H-07)** — bỏ fallback im lặng ở môi trường prod; ít nhất phải có cờ `ENVIRONMENT=production` để chặn tụt hạng.
4. **Noti: khóa API admin + dùng `SandboxedEnvironment` + bật autoescape cho `from_string` + đánh dấu idempotency SAU khi gửi thành công** (C-09, H-14, H-15).
5. **Shipping: xóa/tắt webhook mock ở prod, loại nonce-guard khỏi đường webhook carrier, xác thực chữ ký GHN** (C-10, H-13, H-12).
6. **Cart: lấy giá từ catalog/product-service thay vì tin client; thêm UNIQUE giỏ active** (C-11, H-16).
7. **Dọn cấu hình production**: bắt buộc set mọi secret/token/DB qua env (bạn đã dự định làm); cân nhắc fail khi phát hiện giá trị mặc định dev trong prod (H-17, H-18). Tắt `CARRIER_FORCE_MOCK`, gỡ/đấu nối `BANK_PAYOUT_STUB` cho đúng (M-01, M-02). Hiện thực `check_alembic_head()` (M-03).

---

*Ghi chú: Báo cáo này thay thế nội dung review cũ. Các cảnh báo cũ về cờ `dev_stub_on_failure`, `ENABLE_SQLITE_FALLBACK`, `REQUIRE_INBOUND_HMAC/NONCE_GUARD` mặc định mở, và lỗi cột `client_secret` ở Payment — đều ĐÃ ĐƯỢC SỬA trong codebase hiện tại và không còn áp dụng.*
