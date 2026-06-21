# Phân tích thuộc tính Database — Part 2/2

> Phân tích chi tiết **mục đích, nghiệp vụ, bảo mật** của từng thuộc tính.
> Ký hiệu: 🔒 = FLE | 🔗 = cross-service ref | 🛡️ = STRIDE mitigation | ⚡ = performance

---

## 4. Payment DB (`enmerce_payment`)

> [!CAUTION]
> **PCI-DSS Scope.** Database này KHÔNG lưu PAN. Mọi sensitive data phải encrypt hoặc tokenize.

### 4.1. `payment_methods` — Phương thức thanh toán (Tokenized)

| Thuộc tính                                           | Kiểu         | Phân tích                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`                                            | UUID 🔗      | **Owner** — Phương thức thanh toán thuộc user nào. Cross-service ref tới Keycloak. Một user có nhiều payment methods.                                                                                      |
| `method_type`                                        | VARCHAR(30)  | **Payment type** — `credit_card`, `debit_card`, `bank_transfer`, `e_wallet` (MoMo, ZaloPay), `cod` (thanh toán khi nhận hàng). Ảnh hưởng UI display và processing logic.                                   |
| `psp_provider`                                       | VARCHAR(30)  | **Payment Service Provider** — `stripe`, `vnpay`, `momo`. Cho phép multi-PSP: user A dùng Stripe, user B dùng VNPay. Payment Service route request tới PSP phù hợp.                                        |
| `psp_payment_method_id`                              | VARCHAR(255) | **PSP Token** 🛡️ — Stripe `pm_xxx`, VNPay token. **ĐÂY KHÔNG PHẢI PAN.** PSP giữ card data, platform chỉ giữ token. Khi charge → gửi token cho PSP → PSP charge card thật. PCI-DSS SAQ A (scope nhỏ nhất). |
| `psp_customer_id`                                    | VARCHAR(255) | **PSP Customer Profile** — Stripe `cus_xxx`. PSP lưu customer profile → cho phép 1-click checkout sau.                                                                                                     |
| `card_last4`                                         | CHAR(4)      | **Display only** 🛡️ — 4 số cuối thẻ, VD: "•••• 4242". PCI-DSS cho phép hiển thị last4. User nhận diện thẻ nào mà không lộ full PAN. CHAR(4) vì luôn đúng 4 ký tự.                                          |
| `card_brand`                                         | VARCHAR(20)  | **UI display** — `visa`, `mastercard`, `jcb`, `amex`. Hiển thị logo tương ứng. Ảnh hưởng processing fee (mỗi brand fee khác nhau).                                                                         |
| `card_exp_month` / `card_exp_year`                   | SMALLINT     | **Expiry tracking** — Tháng/năm hết hạn. Background job quét sắp hết hạn → notify user "Thẻ sắp hết hạn, vui lòng cập nhật". SMALLINT tiết kiệm space.                                                     |
| `card_fingerprint`                                   | VARCHAR(255) | **Duplicate detection** 🛡️ — PSP generate fingerprint unique per card. Detect: "User A và User B cùng dùng 1 thẻ" → fraud signal. Hoặc chống user add cùng thẻ 2 lần.                                      |
| `billing_name_encrypted` / `billing_email_encrypted` | BYTEA 🔒     | **PII** — Tên và email trên billing. Encrypt vì PII. Dùng cho invoice, chargeback dispute.                                                                                                                 |
| `is_default`                                         | BOOLEAN      | **UX convenience** — Payment method mặc định cho checkout nhanh. Chỉ 1 method per user là default → enforce ở application level (unset old default khi set new).                                           |
| `is_verified`                                        | BOOLEAN      | **Security** — Thẻ đã xác minh chưa (VD: micro-charge $0.01 thành công). Chỉ cho phép dùng verified methods cho high-value orders.                                                                         |

### 4.2. `payment_transactions` — Giao dịch thanh toán

| Thuộc tính                             | Kiểu                  | Phân tích                                                                                                                                                                                                |
| -------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order_id`                             | UUID 🔗               | **Cross-service ref** — Link tới Order DB. Thông thường 1 order = 1 transaction. Nếu charge fail rồi retry bằng thẻ khác → 2 transactions (1 failed, 1 succeeded).                                       |
| `transaction_type`                     | VARCHAR(20)           | **Payment type** — `charge` (thanh toán online qua Stripe/VNPay), `cod_collect` (shipper thu tiền khi giao). Không có authorize/capture vì mình check kho + fraud TRƯỚC khi charge → không cần giữ tiền. |
| `status`                               | VARCHAR(20)           | **Transaction lifecycle** — `pending` → `processing` → `succeeded` / `failed` / `cancelled`. Đơn giản, không có `expired` (vì không có authorize timeout).                                               |
| `amount`                               | DECIMAL(15,2) + CHECK | **Transaction amount** — Số tiền giao dịch. CHECK > 0 chống amount âm. DECIMAL tránh floating point error.                                                                                               |
| `psp_transaction_id`                   | VARCHAR(255)          | **PSP reference** — Stripe `pi_xxx` hoặc `ch_xxx`. Dùng để: (1) tra cứu trên Stripe Dashboard, (2) đối soát (reconciliation).                                                                            |
| `psp_status`                           | VARCHAR(50)           | **Raw PSP status** — Status gốc từ PSP, có thể chi tiết hơn app status. VD: Stripe `requires_action` (cần 3DS). Debug bằng cách so sánh app status vs psp_status.                                        |
| `psp_response`                         | JSONB                 | **Full PSP response** — Response đầy đủ từ PSP (masked sensitive fields). Dùng cho debugging, dispute evidence. JSONB cho phép query specific fields.                                                    |
| `psp_fee`                              | DECIMAL(15,2)         | **Processing cost** — Phí PSP thu per transaction. VD: Stripe 2.9% + 30¢. Dùng tính profit margin, accounting reconciliation.                                                                            |
| `three_ds_status` / `three_ds_version` | VARCHAR               | **3D Secure** 🛡️ — STRIDE R-PAY-01. 3DS = xác thực 2 lớp (OTP từ bank). Nếu có 3DS → liability shift sang bank khi chargeback.                                                                           |
| `authentication_type`                  | VARCHAR(30)           | **Auth method** — `3ds`, `sca`, `biometric`, `none`. EU regulation (PSD2) yêu cầu SCA cho transactions.                                                                                                  |
| `fraud_trace_id`                       | VARCHAR(255)          | **ELK correlation** 🛡️ — Link tới fraud assessment logs trong ELK. Payment analyst cần xem fraud context khi investigating suspicious transaction.                                                       |
| `fraud_score`                          | DECIMAL(5,4)          | **Risk score** — Score từ Fraud Service tại thời điểm payment. Lưu riêng ở Payment DB vì payment có thể được review independent.                                                                         |
| `idempotency_key`                      | VARCHAR(255) UNIQUE   | **Anti-replay** 🛡️ — STRIDE S-PAY-02. Client generate unique key per checkout attempt. Nếu network timeout → retry với cùng key → DB reject duplicate → chỉ charge 1 lần.                                |
| `failure_code` / `failure_message`     | VARCHAR / TEXT        | **Error handling** — Structured error (`card_declined`, `insufficient_funds`). UI show message tương ứng. Analytics track failure reasons.                                                               |
| `device_fingerprint`                   | VARCHAR(255)          | **Device tracking** 🛡️ — Browser/device fingerprint kết hợp IP + user_agent để detect fraud.                                                                                                             |
| `paid_at`                              | TIMESTAMPTZ           | **Payment timestamp** — Khi charge succeeded hoặc COD collected. Dùng cho accounting, reporting.                                                                                                         |

