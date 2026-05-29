# Kế hoạch nối dây tất cả nút chức năng — UIT Store Frontend

> Trạng thái: ✅ đã nối · ❌ chưa nối · 🔶 nối một phần

---

## 1. Header (`components/components.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| Logo UIT Store | ✅ `onNav('home')` | — |
| Giỏ hàng (icon + badge) | ✅ `onNav('cart')` | — |
| Đăng ký · Đăng nhập | ✅ `onNav('login')` | — |
| Tên user (khi đã login) | ✅ `onNav('account')` | — |
| Đăng xuất | ✅ `onLogout()` | — |
| Kênh người bán | ✅ `onNav('merchant')` | — |
| **Tìm kiếm** (button) | ❌ không có handler | Thêm prop `onSearch(query)` → App lọc `PRODUCTS` theo `name` |
| Search suggestions (iPhone 15, Tủ lạnh…) | ❌ không có handler | Click → điền vào input + gọi `onSearch(t)` |
| Camera search (icon) | ❌ không có handler | Hiển thị toast "Tìm kiếm bằng ảnh — coming soon" |
| Mic search (icon) | ❌ không có handler | Hiển thị toast "Tìm kiếm bằng giọng nói — coming soon" |
| Thông báo | ❌ không có handler | Hiển thị toast hoặc dropdown thông báo demo |
| Tiếng Việt | ❌ không có handler | Giữ nguyên (UI-only, không ưu tiên) |
| Tải ứng dụng | ❌ không có handler | Giữ nguyên (UI-only) |
| Kết nối | ❌ không có handler | Giữ nguyên (UI-only) |
| Category nav strip (Điện tử, Thời trang…) | ❌ không có handler | Click → `onNav('home', { category: cat })` → HomeScreen lọc theo category |

---

## 2. HomeScreen (`screens/screens-shop.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| ProductCard click | ✅ `onProduct(p.id)` | — |
| **Sidebar danh mục** (Điện tử, Sách…) | ❌ không có handler | Thêm state `activeCategory`; click → lọc `allProducts` |
| **"Khám phá ngay"** (hero banner) | ❌ không có handler | `onNav('product', PRODUCTS[0].id)` hoặc scroll xuống product grid |
| **Filter tabs** (Tất cả / Mới nhất / Bán chạy / Đánh giá cao) | ❌ chỉ style, không có state | Thêm state `sortMode`; sắp xếp `allProducts` theo `sold` / `rating` |

---

## 3. ProductScreen (`screens/screens-shop.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| Breadcrumb "Trang chủ" | ✅ `onNav('home')` | — |
| Color option buttons | ✅ `setSelectedColor(i)` | — |
| Qty − / + | ✅ `setQty(...)` | — |
| "Thêm vào giỏ" | ✅ `onAddToCart(product, qty)` | — |
| "Mua ngay" | ✅ `onBuyNow(product, qty)` | — |
| Related ProductCard click | ✅ `onNav('product', p.id)` | — |
| **"Yêu thích"** | ❌ không có handler | Thêm state `wishlist[]` ở App; toggle icon filled/outline |
| **"Chia sẻ"** | ❌ không có handler | `navigator.share()` hoặc copy URL + toast |
| **"Xem shop"** (merchant card) | ❌ không có handler | `onNav('merchant')` hoặc scroll đến section merchant |
| Thumbnail ảnh nhỏ (0-5) | ❌ không có handler | Thêm state `activeThumb`; highlight ảnh đang chọn |

---

## 4. CartScreen (`screens/screens-checkout.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| "Tiếp tục mua sắm" (giỏ trống) | ✅ `onNav('home')` | — |
| Qty − / + (desktop + mobile) | ✅ `updateQty(...)` | — |
| Remove ✕ item | ✅ `removeItem(...)` | — |
| "Mua hàng" (khi đã login) | ✅ `onNav('checkout')` | — |
| "Đăng nhập để thanh toán" | ✅ `onNav('login')` | — |
| "Đăng ký ngay" link | ✅ `onNav('register')` | — |
| **"Xem shop →"** (merchant row) | ❌ không có handler | `onNav('merchant')` |
| **"Thay đổi →"** (địa chỉ) | ❌ không có handler | Mở modal chọn địa chỉ (scope: demo — có thể là toast "Tính năng sắp ra mắt") |
| Checkbox chọn sản phẩm | 🔶 `defaultChecked` — không có state | Thêm state `selected[]`; tính tổng chỉ từ items được chọn |

