# Kế hoạch xây dựng Merchant Seller Center — UIT Store

> Mục tiêu: Mỗi section trong sidebar có nội dung thật, dữ liệu kéo từ mock_server, thao tác được (xác nhận đơn, thêm/sửa sản phẩm, xem thống kê…).

---

## Hiện trạng

| Section | Trạng thái |
|---|---|
| Tổng quan (dash) | UI đầy đủ nhưng **toàn bộ data hardcode** (doanh thu, chart, task list) |
| Đơn hàng | ❌ Chỉ có banner "đang xây dựng" |
| Sản phẩm | ❌ Chỉ có banner |
| Khuyến mãi | ❌ Chỉ có banner |
| Phân tích | ❌ Chỉ có banner |
| Tài chính | ❌ Chỉ có banner |
| Bảo mật | ❌ Chỉ có banner |
| Cài đặt | ❌ Chỉ có banner |

---

## Phạm vi — 3 mức ưu tiên

### P0 — Cần thiết để demo luồng bán hàng

#### 1. Section: Đơn hàng (`orders`)

**Mô tả:** Merchant nhìn thấy đơn hàng chứa sản phẩm của mình, xác nhận/từ chối/đánh dấu đã giao.

**Mock server cần thêm:**
```
GET  /api/v1/orders/merchant/orders?merchant_id={id}&status={status}
PUT  /api/v1/orders/merchant/orders/{orderId}/status
```

**UI cần xây:**
- Bảng đơn hàng với cột: Mã đơn · Sản phẩm · Khách hàng · Tổng tiền · Thanh toán · Trạng thái · Thao tác
- Filter tabs: Tất cả / Chờ xác nhận / Đang xử lý / Đang giao / Đã giao / Đã huỷ
- Badge màu theo status (pending=vàng, confirmed=xanh dương, shipped=tím, delivered=xanh lá, cancelled=đỏ)
- Nút **"Xác nhận"** → PUT status = `confirmed`
- Nút **"Đánh dấu đã giao"** → PUT status = `delivered`
- Nút **"Huỷ đơn"** → PUT status = `cancelled` (confirm dialog)
- Click row → mở drawer/modal chi tiết đơn (sản phẩm, địa chỉ, timeline)

**Lưu ý bảo mật (NT219):** Số điện thoại khách hàng hiển thị dạng mask `091****789`, chỉ giải mã khi click "Xem SĐT" (minh hoạ field-level decryption qua Vault).

---

#### 2. Section: Sản phẩm (`products`)

**Mô tả:** Merchant quản lý danh sách sản phẩm của mình.

**Mock server cần thêm:**
```
GET    /api/v1/catalog/merchant/products?merchant_id={id}
POST   /api/v1/catalog/merchant/products
PUT    /api/v1/catalog/merchant/products/{id}
DELETE /api/v1/catalog/merchant/products/{id}
```

**UI cần xây:**
- Bảng sản phẩm: Ảnh · Tên · SKU · Giá · Tồn kho · Đã bán · Trạng thái · Thao tác
- Nút **"Thêm sản phẩm"** → form đầy đủ (tên, giá, SKU, tồn kho, danh mục, mô tả)
- Inline edit giá và tồn kho (click để sửa tại chỗ)
- Nút **"Ẩn/Hiện"** toggle trạng thái active
- Nút **"Xoá"** (confirm dialog)
- Search/filter theo tên, SKU, danh mục

**Lưu ý bảo mật (NT219):** Mỗi thao tác POST/PUT hiển thị dòng log `HMAC-SHA256 signed · req_id=...` ở bottom bar để minh hoạ request signing.

---

#### 3. Section: Tổng quan — nối data thật

**Thay thế hardcode bằng data thật từ mock server:**
- KPI "Đơn hàng" → đếm orders của merchant này
- KPI "Sản phẩm đang bán" → đếm products của merchant
- Bar chart → tổng hợp orders theo ngày (7/30/90 ngày)
- "Cần xử lý ngay" → lấy count orders theo status thật

---

### P1 — Quan trọng cho demo

#### 4. Section: Tài chính (`finance`)

**UI cần xây:**
- Tổng số dư có thể rút
- Bảng giao dịch: Ngày · Mô tả · Loại (thu/chi) · Số tiền · Trạng thái
- Mỗi dòng thu = 1 đơn hàng delivered (trừ 5% phí platform)
- Nút **"Yêu cầu rút tiền"** → confirm dialog hiển thị thông tin ngân hàng

**Lưu ý bảo mật (NT219):** Số tài khoản ngân hàng hiển thị masked `970****1234`, label "Được mã hoá AES-256-GCM trong DB".

---

#### 5. Section: Bảo mật (`security`)

**Đây là section quan trọng nhất cho đồ án NT219.**

**UI cần xây:**
- **API Key management:**
  - Hiển thị key hiện tại (masked `sk_live_••••••••••••••••`)
  - Ngày tạo, ngày rotate gần nhất, ngày hết hạn
  - Nút **"Rotate API Key"** → confirm → hiện key mới 1 lần
  - Timeline lịch sử rotation
- **mTLS Certificate:**
  - Serial number, CN, expiry date
  - Badge "Valid" / "Expiring soon" / "Expired"
  - Nút "Download cert bundle"
