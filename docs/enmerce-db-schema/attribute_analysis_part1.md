# Phân tích thuộc tính Database — Part 1/2

> Phân tích chi tiết **mục đích, nghiệp vụ, bảo mật** của từng thuộc tính.
> Ký hiệu: 🔒 = FLE | 🔗 = cross-service ref | 🛡️ = STRIDE mitigation | ⚡ = performance

---

## 1. Catalog DB (`enmerce_catalog`)

### 1.1. `merchants` — Thông tin merchant (seller)

| Thuộc tính                 | Kiểu                  | Phân tích                                                                                                                                                                                                        |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                       | UUID PK               | **Identity** — Dùng UUID thay auto-increment vì distributed system, tránh xung đột ID khi scale horizontally. Mọi service khác tham chiếu merchant qua ID này.                                                   |
| `code`                     | VARCHAR(50) UNIQUE    | **Business identifier** — Slug dùng trong URL (`/shop/tiki-official`). Unique để đảm bảo mỗi merchant có URL riêng. Merchant không thể đổi code sau khi tạo (tránh broken links).                                |
| `logo_url`                 | TEXT                  | **Display** — URL tới CDN. Không lưu binary trong DB (performance). TEXT thay VARCHAR vì URL có thể dài.                                                                                                         |
| `email_encrypted`          | BYTEA 🔒              | **PII** — Email liên hệ merchant. Encrypt bằng Vault Transit vì đây là PII (GDPR, STRIDE I-DB-01). Dùng BYTEA vì ciphertext là binary. Không thể query trực tiếp → cần decrypt qua application layer.            |
| `phone_encrypted`          | BYTEA 🔒              | **PII** — Tương tự email. Encrypt vì phone number là PII.                                                                                                                                                        |
| `status`                   | VARCHAR(20) + CHECK   | **State machine** — `pending → active → suspended → closed`. CHECK constraint đảm bảo chỉ có giá trị hợp lệ ở DB level (defense-in-depth, không chỉ validate ở app). Quyết định merchant có được bán hàng không. |
| `rating_avg`               | DECIMAL(3,2)          | **Aggregated metric** — Giá trị trung bình rating từ reviews. Lưu pre-computed thay vì tính realtime để tránh heavy JOIN mỗi lần load trang. Cập nhật async khi có review mới.                                   |
| `rating_count`             | INTEGER               | **Aggregated metric** — Số lượng đánh giá. Kết hợp `rating_avg` để hiển thị "4.5 ⭐ (1,234 đánh giá)".                                                                                                           |
| `commission_rate`          | DECIMAL(5,4)          | **Business logic** — Tỷ lệ hoa hồng platform thu từ merchant (VD: 0.0500 = 5%). DECIMAL(5,4) cho phép từ 0.0000 đến 9.9999 (tối đa ~100%). Dùng trong Payment Service để tính split payment.                     |
| `is_verified`              | BOOLEAN               | **Trust signal** — Merchant đã xác minh danh tính chưa. Hiển thị badge "✓ Verified" trên UI. Ảnh hưởng fraud scoring (merchant chưa verify → risk cao hơn).                                                      |
| `metadata`                 | JSONB                 | **Extensibility** — Lưu data linh hoạt không cần thêm column: settings, social links, business hours. JSONB (không phải JSON) vì hỗ trợ index GIN, query jsonpath.                                               |
| `version`                  | INTEGER               | **Optimistic locking** ⚡ — Chống race condition khi 2 admin cùng sửa merchant. `UPDATE ... WHERE version = :expected`, nếu không match → conflict → retry. (STRIDE T-MS-02)                                     |
| `deleted_at` / `is_active` | TIMESTAMPTZ / BOOLEAN | **Soft delete** — Không xóa thật (sản phẩm, orders liên quan vẫn cần reference). `deleted_at` lưu thời điểm xóa, `is_active` cho query nhanh hơn (`WHERE is_active` thay vì `WHERE deleted_at IS NULL`).         |

### 1.2. `categories` — Danh mục sản phẩm (tree structure)