### 4.3. `idempotency_keys` — Chống duplicate request

| Thuộc tính                        | Kiểu            | Phân tích                                                                                                                                   |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`                             | VARCHAR(255) PK | **Unique request identifier** — Client generate: `checkout_{order_id}_{timestamp}`. PK = fastest lookup.                                    |
| `request_hash`                    | VARCHAR(64)     | **Request validation** — SHA-256 của request body. Nếu cùng key nhưng body khác → reject (không phải retry, mà là misuse).                  |
| `response_code` / `response_body` | INT / JSONB     | **Cached response** — Nếu request đã processed → trả lại response cũ thay vì process lại. Client nhận cùng response dù retry bao nhiêu lần. |
| `expires_at`                      | TIMESTAMPTZ     | **Cleanup** — Key expire sau 24h. Background job delete expired keys. Tránh table grow vô hạn.                                              |

### 4.4. `psp_webhook_log` — Log webhook từ PSP

| Thuộc tính                     | Kiểu         | Phân tích                                                                                                                                                                 |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_type`                   | VARCHAR(100) | **Webhook event** — `payment_intent.succeeded`, `charge.refunded`, `charge.dispute.created`. PSP push real-time updates.                                                  |
| `event_id`                     | VARCHAR(255) | **PSP event ID** — Stripe event ID. UNIQUE(psp_provider, event_id) → chống process cùng event 2 lần.                                                                      |
| `signature`                    | TEXT         | **Webhook verification** 🛡️ — HMAC signature từ PSP. Payment Service verify: `HMAC(payload, webhook_secret) == signature`. Chống spoofed webhooks (STRIDE S-API-01).      |
| `is_verified` / `is_processed` | BOOLEAN      | **Processing pipeline** — 2-step: (1) verify signature, (2) process event. Tách riêng vì: verify có thể pass nhưng processing fail → retry processing mà không re-verify. |