- **Audit Log (append-only):**
  - Bảng log: Thời gian · Actor · Action · Resource · IP · Signature
  - Mỗi dòng có field `sig=hmac-sha256(✓)` để minh hoạ integrity
  - Filter theo loại action: login, product_update, order_action, api_key_rotate
- **MFA Status:**
  - Hiện method đang dùng (WebAuthn/TOTP/SMS)
  - Nút "Đổi phương thức MFA"

---

#### 6. Section: Phân tích (`analytics`)

**UI cần xây:**
- Biểu đồ doanh thu theo thời gian (line chart đơn giản bằng SVG/div)
- Top 5 sản phẩm bán chạy (bar chart ngang)
- Tỉ lệ hoàn đơn / hủy đơn
- Nguồn traffic (tìm kiếm, category, direct)
- Tất cả dữ liệu tổng hợp từ mock orders

---

### P2 — Nice-to-have

#### 7. Section: Khuyến mãi (`promo`)

**UI cần xây:**
- Danh sách voucher/mã giảm giá: Code · Giảm % · Điều kiện · Hết hạn · Số lần dùng
- Nút **"Tạo voucher"** → form (code, loại giảm, giá trị, min order, số lượng, hạn dùng)
- Toggle bật/tắt voucher

---

#### 8. Section: Cài đặt (`settings`)

**UI cần xây:**
- Thông tin shop (tên, mô tả, logo placeholder, địa chỉ kho)
- Chính sách vận chuyển (phí, thời gian xử lý)
- Chính sách đổi trả
- Thông báo (email khi có đơn mới, đơn bị huỷ)

---

## Kiến trúc thực hiện

### Cách tổ chức code

```
screens/
  screens-account.jsx        ← hiện có: Login, Register, Account, MerchantScreen
  screens-merchant-orders.jsx   ← MỚI: MerchantOrdersSection
  screens-merchant-products.jsx ← MỚI: MerchantProductsSection
  screens-merchant-finance.jsx  ← MỚI: MerchantFinanceSection
  screens-merchant-security.jsx ← MỚI: MerchantSecuritySection
  screens-merchant-analytics.jsx← MỚI: MerchantAnalyticsSection
```

`MerchantScreen` trong `screens-account.jsx` giữ sidebar + switch section, delegate render sang component con tương ứng.

### Mock server cần thêm (`scripts/mock_server.py`)

```python
# Merchant orders
GET  /api/v1/orders/merchant/orders          → lọc orders theo merchant_id
PUT  /api/v1/orders/merchant/orders/{id}/status → cập nhật status

# Merchant products  
GET  /api/v1/catalog/merchant/products       → products của merchant
POST /api/v1/catalog/merchant/products       → tạo mới
PUT  /api/v1/catalog/merchant/products/{id}  → cập nhật
DELETE /api/v1/catalog/merchant/products/{id}

# Finance
GET  /api/v1/finance/merchant/balance        → số dư
GET  /api/v1/finance/merchant/transactions   → lịch sử giao dịch
POST /api/v1/finance/merchant/withdraw       → yêu cầu rút tiền

# Security / Audit
GET  /api/v1/security/merchant/api-keys      → danh sách API key
POST /api/v1/security/merchant/api-keys/rotate → rotate key
GET  /api/v1/security/merchant/audit-log     → audit log
```

### Cách xác định merchant hiện tại

```js
// Lấy merchant của user đang đăng nhập
const myMerchant = Object.values(window.MERCHANTS)
  .find(m => m.owner_id === user.id || m.code === user.merchantCode);

// Fallback demo: user 'nergy' → m_techworld (owner của iPhone 15)
```

Cần thêm field `owner_id` vào MERCHANTS trong data.js để map user → merchant.

---

## Thứ tự thực hiện đề xuất

```
Bước 1  data.js           — thêm owner_id vào MERCHANTS
Bước 2  mock_server.py    — thêm merchant order endpoints
Bước 3  screens-merchant-orders.jsx   — section Đơn hàng (P0, user vừa cần)
Bước 4  screens-merchant-products.jsx — section Sản phẩm (P0)
Bước 5  MerchantScreen    — nối KPI dashboard với data thật
Bước 6  mock_server.py    — thêm security/finance endpoints  
Bước 7  screens-merchant-security.jsx — section Bảo mật (P1, quan trọng NT219)
Bước 8  screens-merchant-finance.jsx  — section Tài chính (P1)
Bước 9  screens-merchant-analytics.jsx— section Phân tích (P1)
Bước 10 screens-merchant-promo.jsx    — section Khuyến mãi (P2)
Bước 11 screens-merchant-settings.jsx — section Cài đặt (P2)
```

---

## Luồng cần demo được ngay sau Bước 3

1. Khách mua hàng → đặt đơn `UIT-20260529-34EA` (iPhone 15 của TechWorld)
2. Merchant login → vào Kênh người bán → Đơn hàng
3. Thấy đơn status `pending` → click **"Xác nhận"**
4. Đơn chuyển sang `confirmed` → có thể tiếp tục đánh dấu `shipped` → `delivered`
5. Tài chính cập nhật số dư sau khi `delivered`
