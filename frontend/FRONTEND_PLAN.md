# Frontend Completion Plan — UIT Store

## Trạng thái hiện tại
- Screens: home, product, cart, checkout, order, login, register, merchant
- Auth: mock localStorage (demo) + Keycloak ROPC (production)
- API: catalog/cart/order wired, fallback static data khi offline

---

## Nhóm 1 — Bug fixes

- [x] Logout → 404 khi Keycloak chưa chạy
- [x] `window.UitAuth.login()` không tồn tại (đổi thành `loginRedirect`)
- [x] "Kênh người bán" trong Header topbar không clickable → `onNav('merchant')`
- [x] `tabTitle['register']` thiếu → document.title = undefined
- [x] Sau login click tên user → nên vào AccountScreen, không phải MerchantScreen

---

## Nhóm 2 — Màn hình còn thiếu

- [x] **AccountScreen** (`screen === 'account'`)
  - Avatar (chữ cái đầu), tên, email, roles từ JWT
  - Nút "Xem đơn hàng" → `onNav('orders')`
  - Nút "Kênh người bán" (chỉ hiện khi role = admin) → `onNav('merchant')`
  - Nút "Đổi mật khẩu" → redirect Keycloak account console
  - Nút "Đăng xuất"

- [x] **OrdersScreen** (`screen === 'orders'`)
  - Gọi `UitAPI.order.list()` để lấy danh sách
  - Fallback: hiển thị đơn demo khi offline
  - Mỗi row: mã đơn, ngày, tổng tiền, trạng thái badge
  - Click row → xem chi tiết (dùng lại OrderScreen hoặc modal)

- [x] **Banner demo mode**
  - Dải nhỏ màu vàng ở đầu trang khi `apiStatus.catalog === 'error'`
  - Nội dung: "Đang chạy ở chế độ demo — backend chưa kết nối"
  - Có nút X để ẩn

---

## Nhóm 3 — Gắn kết UX

- [x] **CartScreen**: nếu `user === null` → hiện nút "Đăng nhập để thanh toán"
  - Truyền `user` prop vào CartScreen
  - Nút "Đăng nhập" → `onNav('login')`

- [x] **OrderScreen**: thêm link "Xem lịch sử đơn hàng" → `onNav('orders')`

- [x] **Header**: 
  - "Kênh người bán" chỉ hiện khi `user?.roles?.includes('admin')` hoặc chưa login
  - Khi đã login: click tên → `onNav('account')`

- [x] **Floating nav**: thêm `{ id: 'account', label: 'Tài khoản' }` và `{ id: 'orders', label: 'Đơn hàng' }`

---

## Thứ tự thực hiện

1. Nhóm 1 — bugs (không có dependency)
2. AccountScreen (dependency: user object từ JWT)
3. OrdersScreen (dependency: UitAPI.order.list)
4. Banner demo mode (dependency: apiStatus)
5. Nhóm 3 — gắn kết (dependency: các screen mới đã xong)