### 4.5. `payment_audit_log` — Audit (Append-only, Trigger-populated)

| Thuộc tính         | Kiểu          | Phân tích                                                                                                                                                                                                                                |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table_name`       | VARCHAR(100)  | **Scope** — Track: `payment_methods` (method status, verification), `payment_transactions` (transaction status, amount). Không track `idempotency_keys` (ephemeral) hay `psp_webhook_log` (bản thân nó đã là log).                      |
| `changed_fields`   | TEXT[]        | **Quick filter** ⚡ — Mới thêm. VD: `{"status","psp_status"}`, `{"is_default"}`. Cho phép query nhanh "tất cả lần transaction status change" mà không cần parse JSONB old_data/new_data.                                               |
| `user_agent`       | TEXT          | **Device context** — Mới thêm. Bổ sung `ip_address` cho non-repudiation. Đặc biệt quan trọng khi user thêm/xóa payment method từ device lạ.                                                                                          |
| `correlation_id`   | VARCHAR(255)  | **ELK bidirectional tracing** — Mới thêm. Link PG audit ↔ ELK logs. Đặc biệt hữu ích cho payment investigation: từ audit record tìm full PSP interaction log trong ELK, và ngược lại.                                           |
| `hmac_signature`   | VARCHAR(128)  | **Tamper detection** 🛡️ — STRIDE T-DB-02. `HMAC-SHA256(payload, vault_key)`. Key từ Vault Transit **API** (key KHÔNG rời Vault — PCI-DSS requirement). Khác với các DB khác dùng cached key.                                            |
| `hmac_key_version` | INT           | **Key rotation support** — Mới thêm. Vault rotate HMAC key mỗi 90 ngày. Verify audit records cũ bằng key version tương ứng.                                                                                                         |
| **Partition**       | DDL           | **Retention** ⚡ — `PARTITION BY RANGE(created_at)` monthly. Hot 12 tháng → Warm 36 tháng → Cold 84 tháng. Tổng **7 năm** (PCI-DSS Req 10.7). pg_partman auto-create.                                                                  |

---

## 5. Inventory DB (`enmerce_inventory`)

### 5.1. `warehouses` — Kho hàng

| Thuộc tính          | Kiểu        | Phân tích                                                                                                                                                                                                     |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merchant_id`       | UUID (FK)     | **Ownership** — Kho/Shop thuộc về merchant nào.                                                                                                                                                               |
| `code`              | VARCHAR(50) | **Internal ref** — Mã kho: `WH-HCM-01`, `SHOP-CT`. Dùng để in trên shipping label.                                                                                                                            |
| `address_encrypted` | BYTEA (STRIDE)    | **PII / Location** — Địa chỉ lấy/gửi hàng. Đây là **Origin Address**. Bắt buộc phải có để Sàn tính phí vận chuyển từ Shop đến Khách hàng, dù là Shipper tới lấy (Pick-up) hay Shop tự mang gửi (Drop-off). |
| `priority`          | INTEGER     | **Fulfillment routing**  - Nếu merchant xài nhiều kho trên Sàn, kho nào ưu tiên lấy trước. Sàn chia đơn vào kho gần buyer nhất hoặc priority cao nhất.                                                      |

### 5.2. `inventory_items` — Tồn kho per sản phẩm per kho