| Thuộc tính   | Kiểu               | Phân tích                                                                                                                                                                                                                                                                  |
| ------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parent_id`  | UUID FK (self-ref) | **Tree structure** — Self-referencing FK tạo cấu trúc cây. `NULL` = root category. VD: Electronics → Phones → Smartphones.                                                                                                                                                 |
| `path`       | TEXT               | **Materialized path** ⚡ — Lưu đường dẫn đầy đủ `/electronics/phones/smartphones`. Tối ưu cho: (1) tìm tất cả con cháu với `LIKE '/electronics/%'`, (2) breadcrumb navigation. Nhanh hơn recursive CTE trên `parent_id`. Tradeoff: cần update path khi di chuyển category. |
| `depth`      | SMALLINT           | **Pre-computed level** ⚡ — Tầng trong cây (0 = root). Tránh tính depth từ path mỗi lần query. Dùng để giới hạn render (VD: chỉ show 3 tầng menu).                                                                                                                         |
| `sort_order` | INTEGER            | **Display ordering** — Thứ tự hiển thị trong menu. Admin có thể sắp xếp lại categories bằng drag-drop.                                                                                                                                                                     |

### 1.4. `products` — Sản phẩm chính

| Thuộc tính      | Kiểu                | Phân tích                                                                                                                                                                             |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merchant_id`   | UUID FK 🔗          | **Ownership** — Sản phẩm thuộc về merchant nào. Kết hợp RLS (Row-Level Security) để merchant chỉ thấy sản phẩm của mình. Là FK đến `merchants.id`.                                    |
| `sku`           | VARCHAR(100)        | **Stock Keeping Unit** — Mã nội bộ của merchant. UNIQUE(merchant_id, sku) → mỗi merchant có SKU riêng, không conflict giữa merchants.                                                 |
| `status`        | VARCHAR(20) + CHECK | **Publishing workflow** — `draft → pending_review → active → inactive → archived`. Chỉ `active` products hiển thị cho buyers. `pending_review` = chờ platform duyệt (chống hàng cấm). |
| `product_type`  | VARCHAR(20)         | **Fulfillment logic** — `physical` cần shipping, `digital` cần download link, `service` cần booking. Ảnh hưởng cách Shipping Service xử lý.                                           |
| `base_price`    | DECIMAL(15,2)       | **Pricing** — Giá cơ bản. DECIMAL(15,2) cho phép giá tối đa 9,999,999,999,999.99 (đủ cho VND). CHECK >= 0 chống giá âm. Variant có thể override giá này.                              |
| `currency_code` | CHAR(3)             | **Multi-currency** — ISO 4217: VND, USD, JPY. CHAR(3) vì luôn đúng 3 ký tự. Default VND cho thị trường VN.                                                                            |
| `weight_grams`  | INTEGER             | **Shipping calculation** — Trọng lượng tính phí vận chuyển. INTEGER gram thay vì DECIMAL kg để tránh lỗi floating point. Shipping Service dùng giá trị này.                           |
| `is_taxable`    | BOOLEAN             | **Tax logic** — Một số sản phẩm miễn thuế (sách, thực phẩm cơ bản). Order Service dùng để tính `tax_amount`.                                                                          |
| `brand`         | VARCHAR(255)        | **Filtering & Search** — Lọc theo thương hiệu trên catalog page. Không dùng FK vì brands rất dynamic.                                                                                 |
| `metadata`      | JSONB               | **Flexible attributes** — Lưu data không cấu trúc: specifications, tags, SEO data. GIN index cho phép query: `WHERE metadata @> '{"origin": "Vietnam"}'`.                             |

### 1.6. `product_variants` — Biến thể sản phẩm

| Thuộc tính         | Kiểu               | Phân tích                                                                                                                                                                                 |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `price_override`   | DECIMAL(15,2) NULL | **Variant pricing** — `NULL` = dùng `products.base_price`. Có giá trị = giá riêng cho variant này. VD: iPhone 256GB đắt hơn 128GB. Logic: `COALESCE(price_override, product.base_price)`. |
| `compare_at_price` | DECIMAL(15,2)      | **Sale display** — Giá gốc trước giảm. VD: ~~2.000.000~~ → 1.500.000. Chỉ dùng cho UI, không ảnh hưởng logic thanh toán.                                                                  |
| `barcode`          | VARCHAR(100)       | **Physical tracking** — EAN/UPC barcode cho inventory management. Warehouse scan barcode để pick/pack. Index partial (WHERE NOT NULL) vì không phải variant nào cũng có.                  |

### 1.7. `product_reviews` — Đánh giá sản phẩm