---

## 5. CheckoutScreen (`screens/screens-checkout.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| Payment radio (MoMo, VNPay, COD…) | ✅ `setPayment(p.id)` | — |
| "Đặt hàng & Thanh toán" | ✅ `onPay(payment)` | — |
| **"Thay đổi"** (địa chỉ) | ❌ không có handler | Toast "coming soon" hoặc modal địa chỉ |
| **Delivery radio** (Giao nhanh / Tiết kiệm / 2h) | ❌ `defaultChecked` — không có state | Thêm state `delivery`; dùng `price` từ option được chọn để tính phí ship |
| **"Lưu thẻ này"** checkbox | ❌ không có state | Thêm state `saveCard`; log giá trị (demo) |
| Điều khoản dịch vụ link | ❌ không có handler | Giữ nguyên (UI-only) |

---

## 6. ThreeDSModal (`screens/screens-checkout.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| OTP digit inputs | ✅ `setDigit(i, v)` | — |
| "Huỷ" | ✅ `onCancel()` | — |
| "Xác nhận thanh toán" | ✅ `verify()` | — |
| **"Gửi lại"** link | ❌ không có handler | Reset `seconds` = 120, xóa `otp`, toast "Đã gửi lại OTP" |

---

## 7. OrderScreen (`screens/screens-checkout.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| "Tiếp tục mua sắm" | ✅ `onNav('home')` | — |
| "Xem lịch sử đơn hàng" | ✅ `onNav('orders')` | — |

---

## 8. OrdersScreen (`screens/screens-checkout.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| "← Tài khoản" | ✅ `onNav('account')` | — |
| "Bắt đầu mua sắm" (chưa có đơn) | ✅ `onNav('home')` | — |
| **Order row click** | ❌ không có handler | `onNav('order')` với orderId tương ứng — cần thêm prop `onOrderDetail(id)` ở App |

---

## 9. LoginScreen (`screens/screens-account.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| Email + Password inputs | ✅ state | — |
| "Đăng nhập" button | ✅ `handleCredentialsSubmit()` | — |
| "Đăng nhập bằng Passkey (WebAuthn)" | ✅ `loginRedirect()` / `tryWebAuthn()` | — |
| "Đăng ký ngay" link | ✅ `onNav('register')` | — |
| MFA: "Passkey · WebAuthn" option | ✅ `next('mfa-webauthn')` | — |
| MFA: "Authenticator app · TOTP" option | ✅ `next('mfa-totp')` | — |
| MFA: "Bắt đầu xác thực" (WebAuthn) | ✅ `tryWebAuthn()` | — |
| TOTP digit inputs | ✅ `setDigit(i, v)` | — |
| "Xác nhận đăng nhập" (TOTP) | ✅ `handleTotpSubmit()` | — |
| Quay lại buttons | ✅ `next(...)` | — |
| **"SMS OTP"** option | ❌ không có handler | `next('mfa-sms')` + thêm step `mfa-sms` giống `mfa-totp` |
| **"Quên mật khẩu?"** link | ❌ không có handler | `onNav('reset-password')` hoặc redirect Keycloak forgot-password URL |
| **"Dùng mã backup"** link | ❌ không có handler | Toast "Nhập mã recovery từ file đã lưu khi thiết lập MFA" |
| "Ghi nhớ thiết bị này" checkbox | ❌ không có state | Thêm state `rememberDevice`; pass vào `loginWithPassword()` |

---