| Thuộc tính                  | Kiểu          | Phân tích                                                                                                                                                                                        |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `product_id` / `variant_id` | UUID        | **Cross-service ref** - ID từ Catalog DB. Mỗi product + variant + warehouse = 1 row. VD: iPhone 15 Pro 256GB tại WH-HCM = 1 inventory item.                                                      |
| `quantity_on_hand`          | INT + CHECK   | **Physical stock** - Số lượng thực tế trong kho. CHECK >= 0 vì không thể có tồn kho âm. Không hỗ trợ backorder.                                                                                  |
| `quantity_reserved`         | INT + CHECK   | **Soft lock** - Số lượng đã đặt nhưng chưa ship. Khi checkout → tăng reserved. Khi ship → giảm reserved + giảm on_hand.                                                                          |
| `quantity_available`        | INT GENERATED | **Computed**  - `on_hand - reserved`. PostgreSQL `GENERATED ALWAYS AS ... STORED` → tự động tính. Catalog Service query field này để show "Còn X sản phẩm". **available = 0 → không cho đặt.** |
| `is_track_inventory`        | BOOLEAN       | **Skip tracking** - Một số sản phẩm (digital, service) không cần track inventory. `false` → skip inventory check khi checkout.                                                                   |
| `version`                   | INTEGER       | **Optimistic locking** - STRIDE T-MS-02. Chống race condition: 2 orders cùng mua item cuối cùng. Nếu version mismatch → retry.                                                                |

### 5.3. `inventory_reservations` — Giữ hàng tạm thời

| Thuộc tính       | Kiểu        | Phân tích                                                                                                                                                                                                 |
| ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saga_id`        | UUID 🔗     | **Saga correlation** — Link tới `saga_state` trong Order DB. Khi saga compensate → release reservation. Biết reservation thuộc saga nào để rollback chính xác.                                            |
| `status`         | VARCHAR(20) | **Reservation lifecycle** — `held` (đang giữ) → `confirmed` (payment OK, chờ ship) → `released` (cancel/timeout).                                                                                         |
| `expires_at`     | TIMESTAMPTZ | **TTL 15 phút** — Reservation tự hết hạn. Background job: `UPDATE ... SET status = 'released' WHERE expires_at < now() AND status = 'held'`. Chống inventory bị locked forever khi user abandon checkout. |
| `release_reason` | VARCHAR(50) | **Debug context** — `saga_compensated`, `expired`, `user_cancelled`, `admin_override`. Biết tại sao reservation bị release → debug flow issues.                                                           |

### 5.4. `inventory_audit_log` — Audit (Track mọi thay đổi inventory)

> **Vai trò**: Marketplace model — platform không quản lý kho chi tiết. `inventory_audit_log` track **mọi thay đổi** trên warehouses và inventory_items, bao gồm cả quantity changes do merchant cập nhật qua API.

| Thuộc tính         | Kiểu          | Phân tích                                                                                                                                                                                                                                                           |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table_name`       | VARCHAR(100)  | **Scope** — Track 2 tables: `warehouses` (config: priority, is_active, address), `inventory_items` (config + quantity changes). Không track `inventory_reservations` (operational, đã có status/timestamps riêng). |
| `changed_fields`   | TEXT[]        | **Quick filter** ⚡ — Đặc biệt hữu ích cho: `WHERE 'is_track_inventory' = ANY(changed_fields)` để tìm mọi lần ai đó tắt inventory tracking (có thể dẫn đến oversold). Hoặc `WHERE 'quantity_on_hand' = ANY(changed_fields)` để track mọi lần merchant cập nhật tồn kho. |
| `actor_id`         | UUID          | **Who** 🛡️ — Quan trọng vì: (1) Admin sửa warehouse priority → ảnh hưởng fulfillment routing cho toàn platform, (2) Admin tắt tracking → hàng bán oversold, (3) Merchant cập nhật quantity → biết ai đổi. NULL (direct DB access) → cảnh báo STRIDE T-DB-02.            |
| `hmac_signature`   | VARCHAR(128)  | **Tamper detection** 🛡️ — Key từ Vault Transit (cached, TTL 5 min). Detect DBA trực tiếp sửa `quantity_on_hand` mà bypass API → audit log ghi nhận nhưng nếu bị tamper thì HMAC mismatch.                                                                            |
| `hmac_key_version` | INT           | **Key rotation support** — Vault rotate mỗi 90 ngày.                                                                                                                                                                                                           |
| **Partition**       | DDL           | **Retention** ⚡ — `PARTITION BY RANGE(created_at)` monthly. Hot 6 tháng → Warm 24 tháng. Tổng 2 năm. Ngắn hơn Payment/Order vì inventory config changes ít giá trị pháp lý.                                                                                         |

