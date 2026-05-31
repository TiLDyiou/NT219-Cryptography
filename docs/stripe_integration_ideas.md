# Kế hoạch Tích hợp Stripe Sandbox

Tài liệu này ghi lại các ý tưởng và quyết định đã thống nhất giữa chúng ta về việc tích hợp Stripe Sandbox vào hệ thống.

## 1. Môi trường và Hạ tầng
- **Stripe Region**: Singapore
- **API Keys**: Đã có Public Key, Secret Key và Restricted Key.
- **Kiến trúc triển khai** (4 Nodes):
  - **Node 1**: Nginx, Envoy, Keycloak (Auth).
  - **Node 2**: Cart, Catalog, Order, Noti, Shipping services.
  - **Node 3**: Payment service, Vault (lưu trữ Secret Keys).
  - **Node 4**: PostgreSQL, ELK stack.

## 2. Các Ý tưởng Đã Chốt

### 2.1. Quyết định Kỹ thuật
- **Giao tiếp Service**: Áp dụng Cách A. Frontend chỉ giao tiếp với Order Service (Node 2). Order Service sẽ gọi nội bộ sang Payment Service (Node 3).
- **Bảo mật mạng (Firewall & NAT)**: Trong môi trường Sandbox, dùng `stripe listen` chạy trên Node 3 hoặc máy dev để forward webhook vào Payment Service nội bộ.
  - *Lý do chốt*: Không cần mở inbound firewall. Kết nối thông qua websocket của CLI bảo mật, dễ cấu hình và tự động vượt qua NAT.
  - *(Lưu ý: Khi nào dự án chạy thật ở chế độ Production, bạn mới cần cân nhắc chuyển sang dùng Cloudflare Tunnel hoặc Node 1 để hệ thống chạy nền 24/7).*
- **Xác nhận thanh toán**: Sử dụng **Stripe Webhooks** để đảm bảo tính chính xác, không phụ thuộc vào việc Frontend redirect.

### 2.2. Luồng thanh toán chi tiết (Happy Path)
1. User nhấn thanh toán bằng thẻ.
2. Frontend gửi yêu cầu đặt hàng lên Order Service.
3. Order Service kiểm tra sản phẩm, tính tổng tiền và tạo Order (trạng thái `Pending`).
4. Order Service gọi nội bộ sang Payment Service.
5. Payment Service gọi Stripe API tạo Checkout Session, nhận lại `session.url` và trả về cho Order Service.
6. Order Service trả URL đó về cho Frontend.
7. Frontend redirect Buyer sang trang Stripe Checkout.
8. Buyer nhập thông tin thẻ và xác nhận thanh toán.
9. Stripe xử lý trừ tiền thành công.

**Luồng Webhook (Backend):**
10a. Stripe tự động gửi POST request (`checkout.session.completed`) trực tiếp về Payment Service (xuyên qua tường lửa Node 3 do đã được allow IP).
11a. Payment Service verify chữ ký Webhook, lưu log, và gọi lại Order Service cập nhật Order thành `Paid`.

**Luồng Redirect (Frontend):**
10b. Đồng thời, Stripe redirect Buyer về `success_url`.
11b. Frontend hiển thị trang cảm ơn.

### 2.3. Xử lý Hủy đơn & Quá hạn (Unhappy Path)
- **Hủy chủ động (Manual Cancel)**: Nếu user chủ động nhấn hủy giao dịch trên Frontend -> Frontend gọi API hủy của Order Service -> Order Service gọi sang Payment Service -> Payment Service gọi Stripe API để expire Checkout Session tương ứng.
- **Hết hạn (Timeout/TTL)**: Mỗi Order khi được tạo sẽ có **TTL là 30 phút** (khớp với thời gian sống tối thiểu của Stripe Checkout Session `expires_at`). Nếu sau 30 phút không nhận được Webhook thanh toán thành công, Stripe sẽ chặn thanh toán và hệ thống của chúng ta cũng sẽ tự động hủy đơn hàng.