## 10. RegisterScreen (`screens/screens-account.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| Tất cả inputs (tên, email, mật khẩu) | ✅ state | — |
| Toggle hiển thị mật khẩu (eye icon) | ✅ `setShowPw(!showPw)` | — |
| Password strength bar | ✅ `calcStrength()` | — |
| "Tạo tài khoản" | ✅ `handleSubmit()` | — |
| "Đăng nhập" + "Quay lại đăng nhập" | ✅ `onNav('login')` | — |

---

## 11. AccountScreen (`screens/screens-account.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| "Đơn hàng của tôi" | ✅ `onNav('orders')` | — |
| "Kênh người bán" | ✅ `onNav('merchant')` | — |
| "Đổi mật khẩu / Bảo mật" | ✅ Keycloak account URL | — |
| "Đăng xuất" | ✅ `onLogout()` | — |

---

## 12. MerchantScreen (`screens/screens-account.jsx`)

| Nút / Element | Hiện tại | Cần làm |
|---|---|---|
| "← Về trang mua sắm" | ✅ `onNav('home')` | — |
| **Sidebar menu items** (Đơn hàng, Sản phẩm, Tài chính…) | ❌ chỉ visual `active: true` cố định | Thêm state `activeSection`; render content tương ứng hoặc toast |
| **"Thêm sản phẩm"** | ❌ không có handler | Modal form thêm sản phẩm (demo) hoặc toast |
| **Revenue time filter** (7 ngày / 30 ngày / 90 ngày) | ❌ chỉ style | Thêm state `revPeriod`; thay đổi data bar chart |
| **Task items click** (Đơn chờ xác nhận, Trả hàng…) | ❌ không có handler | `setActiveSection('orders')` hoặc toast |
| **"Xem tất cả →"** (sản phẩm bán chạy) | ❌ không có handler | `setActiveSection('products')` |
| **"Xem chi tiết →"** (bảo mật shop) | ❌ không có handler | `setActiveSection('security')` hoặc modal |

---

## Tóm tắt ưu tiên thực hiện

### P0 — Ảnh hưởng trực tiếp đến luồng mua hàng
1. **HomeScreen filter tabs** — sắp xếp sản phẩm (state `sortMode`)
2. **HomeScreen sidebar categories** — lọc sản phẩm (state `activeCategory`)
3. **CheckoutScreen delivery radio** — cập nhật phí ship theo lựa chọn
4. **Header search** — lọc sản phẩm theo từ khoá (prop `onSearch` ở App)

### P1 — Tính năng phụ quan trọng
5. **OrdersScreen order row click** → detail đơn hàng
6. **ThreeDSModal "Gửi lại"** → reset OTP
7. **ProductScreen "Yêu thích"** → wishlist state ở App
8. **CartScreen checkbox chọn item** → tính tổng theo selected

### P2 — Merchant dashboard
9. **MerchantScreen sidebar** → switch section
10. **Revenue time filter** → thay data chart
11. **Task items click** → navigate section

### P3 — Nice-to-have / UI polish
12. LoginScreen SMS OTP step
13. LoginScreen "Quên mật khẩu?"
14. ProductScreen thumbnail gallery
15. ProductScreen "Chia sẻ" (Web Share API)
16. Header camera / mic search (toast)

---

## Ghi chú kỹ thuật

- **Search**: App cần thêm state `searchQuery`; truyền xuống `HomeScreen` như prop; `HomeScreen` dùng `useMemo` để lọc `PRODUCTS`.
- **Category filter**: App thêm state `activeCategory`; truyền xuống `HomeScreen`; sidebar và header nav strip đều gọi cùng setter.
- **Delivery fee**: `CheckoutScreen` cần state `delivery` (default `'fast'`); giá trị `price` của option được chọn cộng vào `ship`; truyền `deliveryFee` lên `handlePay()` qua callback mới hoặc đọc trong `buildCheckoutPayload`.
- **Wishlist**: Thêm state `wishlist: string[]` ở App; truyền `onToggleWishlist` và `wishlist` xuống `ProductScreen`; icon heart filled khi `wishlist.includes(product.id)`.