---

## 6. Shipping DB (`enmerce_shipping`)

### 6.1. `shipping_providers` — Đơn vị vận chuyển

| Thuộc tính            | Kiểu               | Phân tích                                                                                                                                          |
| --------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`                | VARCHAR(50) UNIQUE | **Provider identifier** — `ghn`, `ghtk`, `jnt`, `fedex`. Code dùng trong routing logic và API calls.                                               |
| `api_base_url`        | TEXT               | **Integration config** — URL API của carrier. VD: `https://online-gateway.ghn.vn/shiip`. Lưu DB thay vì env var → có thể đổi mà không redeploy.    |
| `supported_countries` | JSONB              | **Routing filter** — `["VN"]` hoặc `["VN","TH","SG"]`. Khi buyer ở nước X → chỉ show carriers hỗ trợ nước X.                                       |
| `capabilities`        | JSONB              | **Feature flags** — `{"tracking": true, "cod": true, "insurance": true, "same_day": false}`. VD: order có COD → chỉ chọn carriers có `cod = true`. |

### 6.2. `shipping_rates` — Bảng giá vận chuyển

| Thuộc tính    | Kiểu         | Phân tích                                                                                                                                                                                           |
| ------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merchant_id` | UUID NULL 🔗 | **Platform vs Merchant rate** — `NULL` = platform-wide rate (mọi merchant). Có giá trị = rate riêng cho merchant đó (contract đặc biệt). Logic: `COALESCE(merchant_rate, platform_rate)`.           |
| `rate_type`   | VARCHAR(20)  | **Pricing model** — `flat` (phí cố định), `weight_based` (theo cân nặng), `price_based` (theo giá trị đơn hàng), `zone_based` (theo vùng). Checkout Service dùng rate_type để apply đúng công thức. |
| `zone_config` | JSONB        | **Zone pricing** — `{"zone_1": {"provinces": ["HCM","HN"], "rate": 20000}, "zone_2": {"rate": 35000}}`. Linh hoạt hơn fixed fields.                                                                 |

### 6.3. `shipments` — Kiện hàng

| Thuộc tính                       | Kiểu          | Phân tích                                                                                                                                                                                                    |
| -------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tracking_number`                | VARCHAR(100)  | **Customer-facing** — Mã vận đơn từ carrier: `GHN123456789`. User dùng tra cứu trên website carrier. Index cho fast lookup.                                                                                  |
| `status`                         | VARCHAR(30)   | **Shipment lifecycle** — 9 trạng thái: `pending` → `label_created` → `picked_up` → `in_transit` → `out_for_delivery` → `delivered`. Hoặc `failed_delivery` → `returned`. Update qua carrier webhook/polling. |
| `recipient_*_encrypted`          | BYTEA 🔒      | **PII** — Tên, SĐT, địa chỉ người nhận. Encrypt vì: (1) PII protection, (2) nếu Shipping DB bị breach → không lộ thông tin khách hàng. Shipping Service decrypt chỉ khi cần gọi carrier API.                 |
| `weight_grams` / `dimensions_cm` | INT / JSONB   | **Package measurement** — Carrier dùng để tính phí ship (volumetric weight vs actual weight). dimensions_cm dùng JSONB vì là object `{l, w, h}`.                                                             |
| `cod_amount`                     | DECIMAL(15,2) | **Cash on Delivery** — Số tiền carrier thu hộ khi giao. `0` = không COD. Carrier chuyển lại cho platform sau khi giao thành công.                                                                            |
| `estimated_delivery`             | DATE          | **Promise** — Ngày dự kiến giao. Hiển thị cho buyer. Tính từ `shipping_rates.estimated_days_min/max`. Nếu trễ → compensation logic.                                                                          |
| `provider_shipment_id`           | VARCHAR(255)  | **Carrier reference** — ID nội bộ của carrier. Dùng khi gọi carrier API (get tracking, cancel shipment). Khác `tracking_number` (customer-facing).                                                           |
| `provider_label_url`             | TEXT          | **Shipping label** — URL tới PDF label (print để dán lên kiện hàng). Carrier generate, Shipping Service lưu URL.                                                                                             |

### 6.4. `shipment_tracking_events` — Sự kiện tracking real-time