## 3. Các Yếu Tố Kỹ Thuật Cần Bổ Sung

 Dựa trên kinh nghiệm thực tế, ngoài các Secret Key bạn đã nêu, để code chạy trơn tru bạn còn thiếu **4 điểm quan trọng sau**:

1. **Webhook Signing Secret (`whsec_...`)**:
   - Bạn mới có Public/Secret/Restricted Key dùng để *gọi lên* Stripe. 
   - Khi Stripe *gọi ngược về* (Webhook), bạn cần một key khác gọi là Webhook Endpoint Secret (lấy trên Stripe Dashboard sau khi cấu hình URL) để Payment Service xác thực request đó đúng là của Stripe, tránh bị hacker giả mạo Webhook.

2. **Cách truyền dữ liệu Sản phẩm (Line Items)**:
   - Khi tạo Checkout Session, dùng cơ chế `price_data` (truyền thẳng Tên sản phẩm, Giá, Tiền tệ vào request) thay vì tạo sẵn mã `price_id` trên Stripe.
   - *Lý do chốt:* Để tránh phải đồng bộ hóa dữ liệu (giá, tên sản phẩm) giữa DB PostgreSQL (Catalog Service) và hệ thống của Stripe. Stripe chỉ đóng vai trò cổng thanh toán thuần túy.

3. **Gắn thẻ Order ID (Metadata / Client Reference ID)**:
   - Bắt buộc gắn `order_id` của hệ thống vào trường `client_reference_id` hoặc `metadata` khi gọi tạo Checkout Session.
   - *Lý do chốt:* Để Webhook khi trả về có chứa mã này, giúp Payment Service biết được giao dịch thuộc về `order_id` nào trong DB.

4. **Xử lý Trùng lặp (Idempotency)**:
   - **Bước 1 (Payment Service)**: Payment Service sẽ tự check trạng thái trong DB/Redis nội bộ trước để chặn các request thanh toán trùng lặp (ví dụ 1 `order_id` bấm thanh toán 2 lần).
   - **Bước 2 (Stripe)**: Gắn thêm header `Idempotency-Key` (dùng `order_id`) khi gọi API của Stripe. Đây là chốt chặn mạng lưới phòng trường hợp lỗi mạng giữa Payment Service và Stripe gây ra các request retry ngầm.

## 4. Đánh giá Codebase Hiện tại (Review)

Sau khi xem qua mã nguồn của `order-service` và `payment-service`, đây là nhận xét để bạn điều chỉnh code cho khớp với thiết kế đã chốt:

- **Payment Service đang hướng nhầm sang Payment Intents**: Trong `router.py` của `payment-service` có khai báo route `intents.py` (Public Payment Intents lấy `client_secret`). Theo kiến trúc đã chốt, chúng ta dùng **Stripe Checkout** (trả về URL chuyển hướng), không dùng Payment Intents (tự vẽ form thẻ trên Frontend). Bạn nên loại bỏ logic intent này và sửa API nội bộ `/charge` để gọi Stripe Checkout API và trả về URL.
- **Endpoint Webhook chuẩn bảo mật**: File `webhooks.py` đã hứng header `Stripe-Signature` và đưa vào UseCase. Rất tốt, khớp hoàn toàn với yêu cầu ở Phần 3.1.
- **Giao tiếp chiều về bằng Kafka (Rất tốt)**: Codebase hiện tại đã cấu hình Outbox Worker trên `payment-service` và Kafka Consumer trên `order-service`. Như vậy, khi Webhook bắn vào Node 3, UseCase xử lý xong sẽ ghi một Event vào Outbox. Worker đẩy event này lên Kafka để Node 2 lấy về cập nhật trạng thái đơn hàng. Luồng bất đồng bộ (Event-Driven) này xuất sắc và chịu lỗi (fault-tolerant) tốt hơn hẳn so với việc Node 3 gọi HTTP ngược lại Node 2.