| Thuộc tính       | Kiểu    | Phân tích                                                                                                                                                  |
| ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`        | UUID 🔗 | **Cross-service ref** — ID từ Keycloak. Không join trực tiếp Keycloak DB → Catalog Service gọi API để lấy user info khi cần.                               |
| `order_id`       | UUID 🔗 | **Verified purchase** — Link tới Order DB. Nếu order_id tồn tại và đã delivered → `is_verified = true`. Chống review giả.                                  |
| `is_verified`    | BOOLEAN | **Trust signal** — "Đã mua hàng ✓". Reviews verified được ưu tiên hiển thị và có weight cao hơn trong rating calculation.                                  |
| `is_approved`    | BOOLEAN | **Moderation** — Platform duyệt review trước khi hiển thị. Chống spam, nội dung xấu. Index trên `(product_id, is_approved)` → chỉ query reviewed đã duyệt. |
| `helpful_count`  | INTEGER | **Community voting** — Số lượt "Hữu ích". Dùng để sort reviews theo relevance.                                                                             |
| `merchant_reply` | TEXT    | **Two-way communication** — Merchant trả lời review. Quan trọng cho customer service. `replied_at` track thời gian phản hồi (KPI merchant).                |

### 1.8. `catalog_audit_log` — Audit (Append-only, Trigger-populated)

| Thuộc tính         | Kiểu          | Phân tích                                                                                                                                                                                                                                              |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `table_name`       | VARCHAR(100)  | **Scope** — Bảng nào bị thay đổi: `merchants`, `products`, `categories`, `product_reviews`, `product_variants`. Cho phép filter audit records theo entity type.                                                                                         |
| `record_id`        | UUID          | **Affected record** — PK của record bị thay đổi. Kết hợp `table_name` để tìm chính xác record nào.                                                                                                                                                     |
| `action`           | VARCHAR(10)   | **CRUD operation** — `INSERT`, `UPDATE`, `DELETE`. Trigger tự populate.                                                                                                                                                                                 |
| `old_data`         | JSONB         | **Before state** — State trước khi thay đổi (via `row_to_json(OLD)`). NULL cho INSERT. Dùng cho diff comparison và rollback evidence.                                                                                                                   |
| `new_data`         | JSONB         | **After state** — State sau khi thay đổi (via `row_to_json(NEW)`). NULL cho DELETE.                                                                                                                                                                     |
| `changed_fields`   | TEXT[]        | **Quick filter** ⚡ — Array các column đã thay đổi. VD: `{"base_price","status"}`. Cho phép query nhanh "ai đã sửa price?" mà không cần parse JSONB: `WHERE 'base_price' = ANY(changed_fields)`.                                                       |
| `actor_id`         | UUID          | **Who** 🛡️ — Ai thực hiện thay đổi. Populate qua `current_setting('app.actor_id')` (session variable từ application). NULL = thay đổi trực tiếp qua DB (STRIDE T-DB-02 alert).                                                                          |
| `actor_type`       | VARCHAR(20)   | **Actor classification** — `user` (buyer review), `merchant` (sửa product), `admin` (moderate review, suspend merchant), `system` (auto-update rating), `migration` (schema migration). Cho phép filter "mọi admin actions trên merchants".              |
| `ip_address`       | INET          | **Non-repudiation** 🛡️ — IP của actor. Merchant sửa giá từ IP nào. Admin override status từ đâu. Evidence cho dispute resolution.                                                                                                                       |
| `user_agent`       | TEXT          | **Device context** — Browser/device info. Bổ sung IP cho non-repudiation: "Admin sửa từ Chrome/Mac tại VN" vs "Bot request từ unknown device".                                                                                                          |
| `correlation_id`   | VARCHAR(255)  | **ELK bidirectional tracing** 🛡️ — Cùng trace_id với ELK log entry. PG audit record → tìm full request context trong ELK. ELK log → tìm DB-level change trong PG. Bridge giữa 2 hệ thống log.                                                           |
| `hmac_signature`   | VARCHAR(128)  | **Tamper detection** 🛡️ — STRIDE T-DB-02. `HMAC-SHA256(table_name \| record_id \| action \| timestamp, vault_key)`. Nếu ai sửa audit record → HMAC mismatch → phát hiện. Key từ Vault Transit (cached, TTL 5 min).                                      |
| `hmac_key_version` | INT           | **Key rotation support** — Vault rotate HMAC key mỗi 90 ngày. Field này ghi version nào đã dùng. Verify HMAC của record cũ bằng key version tương ứng.                                                                                                  |
| **Partition**       | DDL           | **Performance** ⚡ — `PARTITION BY RANGE(created_at)` monthly. Query audit gần đây chỉ scan 1-2 partitions. Archive cũ sang read-only tablespace. Retention: 3 năm.                                                                                     |

---

## 2. Cart DB (`enmerce_cart`)

### 2.1. `carts` — Giỏ hàng

| Thuộc tính                | Kiểu          | Phân tích                                                                                                                                                                                                                                                 |
| ------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`                 | UUID NOT NULL | **Owner** — Cart thuộc user đã đăng nhập. NOT NULL vì không hỗ trợ guest cart (yêu cầu login trước khi add to cart). Đơn giản hóa flow: không cần merge logic.                                                                                            |
| `merchant_id`             | UUID 🔗       | **Cart isolation per merchant** — Mỗi merchant có cart riêng (giống Shopee). User mua từ 3 merchants → 3 carts → 3 orders riêng biệt. Quan trọng cho checkout flow.                                                                                       |
| `status`                  | VARCHAR(20)   | **Cart lifecycle** — `active` (đang dùng), `converted` (đã checkout thành order), `expired` (hết hạn 7 ngày, tự động bởi background job). Không cần `abandoned` riêng — Notification Service tự quét cart `active` lâu không update → gửi reminder email. |
| `subtotal` / `item_count` | DECIMAL / INT | **Pre-computed** ⚡ — Tính sẵn thay vì SUM(cart_items) mỗi lần load. Cập nhật khi add/remove item. Tối ưu cho badge hiển thị "🛒 3" trên header.                                                                                                          |
| `expires_at`              | TIMESTAMPTZ   | **TTL** — Cart tự hết hạn sau 7 ngày không active. Background job quét `WHERE expires_at < now() AND status = 'active'` → set status = `expired`. Giải phóng resources.                                                                                   |