| Thuộc tính    | Kiểu         | Phân tích                                                                                                                                                        |
| ------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_code`  | VARCHAR(50)  | **Standardized code** — `picked_up`, `in_transit`, `hub_arrived`, `out_for_delivery`. Map từ carrier-specific codes sang mã chuẩn hóa nội bộ.                    |
| `location`    | VARCHAR(255) | **Geo tracking** — "Kho HCM", "Hub Bình Dương". Hiển thị trên tracking timeline.                                                                                 |
| `occurred_at` | TIMESTAMPTZ  | **Event time** — Thời điểm sự kiện xảy ra (theo carrier). Khác `created_at` (thời điểm ghi vào DB). Events có thể đến không theo thứ tự → sort by `occurred_at`. |
| `raw_data`    | JSONB        | **Carrier response** — Response gốc từ carrier API. Debug issues khi `event_code` mapping sai.                                                                   |
| `source`      | VARCHAR(20)  | **Event origin** — `carrier` (từ carrier webhook), `manual` (admin override), `system` (auto-generate). Biết event đến từ đâu.                                   |

### 6.5. `shipping_audit_log` — Audit (Bổ sung cho `shipment_tracking_events`)

> **Vai trò**: `shipment_tracking_events` chỉ track **carrier events** (picked up, in transit, delivered). `shipping_audit_log` track **admin/config changes** trên providers, rates, shipments.

| Thuộc tính         | Kiểu          | Phân tích                                                                                                                                                                                                                                                        |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table_name`       | VARCHAR(100)  | **Scope** — Track 3 tables: `shipping_providers` (enable/disable provider), `shipping_rates` (price change → ảnh hưởng tất cả orders mới), `shipments` (manual status override, cod_amount modification). Không track `shipment_tracking_events` (đã là event log).  |
| `changed_fields`   | TEXT[]        | **Quick filter** ⚡ — VD: `{"base_rate"}` trên shipping_rates, `{"is_active"}` trên shipping_providers, `{"status","cod_amount"}` trên shipments. Query: "tất cả lần thay đổi giá ship" → `WHERE 'base_rate' = ANY(changed_fields)`.                                           |
| `actor_id`         | UUID          | **Who** 🛡️ — Kịch bản quan trọng: admin sửa `shipping_rates.base_rate` → tất cả orders mới bị charge sai phí ship → dispute. Cần biết ai đã thay đổi.                                                                                                            |
| `hmac_signature`   | VARCHAR(128)  | **Tamper detection** 🛡️ — Key từ Vault Transit (cached, TTL 5 min). Đặc biệt quan trọng cho `shipping_rates` vì rate change ảnh hưởng revenue platform-wide.                                                                                                       |
| `hmac_key_version` | INT           | **Key rotation support** — Vault rotate mỗi 90 ngày.                                                                                                                                                                                                        |
| **Partition**       | DDL           | **Retention** ⚡ — `PARTITION BY RANGE(created_at)` monthly. Hot 6 tháng → Warm 24 tháng. Tổng 2 năm.                                                                                                                                                       |

---

## 7. Notification DB (`enmerce_notification`)

### 7.1. `notification_channels` — Kênh thông báo

| Thuộc tính   | Kiểu               | Phân tích                                                                                                                                                       |
| ------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`       | VARCHAR(30) UNIQUE | **Channel identifier** — `email`, `sms`, `push`, `in_app`, `webhook`. Code dùng trong routing logic.                                                            |
| `provider`   | VARCHAR(50)        | **Provider mapping** — `gmail_smtp`, `twilio`, `firebase_fcm`, `slack_webhook`. Cho phép đổi provider mà không đổi channel (VD: SMTP → SendGrid).               |
| `config`     | JSONB              | **Provider config** — `{"smtp_host": "...", "port": 587}`. Masked sensitive values. Lưu DB → thay đổi config không cần redeploy.                                |
| `rate_limit` | JSONB              | **Throttling** — `{"max_per_minute": 100, "max_per_hour": 1000}`. Chống: (1) exceed provider limits, (2) spam users. Application enforce limits before sending. |

### 7.2. `notification_templates` — Mẫu thông báo

| Thuộc tính  | Kiểu                | Phân tích                                                                                                                                                                 |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`      | VARCHAR(100) UNIQUE | **Template identifier** — `order_confirmed`, `payment_received`, `shipment_tracking`, `password_reset`. Code-level reference, không hardcode template content trong code. |
| `category`  | VARCHAR(50)         | **Preference mapping** — `order`, `payment`, `shipping`, `marketing`, `security`. User có thể tắt marketing nhưng bắt buộc nhận security notifications.                   |
| `variables` | JSONB               | **Template variables** — `["order_number", "customer_name", "total_amount"]`. Documentation cho dev biết template cần data gì. Validate trước khi send.                   |

