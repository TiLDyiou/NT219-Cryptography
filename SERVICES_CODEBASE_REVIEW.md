# Đánh giá (Review) Codebase Services

Tài liệu này đánh giá hiện trạng của các service trong dự án, cách chúng tương tác, mức độ bảo mật thực tế và những rủi ro cần giải quyết trước khi đưa lên môi trường thật (Production). 

## 1. Luồng hoạt động hiện tại (Workflow) giữa các thành phần

Dựa vào mã nguồn (codebase) hiện tại, luồng giao tiếp giữa các service đang diễn ra như sau:
- **Dịch vụ Đặt hàng (order-service) đóng vai trò Orchestrator (bộ điều phối trung tâm)**: Khi có một luồng nghiệp vụ phức tạp yêu cầu nhiều bước, `order-service` sẽ đứng ra gọi trực tiếp qua giao thức HTTP sang các dịch vụ khác (như `inventory-service` ở cổng 8005 và `payment-service` ở cổng 8004). Việc gọi này thông qua thư viện `httpx` tích hợp trong các lớp Adapter (ví dụ: `InventoryHttpClient`).
- **Giao tiếp với bên thứ ba (External Services)**: Các service chuyên biệt sẽ tự gọi API ra các hệ thống bên ngoài để hoàn thành nghiệp vụ (như `payment-service` kết nối với Stripe, `shipping-service` kết nối với Giao Hàng Nhanh, `noti-service` kết nối với Email SMTP).
- **Hệ thống Message Broker (Kafka)**: Hệ thống có khai báo sử dụng Kafka (hệ thống truyền nhận thông điệp trung gian) để phát (publish) các sự kiện (`inventory.events`) và lưu dấu vết kiểm toán (`audit-logs`). Tuy nhiên, luồng giao tiếp để xử lý nghiệp vụ chính vẫn đang phụ thuộc vào việc gọi API HTTP đồng bộ (phải chờ trả kết quả về luôn), chứ chưa dùng Kafka làm kênh giao tiếp chính thức giữa các service.

## 2. Cách các thành phần bảo mật với nhau (Thực tế trong code)

Dù codebase có thiết kế nhiều lớp bảo mật, nhưng cấu hình thực tế hiện tại lại đang mở toang cửa:

- **Bảo mật gọi API nội bộ (Service-to-Service)**: Có mã nguồn để ký các yêu cầu gửi đi bằng thuật toán HMAC (thuật toán dùng mật khẩu chung để sinh ra một chuỗi mã hóa nhằm xác thực người gửi). Yêu cầu này được đính kèm Timestamp (nhãn thời gian) và Nonce (một chuỗi ngẫu nhiên chỉ dùng một lần để chống lại cuộc tấn công phát lại - Replay Attack, tức là kẻ gian copy lại gói tin hợp lệ cũ để gửi lại nhằm đánh lừa hệ thống). `order-service` có đoạn mã tự động tạo và gửi các thông tin này (thông qua `CryptoService`).
- **Rào chắn bảo mật hiện bị "Vô hiệu hóa" (Bypassed)**: Tại sao lại gọi là mở toang cửa? Dù có logic kiểm tra chữ ký ở các service nhận (như `HmacVerificationMiddleware` và `NonceGuardMiddleware` ở `inventory-service`), nhưng các cấu hình mặc định (biến `REQUIRE_INBOUND_HMAC` và `REQUIRE_NONCE_GUARD`) đang được đặt cứng thành `False`. Tại sao đoạn code lại làm vậy? Có thể là để giúp các lập trình viên dev trên máy cá nhân không bị chặn do thiếu khóa bảo mật. Hậu quả là, hiện tại service nhận sẽ **bỏ qua hoàn toàn bước kiểm tra chữ ký**. Bất kỳ ai truy cập vào API nội bộ này đều được hệ thống coi là hợp lệ.
- **Xác thực người dùng "Dựa trên niềm tin" (Trust-based Auth)**: Việc phân quyền (Auth) ở các API phần lớn đang đọc trực tiếp danh tính người dùng từ các HTTP Headers gửi lên (như `X-User-Id`, `X-Merchant-Id` hoặc `Authorization`). Nó hoàn toàn **không** tiến hành giải mã và xác minh chữ ký JWT (chuỗi token tiêu chuẩn để chứng minh danh tính người gửi) hay kiểm tra xem phiên đăng nhập (session) có thật không. Điều này cực kỳ nguy hiểm. Nếu các API này bị lộ (expose) trực tiếp ra ngoài Internet, kẻ xấu chỉ cần gửi một HTTP Request chứa header `X-User-Id: 1` là đã có thể mạo danh một người dùng khác. 

## 3. Những điểm bạn CẦN/PHẢI BIẾT trước khi bắt tay vào code tiếp

Đây là những vấn đề nghiêm trọng đang hiện diện trong codebase mà bạn phải nắm rõ để tránh mất thời gian tìm lỗi (debug) khi phát triển tính năng mới:

### A. Lỗi Runtime chắc chắn sẽ gây sập ở Payment Service
Trong `services/payment-service/app/infrastructure/persistence/repositories/payment_repository.py`, code đang cố gắng lưu các thuộc tính `error_code`, `error_message` và `client_secret` vào đối tượng dữ liệu `PaymentTransactionModel`. Tuy nhiên, trong model khai báo cấu trúc bảng (`payment_transaction.py`), nó lại dùng tên khác là `failure_code`, `failure_message` và hoàn toàn **không hề khai báo cột `client_secret`**. 
- **Tại sao đoạn code lại làm vậy gây lỗi?**: Có thể trong quá trình phát triển, người viết repository và người khai báo database là hai người khác nhau (hoặc cùng một người nhưng quên đồng bộ tên biến).
- **Hậu quả**: Khi một giao dịch thanh toán diễn ra hoặc khi cần cập nhật thông tin thanh toán, hệ thống sẽ văng lỗi `AttributeError` (lỗi gọi thuộc tính không tồn tại) ngay lập tức khiến cho luồng xử lý bị sập hoàn toàn.

### B. Hiệu ứng "Thành công ảo" (Dev Stub On Failure)
Các module dùng để gọi qua lại giữa các service (Adapter) đang bật cờ `dev_stub_on_failure = True`. Tức là nếu `order-service` gọi sang dịch vụ kho (inventory) để giữ hàng và bị lỗi (do rớt mạng hoặc inventory sập), hệ thống sẽ đánh chặn lỗi đó và trả về một kết quả **giả mạo là đã thành công** để luồng code chạy tiếp. 
- **Tại sao đoạn code lại làm vậy?**: Để giúp các lập trình viên có thể test một nhánh chức năng riêng biệt mà không bắt buộc phải bật tất cả các service liên quan lên.
- **Hậu quả**: Nếu lọt lên môi trường thực tế, hệ thống sẽ chốt thành công các đơn hàng "ảo" mà kho không bị trừ và tiền cũng không thu được. 

### C. Cơ chế tự chuyển đổi sang SQLite (SQLite Fallback)
Cờ `ENABLE_SQLITE_FALLBACK` đang mặc định ở giá trị `True`. Nếu cơ sở dữ liệu chính (như PostgreSQL) không thể kết nối ở thời điểm khởi động, code sẽ tự động tạo một file cơ sở dữ liệu SQLite cục bộ (ví dụ: `inventory_service.db`) để lưu trữ tạm thời. 
- **Tại sao đoạn code lại làm vậy?**: Để dễ dàng cho người mới lấy code về chạy (không cần tốn công cài đặt Postgres).
- **Hậu quả**: Dữ liệu sẽ bị phân mảnh, một nửa (khi rớt mạng) nằm trong các file cục bộ rời rạc trên server chạy app, gây bất đồng bộ trầm trọng (Inconsistent Data).

*(Lưu ý: Vấn đề xung đột mã nguồn "Merge Conflict" tại `order-service` từng được đề cập ở đợt review cũ nay đã được sửa dứt điểm, mã nguồn hiện đã có thể khởi chạy và nhập (import) bình thường).*

## 4. Những điểm cần xem lại hoặc mở rộng để đáp ứng chuẩn Production & Bảo mật

Để đem hệ thống ra chạy thực tế với người dùng (Production), bắt buộc phải giải quyết những khoản nợ kỹ thuật sau:

1. **Khắc phục triệt để lỗi cấu trúc dữ liệu ở Payment**: Cần sửa lại `payment_repository.py` hoặc `payment_transaction.py` để đồng nhất tên gọi các trường (`failure_code` so với `error_code`), và bổ sung cột lưu trữ `client_secret`.
2. **Loại bỏ các cấu hình "Nhượng bộ" cho Dev**: Tắt toàn bộ chế độ `dev_stub_on_failure` và `ENABLE_SQLITE_FALLBACK`. Hệ thống ở Production cần áp dụng nguyên tắc Fail-fast (thà báo lỗi ngay lập tức để chặn luồng còn hơn chạy tiếp rồi ghi nhận dữ liệu sai lệch).
3. **Bật rào chắn bảo mật API nội bộ**: Chuyển các cờ `REQUIRE_INBOUND_HMAC` và `REQUIRE_NONCE_GUARD` thành `True` để bắt buộc mọi yêu cầu nội bộ phải được ký mã hóa hợp lệ. Tránh việc một kẻ tấn công lọt vào mạng nội bộ là có thể tùy ý gọi mọi hàm chức năng quan trọng.
4. **Siết chặt lại cơ chế Xác thực (Auth)**:
   - Các API không được trực tiếp tin tưởng HTTP headers dạng văn bản thuần từ phía người dùng gửi lên.
   - Bắt buộc phải có một API Gateway (Cổng giao tiếp tập trung đứng ngoài cùng hứng mọi yêu cầu) đứng trước để kiểm chứng mã xác thực hợp lệ (Giải mã chữ ký từ JWT), sau đó API Gateway mới tự gắn thông tin an toàn đó vào header rồi đẩy xuống các service nội bộ.
5. **Dọn dẹp môi trường (Quản lý Secret)**: Tuyệt đối không được giữ các mã khóa bí mật (như `INTERNAL_API_TOKEN`, `LOCAL_CRYPTO_SECRET`) được gõ thẳng vào trong mã nguồn (Hardcode) hoặc đẩy các file cơ sở dữ liệu (`.db`) lên kho chứa mã nguồn. Các khóa bảo mật phải được chuyển qua cho một hệ thống chuyên quản lý như Vault, và đọc vào ở thời điểm khởi động máy chủ thông qua biến môi trường.