### 2.2. `cart_items` — Sản phẩm trong giỏ

| Thuộc tính                                  | Kiểu          | Phân tích                                                                                                                                                                                                                                |
| ------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product_id` / `variant_id`                 | UUID 🔗       | **Cross-service ref** — ID từ Catalog DB. Cart Service KHÔNG join Catalog DB (database-per-service). Thay vào đó, lưu snapshot.                                                                                                          |
| `quantity`                                  | INT + CHECK   | **Quantity limit** — `> 0 AND <= 999`. Chống: (1) quantity 0 hoặc âm, (2) quantity quá lớn (abuse). Merchant có thể set limit thấp hơn ở application level.                                                                              |
| `unit_price_snapshot`                       | DECIMAL(15,2) | **Price snapshot** 🛡️ — Giá tại thời điểm add to cart. **Quan trọng**: phát hiện price change. Khi checkout, so sánh snapshot vs giá hiện tại → thông báo user "Giá đã thay đổi". Chống STRIDE T-FE-02 (client-side price manipulation). |
| `product_name_snapshot`                     | VARCHAR(500)  | **Display without API call** ⚡ — Tên sản phẩm lúc add. Cart page load nhanh vì không cần gọi Catalog API cho mỗi item. Tradeoff: có thể outdated nếu merchant đổi tên.                                                                  |
| **UNIQUE(cart_id, product_id, variant_id)** | Constraint    | **No duplicates** — Cùng sản phẩm + variant chỉ xuất hiện 1 lần trong cart. Add lại → tăng quantity thay vì tạo row mới.                                                                                                                 |

### 2.4. `saved_items` — Lưu xem sau

| Thuộc tính    | Kiểu | Phân tích                                                                                                                                                                          |
| ------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toàn bộ table | —    | **Wishlist** — Tách riêng khỏi cart vì lifecycle khác: saved items không expire, không convert thành order trực tiếp. User "Save for later" → move từ cart_items sang saved_items. |

---

## 3. Order DB (`enmerce_order`)

### 3.1. `orders` — Đơn hàng

| Thuộc tính        | Kiểu                | Phân tích                                                                                                                                                                                                            |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order_number`    | VARCHAR(30) UNIQUE  | **Human-readable ID** — `ORD-20260329-A1B2`. Dùng trong email, hóa đơn, customer support. UUID thì user không thể đọc/nhớ. Format: prefix + date + random suffix.                                                    |
| `status`          | VARCHAR(30) + CHECK | **Order state machine** — 16 trạng thái cover toàn bộ lifecycle. CHECK constraint đảm bảo chỉ có trạng thái hợp lệ. Transition rules enforce ở application level (VD: không thể từ `delivered` → `pending_payment`). |
| `subtotal`        | DECIMAL(15,2)       | **Sum of line items** — `SUM(order_items.line_total)`. Lưu pre-computed vì order_items immutable sau khi tạo.                                                                                                        |
| `shipping_fee`    | DECIMAL(15,2)       | **Shipping cost** — Từ Shipping Service. Tách riêng vì: (1) hiển thị riêng trên invoice, (2) free shipping coupon chỉ affect field này.                                                                              |
| `tax_amount`      | DECIMAL(15,2)       | **Tax** — Tính dựa trên `product.is_taxable` + tax rules theo country. Tách riêng cho compliance và báo cáo thuế.                                                                                                    |
| `discount_amount` | DECIMAL(15,2)       | **Discount** — Tổng giảm giá từ coupons. Tách riêng để biết đơn hàng được giảm bao nhiêu (analytics, accounting).                                                                                                    |
| `total_amount`    | DECIMAL(15,2)       | **Final amount** — `subtotal + shipping_fee + tax_amount - discount_amount`. Đây là số tiền thực tế charge customer. **Server-side calculation** — không bao giờ trust client gửi lên (STRIDE T-FE-02).              |
| `payment_id`      | UUID 🔗             | **Cross-service ref** — ID transaction từ Payment DB. Order Service dùng để track trạng thái thanh toán. Không JOIN trực tiếp → query qua Payment API.                                                               |
| `shipment_id`     | UUID 🔗             | **Cross-service ref** — Link tới Shipping DB. Populate khi shipment được tạo (sau khi payment succeeded).                                                                                                            |
| `fraud_score`     | DECIMAL(5,4)        | **Risk assessment** 🛡️ — Score từ stateless Fraud Service (0.0000 = safe, 1.0000 = fraud). Lưu trong Order DB vì: (1) cần query nhanh cho dashboard, (2) Fraud Service stateless không có DB.                        |
| `fraud_status`    | VARCHAR(20)         | **Fraud decision** 🛡️ — `approved` = được duyệt, `flagged` = cần review manual, `rejected` = từ chối tự động. Index partial trên `flagged` để admin dashboard query nhanh các đơn cần xem xét.                       |
| `fraud_trace_id`  | VARCHAR(255)        | **ELK correlation** 🛡️ — ID để tìm full fraud analysis trong ELK/Kibana. Fraud analyst click → mở Kibana dashboard với trace_id → xem chi tiết ML response, signals.                                                 |
| `idempotency_key` | VARCHAR(255) UNIQUE | **Anti-replay** 🛡️ — STRIDE S-PAY-02. Client gửi checkout request với unique key. Nếu request bị retry (network issue) → DB reject duplicate → không tạo 2 orders.                                                   |
| `ip_address`      | INET                | **Non-repudiation** 🛡️ — STRIDE R-PAY-01. Lưu IP khi đặt hàng. Nếu customer claim "tôi không đặt" → có bằng chứng IP. PostgreSQL có kiểu INET native, hỗ trợ so sánh IP ranges.                                      |
| `user_agent`      | TEXT                | **Device tracking** 🛡️ — Browser/device info. Kết hợp IP để xác minh: "đơn hàng từ Chrome/Windows tại VN", không phải "từ bot tại Russia". Fraud Service cũng dùng.                                                  |