### 7.3. `notification_log` — Bản ghi notification đã gửi (Core Business Table)

> **Lưu ý**: Đây là **business table**, không phải audit log. Ghi lại mỗi notification được gửi cho user. Là parent table cho `notification_delivery_attempts`. **Notification DB không cần `*_audit_log` riêng** — ELK xử lý audit.

| Thuộc tính         | Kiểu          | Phân tích                                                                                                                                                                                                                                                                     |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`          | UUID 🔗        | **Recipient** — User nhận notification. Cross-service ref tới Keycloak. Dùng để query "tất cả notifications của user X" cho in-app notification center.                                                                                                               |
| `channel_id`       | UUID FK       | **Channel** — FK tới `notification_channels`. Gửi qua email, SMS, push, hay in_app. Mỗi notification chỉ gửi qua 1 channel (để track delivery status riêng biệt).                                                                                                          |
| `template_id`      | UUID FK       | **Template** — FK tới `notification_templates`. NULL nếu gửi custom message (không dùng template). Biết template nào được dùng nhiều nhất (analytics).                                                                                                               |
| `category`         | VARCHAR(50)   | **Notification type** — `order`, `payment`, `shipping`, `marketing`, `security`. Dùng để: (1) check user preferences trước khi gửi, (2) dashboard thống kê theo category.                                                                                                   |
| `subject`          | VARCHAR(500)  | **Email subject / Push title** — Tiêu đề notification. Dùng cho in-app notification list. Không chứa PII (dùng placeholder: "Đơn hàng #ORD-xxx đã được xác nhận").                                                                                                       |
| `content_hash`     | VARCHAR(64)   | **Content fingerprint** — SHA-256 của nội dung đầy đủ. **KHÔNG lưu nội dung gốc** (có thể chứa PII: tên, địa chỉ). Hash để: (1) detect duplicate sends, (2) verify content integrity nếu cần.                                                                               |
| `recipient_masked` | VARCHAR(255)  | **Masked recipient** — `t***y@gmail.com`, `+84***456`. Display only, **không lưu full PII**. Đủ để debug "gửi cho ai?" mà không lộ thông tin nhạy cảm. Quan trọng cho GDPR/PDPA compliance.                                                                                       |
| `status`           | VARCHAR(20)   | **Notification lifecycle** — `queued` → `sending` → `sent` → `delivered` / `failed` / `bounced`. Retry logic dựa trên status: chỉ retry `failed`, không retry `bounced` (hard bounce = địa chỉ không tồn tại).                                                                 |
| `reference_type`   | VARCHAR(30)   | **Cross-service context** 🔗 — Notification liên quan tới: `order` (order confirmation), `payment` (payment receipt), `shipment` (tracking update). Kết hợp `reference_id` để link tới business entity.                                                                      |
| `reference_id`     | UUID          | **Cross-service ref** 🔗 — `order_id`, `payment_id`, `shipment_id`. Query: "tất cả notifications đã gửi cho order X" → `WHERE reference_type = 'order' AND reference_id = :order_id`.                                                                                   |
| `priority`         | VARCHAR(10)   | **Queue priority** — `low` (marketing), `normal` (order confirmation), `high` (payment failure), `urgent` (security: password reset, 2FA). Notification worker xử lý urgent trước.                                                                                          |
| `attempt_count`    | INT           | **Retry tracking** — Số lần đã thử gửi. Kết hợp `max_attempts` (default 3) để quyết định còn retry không. Background job: `WHERE status = 'failed' AND attempt_count < max_attempts AND next_retry_at <= now()`.                                               |
| `next_retry_at`    | TIMESTAMPTZ   | **Exponential backoff** — Thời điểm retry tiếp theo. Tính: `now() + (2^attempt_count * base_interval)`. VD: 1m, 2m, 4m. Index partial cho retry worker.                                                                                                             |
| `expires_at`       | TIMESTAMPTZ   | **TTL 72 giờ** — Ngừng retry sau 72h. Order confirmation gửi sau 3 ngày không còn ý nghĩa. Background job set status = `failed` khi expired.                                                                                                                       |
| **Partition**       | DDL           | **Retention** ⚡ — `PARTITION BY RANGE(created_at)` monthly. Hot 3 tháng → Warm 12 tháng. Tổng 1 năm. Ngắn nhất trong các DBs vì notification data giảm giá trị nhanh.                                                                                                |

### 7.4. `user_notification_preferences` — Tùy chọn thông báo

| Thuộc tính                                | Kiểu       | Phân tích                                                                                                                                                                                                |
| ----------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_enabled`                              | BOOLEAN    | **Opt-in/out** — User tắt specific channel + category combo. VD: nhận order notifications qua email nhưng không qua SMS. `security` category luôn enabled (không cho tắt) → enforce ở application level. |
| **UNIQUE(user_id, channel_id, category)** | Constraint | **One preference per combo** — Mỗi user + channel + category chỉ có 1 setting.                                                                                                                           |

### 7.5. `notification_delivery_attempts` — Chi tiết mỗi lần thử gửi

| Thuộc tính          | Kiểu         | Phân tích                                                                                                                                                                                                    |
| ------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `notification_id`   | UUID FK      | **Parent ref** — FK tới `notification_log.id`. Mỗi notification có 1..N delivery attempts. Attempt #1 = lần gửi đầu, #2+ = retry.                                                                          |
| `attempt_number`    | INT          | **Sequence** — Lần thử thứ mấy (1, 2, 3). Kết hợp `notification_log.max_attempts` để biết còn retry không.                                                                                              |
| `status`            | VARCHAR(20)  | **Attempt result** — `success`, `failed`, `bounced`, `rejected`. Chỉ `failed` mới retry. `bounced` = hard bounce (email không tồn tại) → mark notification as `bounced`, không retry.                        |
| `provider_response` | JSONB        | **Raw response** — Response từ provider (Gmail SMTP response, Twilio API response). Debug "tại sao gửi fail?". Mask sensitive fields.                                                                       |
| `error_code`        | VARCHAR(100) | **Structured error** — `smtp_550_mailbox_not_found`, `twilio_21610_blocked`. Cho phép analytics: "bao nhiêu % fail do invalid email vs provider outage?".                                                     |
| `error_message`     | TEXT         | **Human-readable** — Chi tiết lỗi dạng text. Dùng cho support team debug. VD: "Mailbox does not exist".                                                                                                  |

---

## Summary — Thuộc tính cross-cutting

| Pattern                  | Thuộc tính                                        | Có trong                                                           | Mục đích                                        |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| **Optimistic Lock**      | `version`                                         | products, carts, inventory_items, shipments                        | Chống race condition (STRIDE T-MS-02)           |
| **Soft Delete**          | `deleted_at`, `is_active`                         | merchants, products, payment_methods                               | Không mất data, audit trail                     |
| **FLE** 🔒               | `*_encrypted` (BYTEA)                             | merchants, orders, shipments                                       | PII protection (STRIDE I-DB-01)                 |
| **Idempotency**          | `idempotency_key`                                 | orders, payment_transactions                                       | Chống replay/duplicate (STRIDE S-PAY-02)        |
| **Audit timestamps**     | `created_at`, `updated_at`                        | Mọi table                                                          | Traceability, debugging                         |
| **Cross-service ref** 🔗 | `*_id` (UUID, no FK)                              | order→payment, cart→product, inventory→product                     | DB isolation, loose coupling                    |
| **Snapshot**             | `*_snapshot` fields                               | cart_items, order_items                                             | Immutable data tại thời điểm action             |
| **JSONB metadata**       | `metadata`, `config`                              | products, merchants, providers                                     | Extensibility không cần schema change           |
| **Audit Log** 🛡️        | `*_audit_log` (append-only, HMAC, partitioned)    | catalog, order, payment, inventory, shipping                       | Tamper detection (STRIDE T-DB-02), compliance   |
| **HMAC Integrity**       | `hmac_signature` + `hmac_key_version`             | 5 `*_audit_log` tables                                             | Tamper detection, Vault Transit key rotation    |
| **ELK Correlation**      | `correlation_id`                                  | 5 `*_audit_log` tables, `orders.fraud_trace_id`                    | Bidirectional PG ↔ ELK tracing                 |
| **Trigger Hybrid**       | Session vars (`app.actor_id`, `app.ip_address`)   | Tất cả audit triggers                                               | Safety net: bắt mọi thay đổi kể cả direct DB access |