### 3.2. `order_items` — Chi tiết đơn hàng (Immutable)

| Thuộc tính                                     | Kiểu           | Phân tích                                                                                                                                                                  |
| ---------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product_name` / `variant_label` / `image_url` | VARCHAR / TEXT | **Immutable snapshot** — Lưu thông tin sản phẩm tại thời điểm mua. **Không bao giờ thay đổi** dù merchant sửa/xóa sản phẩm sau đó. Đảm bảo invoice/receipt luôn chính xác. |
| `unit_price`                                   | DECIMAL(15,2)  | **Price at purchase** — Giá tại thời điểm mua (đã verified server-side). Dùng cho: refund calculation, accounting, dispute resolution.                                     |
| `discount_per_item` / `tax_per_item`           | DECIMAL(15,2)  | **Per-item breakdown** — Chi tiết giảm giá và thuế per item. Quan trọng cho: partial refund (chỉ refund 1 item), tax reporting.                                            |
| `line_total`                                   | DECIMAL(15,2)  | **Computed total** — `(unit_price - discount) * quantity + tax`. Pre-computed, không tính lại mỗi lần.                                                                     |
| `fulfilled_qty`                                | INTEGER        | **Partial fulfillment** — Bao nhiêu đã giao. VD: order 10 items, giao 7, fulfilled_qty = 7. Dùng cho split shipments.                                                      |
| `status`                                       | VARCHAR(20)    | **Per-item status** — Mỗi item có status riêng. VD: 2 items đã ship, 1 item cancelled. Cho phép partial cancel/refund.                                                     |

### 3.3. `order_addresses` — Địa chỉ đơn hàng (🔒 FLE)

| Thuộc tính                              | Kiểu           | Phân tích                                                                                                                                                                        |
| --------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `address_type`                          | VARCHAR(10)    | **Shipping vs Billing** — 2 loại: shipping (giao hàng) và billing (thanh toán). Có thể khác nhau (VD: mua làm quà → ship tới người khác).                                        |
| `full_name_encrypted`                   | BYTEA 🔒       | **PII — Name** — Tên người nhận. Encrypt vì đây là PII. Nếu DB backup bị lộ → attacker chỉ thấy ciphertext (STRIDE I-DB-01).                                                     |
| `phone_encrypted`                       | BYTEA 🔒       | **PII — Phone** — SĐT giao hàng. Encrypt vì phone number dùng cho social engineering. Shipping Service cần decrypt khi gọi carrier API.                                          |
| `city` / `country_code` / `postal_code` | VARCHAR / CHAR | **Non-PII geography** — KHÔNG encrypt vì: (1) Shipping Service cần query theo vùng để chọn carrier/warehouse, (2) Không identify individual. Tradeoff: privacy vs functionality. |

### 3.4. `order_status_history` — Lịch sử trạng thái

| Thuộc tính                  | Kiểu           | Phân tích                                                                                                                                                                            |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `from_status` / `to_status` | VARCHAR(30)    | **State transition** — Ghi lại mỗi lần đổi trạng thái. VD: `pending_payment → confirmed`. `from_status` NULL cho lần đầu tạo order. Tạo audit trail đầy đủ (STRIDE R-MS-01).         |
| `actor_id` / `actor_type`   | UUID / VARCHAR | **Who did it** — Ai thực hiện thay đổi: `user` (buyer cancel), `merchant` (confirm), `admin` (force status), `system` (auto-confirm sau payment). Quan trọng cho dispute resolution. |
| `reason`                    | TEXT           | **Context** — Lý do thay đổi. VD: cancel reason = "Đổi ý", "Tìm được giá rẻ hơn". Analytics dùng để giảm cancellation rate.                                                          |

### 3.5. `saga_state` — Orchestration cho distributed transaction

| Thuộc tính                    | Kiểu        | Phân tích                                                                                                                                                                 |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saga_type`                   | VARCHAR(50) | **Saga identifier** — `checkout` là flow chính. Có thể thêm `refund`, `return` saga sau. UNIQUE(order_id, saga_type) → mỗi order chỉ có 1 saga mỗi loại.                  |
| `current_step`                | VARCHAR(50) | **Progress tracker** — Step hiện tại: `validate_cart`, `check_fraud`, `reserve_inventory`, `process_payment`, `create_shipment`. Biết saga đang ở đâu khi cần debug.      |
| `status`                      | VARCHAR(20) | **Saga lifecycle** — `in_progress` → `completed` (happy path) hoặc `compensating` → `compensated` (rollback). `failed` = rollback thất bại → cần manual intervention.     |
| `steps_completed`             | JSONB       | **Completed log** — `["validate_cart", "reserve_inventory"]`. Biết đã làm gì → biết cần compensate gì khi rollback.                                                       |
| `compensation_log`            | JSONB       | **Rollback record** — `[{"step": "release_inventory", "at": "...", "result": "success"}]`. Ghi lại rollback actions để biết compensating transaction có thành công không. |
| `retry_count` / `max_retries` | INTEGER     | **Retry logic** — Nếu step fail → retry tối đa 3 lần. Quá 3 → saga status = `failed`. Chống infinite retry loop.                                                          |
| `expires_at`                  | TIMESTAMPTZ | **Saga timeout** — 30 phút. Nếu saga chưa complete sau 30 phút → auto-compensate. Chống resource leak (inventory bị locked mãi). Background job quét expired sagas.       |

### 3.6. `order_audit_log` — Audit (Bổ sung cho `order_status_history`)

> **Vai trò**: `order_status_history` chỉ track **status transitions**. `order_audit_log` track **mọi thay đổi khác** trên order data (amount, fraud override, address, fulfilled_qty...).

| Thuộc tính         | Kiểu          | Phân tích                                                                                                                                                                                                                                                  |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table_name`       | VARCHAR(100)  | **Scope** — Track 3 tables: `orders` (amount/fraud changes), `order_items` (fulfilled_qty, per-item status), `order_addresses` (delivery address change sau khi đặt).                                                                                       |
| `record_id`        | UUID          | **Affected record** — PK của record bị thay đổi. Join với `orders.id`, `order_items.id`, hoặc `order_addresses.id` để lấy context.                                                                                                                          |
| `action`           | VARCHAR(10)   | **CRUD operation** — `INSERT`, `UPDATE`, `DELETE`. Trigger tự populate. Đặc biệt quan trọng cho UPDATE trên orders (fraud_status override, amount modification).                                                                                             |
| `old_data`         | JSONB         | **Before state** — State trước khi thay đổi. Kịch bản quan trọng: admin sửa `fraud_status` từ `flagged` → `approved` → `old_data` ghi lại `{"fraud_status": "flagged"}`. Evidence cho internal audit.                                                         |
| `new_data`         | JSONB         | **After state** — State sau khi thay đổi. So sánh `old_data` vs `new_data` để xem chính xác thay đổi gì.                                                                                                                                                     |
| `changed_fields`   | TEXT[]        | **Quick filter** ⚡ — VD: `{"fraud_status"}`, `{"total_amount","shipping_fee"}`, `{"fulfilled_qty"}`. Query: "tất cả lần sửa fraud_status" → `WHERE 'fraud_status' = ANY(changed_fields)`.                                                                   |
| `actor_id`         | UUID          | **Who** 🛡️ — Đặc biệt quan trọng cho Order DB vì liên quan dispute. Nếu admin override fraud → cần biết ai. Nếu merchant sửa order → cần biết ai. NULL = direct DB access (alert).                                                                          |
| `actor_type`       | VARCHAR(20)   | **Actor classification** — `user` (buyer update note), `merchant` (confirm fulfillment), `admin` (fraud override, force status), `system` (auto-update from Kafka events).                                                                                    |
| `ip_address`       | INET          | **Non-repudiation** 🛡️ — STRIDE R-PAY-01. Kết hợp `orders.ip_address` (IP lúc đặt hàng) với IP lúc sửa. Nếu khác xa → suspicious.                                                                                                                            |
| `correlation_id`   | VARCHAR(255)  | **ELK tracing** — Link tới ELK log. Đặc biệt hữu ích khi debug Kafka-triggered changes: Order Service nhận FraudResult event → update fraud_status → `correlation_id` link tới Kafka consumer log trong ELK.                                                  |
| `hmac_signature`   | VARCHAR(128)  | **Tamper detection** 🛡️ — STRIDE T-DB-02. Key từ Vault Transit (cached, TTL 5 min). Nếu attacker sửa ORDER data rồi sửa audit log → HMAC mismatch → phát hiện.                                                                                               |
| `hmac_key_version` | INT           | **Key rotation support** — Vault rotate key mỗi 90 ngày. Records cũ vẫn verify được bằng key version tương ứng.                                                                                                                                              |
| **Partition**       | DDL           | **Retention** ⚡ — `PARTITION BY RANGE(created_at)` monthly. Hot 12 tháng → Warm 36 tháng → Cold 60 tháng. Tổng 5 năm (tuân thủ Luật Giao dịch điện tử 2023).                                                                                                |
