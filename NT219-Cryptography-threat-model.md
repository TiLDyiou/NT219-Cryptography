# Báo Cáo Mô Hình Đe Dọa Bảo Mật (Threat Model) - Hệ Thống NT219-Cryptography

_Tham chiếu theo chuẩn bảo mật OWASP Top 10 (2025) Mới Nhất_

Tài liệu này cung cấp cái nhìn chi tiết và toàn diện về các rủi ro bảo mật tồn tại trong mã nguồn (codebase) của cả phần Backend (7 dịch vụ) và Frontend. Đánh giá này KHÔNG bao gồm cấu hình môi trường, mà tập trung hoàn toàn vào lỗi kiến trúc, lỗi logic và lỗ hổng mã nguồn.

Tài liệu được cấu trúc mạch lạc, đính kèm giải thích thuật ngữ chuyên ngành để dễ dàng trích xuất thông tin đưa vào **Slide thuyết trình**.

---

## TỔNG QUAN HỆ THỐNG VÀ TÀI SẢN (ASSETS & BOUNDARIES)

1. **Thành phần chính:**
   - 7 dịch vụ Backend nhỏ (Microservices): `order`, `inventory`, `payment`, `shipping`, `catalog`, `noti`, `cart`.
   - Frontend: Giao diện web viết bằng JavaScript (`React/Vanilla`).
2. **Ranh giới niềm tin (Trust Boundaries):**
   - Hệ thống tin tưởng tuyệt đối vào các dữ liệu đầu vào nội bộ và các trường thông tin ẩn mà không qua kiểm duyệt chặt chẽ.
3. **Tài sản giá trị cao (Assets):**
   - Thông tin thanh toán và trạng thái đơn hàng.
   - Tài khoản người dùng, Quyền Quản trị viên (Admin) và Người bán (Merchant).
   - Mã thông báo bảo mật, chìa khóa API.

---

## CÁC RỦI RO CHI TIẾT THEO CHUẨN OWASP TOP 10 (2025)

### 1. A07:2025 - Authentication Failures (Lỗi Xác Thực)

_Lỗ hổng cho phép kẻ tấn công mạo danh người khác do việc kiểm tra danh tính lỏng lẻo._

- **Rủi ro 1.1: Niềm tin mù quáng vào Header mà không có Gateway bảo vệ (CRITICAL)**
  - **Lý do xảy ra:** Các dịch vụ như `order`, `cart`, `payment`, `shipping` đọc thẳng danh tính người dùng từ các **Header** _(Tiêu đề: Phần dữ liệu đính kèm ở đầu các yêu cầu mạng, chứa thông tin phụ cho máy chủ)_ như `X-User-Id` hay `X-Admin-Id`. Việc này vốn dĩ yêu cầu một **API Gateway** _(Cổng giao tiếp tổng: chặn và xác minh người dùng từ ngoài internet)_ đứng trước để làm màng lọc, nhưng Gateway này không tồn tại hoặc không được cấu hình chặn đúng mức.
  - **Hậu quả:** Kẻ tấn công dùng các công cụ đơn giản (như Postman) gửi một Header tự chế là có thể hóa thân thành Admin hoặc bất kỳ người dùng nào.
- **Rủi ro 1.2: Mã thông báo JWT chỉ được dịch ra mà không kiểm tra tính hợp lệ (CRITICAL)**
  - **Lý do xảy ra:** Hàm `_decode_jwt_sub` trong toàn bộ hệ thống (trừ dịch vụ `catalog`) chỉ thực hiện **Base64-decode** _(Dịch chuỗi dữ liệu: Chuyển dữ liệu mã hóa về dạng văn bản bình thường, không mang tính bảo mật)_ để lấy danh tính, mà KHÔNG tiến hành **Xác minh chữ ký - Signature Verification** _(Thuật toán kiểm tra xem dữ liệu có bị giả mạo hay không)_.
  - **Hậu quả:** Bất kỳ ai cũng có thể tự tạo ra một thẻ **JWT** _(JSON Web Token: Một định dạng chuỗi an toàn dùng làm thẻ ra vào hệ thống)_ giả mạo hoàn toàn để qua mặt hệ thống.

### 2. A01:2025 - Broken Access Control (Lỗi Kiểm Soát Truy Cập)

_Người dùng có thể làm những việc hoặc truy cập vào những dữ liệu mà lẽ ra họ không được phép._

- **Rủi ro 2.1: Giao diện Quản trị viên (Admin API) vắng bóng lớp bảo vệ (CRITICAL)**
  - **Lý do xảy ra:** Mã nguồn tại API quyết toán thanh toán (`/admin/settlements`) của dịch vụ `payment` và tạo mẫu email của dịch vụ `noti` hoàn toàn không có đoạn code nào kiểm tra quyền hay kiểm tra thẻ JWT.
  - **Hậu quả:** Bất kỳ ai lọt qua được lớp cổng ngoài cùng đều có thể tự do bấm nút "đã chi trả tiền" cho cửa hàng, gây thiệt hại tài chính.
- **Rủi ro 2.2: Lỗ hổng thao túng trạng thái đơn vị vận chuyển qua Webhook giả (CRITICAL)**
  - **Lý do xảy ra:** Dịch vụ `shipping` chứa một đường dẫn nhận **Webhook** _(Cú điện thoại tự động: Hệ thống A tự động gọi báo cho hệ thống B khi có sự kiện xảy ra)_ dành cho việc thử nghiệm (Mock) không có cơ chế xác thực.
  - **Hậu quả:** Đối thủ có thể gửi một gói dữ liệu giả mạo nhằm thay đổi trạng thái giao hàng của bất kỳ đơn vị nào.

### 3. A06:2025 - Insecure Design (Thiết Kế Không An Toàn)

_Những lỗ hổng xuất phát từ ngay bản thiết kế kiến trúc và luồng logic của ứng dụng, không phải do code sai cú pháp._

- **Rủi ro 3.1: "Đua lệnh" (Race Condition) dẫn đến việc tính tiền hai lần (CRITICAL)**
  - **Lý do xảy ra:** Mã nguồn phần thu tiền không cấu hình ràng buộc "Độc nhất" (UNIQUE) cho mã đơn hàng trong cơ sở dữ liệu.
  - **Hậu quả:** Gây ra lỗi **Race Condition** _(Đua lệnh: Hiện tượng nhiều luồng chương trình cùng tranh giành chạy vào một dòng dữ liệu, gây sai lệch kết quả)_. Một đơn hàng có thể tạo ra nhiều phiên thanh toán cùng lúc, khiến khách hàng bị trừ tiền nhiều lần.
- **Rủi ro 3.2: Ghi nhận sự kiện trước khi xử lý logic (CRITICAL)**
  - **Lý do xảy ra:** Trong `payment-service`, Webhook báo cáo việc thu tiền thành công được lưu ngay lập tức vào cơ sở dữ liệu trước khi hệ thống thực sự trừ tiền. Nếu lúc trừ tiền xảy ra lỗi, hệ thống đánh dấu "sự kiện này đã xử lý" và không bao giờ thử lại.
  - **Hậu quả:** Đơn hàng bị kẹt ở trạng thái chưa thanh toán, mặc dù tiền của khách hàng đã bị trừ thật.
- **Rủi ro 3.3: Lỗ hổng tính toán giá tiền từ Client (CRITICAL)**
  - **Lý do xảy ra:** Trong dịch vụ `cart`, khi người dùng thêm đồ vào giỏ, hệ thống tin tưởng hoàn toàn vào mức giá (`unit_price`) do phía Frontend gửi lên thay vì dò lại giá chuẩn trong cơ sở dữ liệu.
  - **Hậu quả:** Kẻ xấu chặn gói tin và sửa giá món hàng trị giá hàng triệu đồng về 0 đồng.
- **Rủi ro 3.4: Lỗi quy đổi tiền tệ làm hoàn tiền sai số lượng (CRITICAL)**
  - **Lý do xảy ra:** Với các loại tiền tệ không có số lẻ thập phân (ví dụ VNĐ), hệ thống lại cứng nhắc nhân số tiền lên 100 lần khi xử lý hàm Refund (hoàn tiền) theo kiểu tiền Đô-la (có số Cent lẻ).
  - **Hậu quả:** Hoàn trả 50.000 VNĐ sẽ biến thành hoàn trả 5.000.000 VNĐ.

### 4. A05:2025 - Injection (Lỗi Chèn Mã)

_Kẻ tấn công gửi dữ liệu độc hại để lừa hệ thống thực thi những lệnh không mong muốn._

- **Rủi ro 4.1: Chèn mã thực thi qua mẫu Email - SSTI (CRITICAL)**
  - **Lý do xảy ra:** Hệ thống thông báo (`noti-service`) cho phép truyền nội dung văn bản tự do vào mẫu HTML qua hàm `upsert_template` mà không qua môi trường cô lập (`SandboxedEnvironment`).
  - **Hậu quả:** Tạo ra lỗ hổng **SSTI** _(Server-Side Template Injection: Lỗi cho phép kẻ gian chèn lệnh độc hại vào mẫu giao diện)_. Kẻ tấn công có thể nâng cấp thành **RCE** _(Remote Code Execution: Chiếm quyền chạy lệnh và điều khiển từ xa)_ trên máy chủ chứa hệ thống gửi mail.
- **Rủi ro 4.2: Rò rỉ Token qua lỗ hổng trên trình duyệt (HIGH)**
  - **Lý do xảy ra:** Trong file `frontend/auth.js`, các thẻ JWT xác thực được lưu vào **SessionStorage** _(Bộ nhớ tạm: Nơi lưu trữ dữ liệu của trình duyệt, dễ bị đánh cắp bằng mã độc)_. Giao diện lại thiếu bộ lọc mã độc (Autoescape) khi hiển thị dữ liệu người dùng.
  - **Hậu quả:** Kẻ xấu có thể tận dụng **XSS** _(Cross-Site Scripting: Lỗi chèn mã độc vào trình duyệt người dùng)_ để đọc SessionStorage và cướp toàn bộ phiên đăng nhập của nạn nhân.

### 5. A10:2025 - Mishandling of Exceptional Conditions (Xử Lý Tình Huống Ngoại Lệ Kém) - MỚI

_Nhóm rủi ro mới trong bản 2025, liên quan đến việc rò rỉ dữ liệu qua thông báo lỗi hoặc hệ thống xử lý dự phòng không an toàn khi gặp sự cố._

- **Rủi ro 5.1: "Âm thầm dự phòng" (Silent Fallback) làm vô hiệu hóa bảo mật (CRITICAL)**
  - **Lý do xảy ra:** Khi hệ thống quản lý chìa khóa mã hóa là **Vault** _(Két sắt chuyên dụng)_ hoặc nền tảng lưu trữ bộ nhớ như **Redis**, **Kafka** bị ngắt kết nối tạm thời do ngoại lệ (Exception), hệ thống không báo lỗi và dừng lại (**Fail-fast**) mà tự động lùi về sử dụng khóa cứng thử nghiệm hoặc lưu vào RAM cực kỳ lỏng lẻo.
  - **Hậu quả:** Các thông báo giả được ký bởi chìa khóa thử nghiệm sẽ lọt qua tất cả hàng rào bảo mật. Các giao dịch gửi đến bị mất tính đồng bộ trên nhiều máy chủ, gây sụp đổ hệ thống phòng thủ.
- **Rủi ro 5.2: Thông báo lỗi (Error Messages) rò rỉ thông tin hệ thống ra bên ngoài (MEDIUM)**
  - **Lý do xảy ra:** Trong API xử lý Webhook của dịch vụ `payment` (`webhooks.py`), mã nguồn trả thẳng giá trị lỗi bằng chuỗi `str(e)` ra cho người dùng khi xảy ra ngoại lệ.
  - **Hậu quả:** Làm rò rỉ các thông tin về cấu trúc mã nguồn, đường dẫn nội bộ, hoặc tên hàm ra bên ngoài (Information Leakage), tạo điều kiện cho hacker thu thập thông tin để tấn công sâu hơn.

---

## ĐÁNH GIÁ NĂNG LỰC CỦA KẺ TẤN CÔNG (ATTACKER CAPABILITIES)

Dựa trên thiết kế hiện tại, một kẻ tấn công với hiểu biết kỹ thuật trung bình có thể dễ dàng khai thác hệ thống thông qua các đường tấn công sau:

1. **Năng lực giả mạo (Authentication Bypass):** Do sự vắng bóng của khâu kiểm chứng Chữ ký (Signature) tại phần Header, kẻ tấn công có thể qua mặt quyền quản trị (Admin) chỉ bằng công cụ gửi lệnh HTTP cơ bản.
2. **Năng lực thao túng tài chính (Financial Fraud):** Lợi dụng lỗ hổng thiết kế (Insecure Design) tại hệ thống tính tiền giỏ hàng (Cart) và cuộc đua lệnh (Race condition) tại thanh toán (Payment).
3. **Năng lực chiếm quyền kiểm soát (System Take-over):** Thông qua lỗi chèn mẫu (SSTI) vào hệ thống tạo thông báo email (Noti), chiếm quyền điều khiển server (RCE).

---

## KHUYẾN NGHỊ VÀ BIỆN PHÁP GIẢM THIỂU (MITIGATIONS)

Để hệ thống đáp ứng các tiêu chuẩn phòng thủ OWASP 2025, cần ngay lập tức áp dụng các biện pháp sau:

1. **Khắc phục Xác thực Danh Tính (Khẩn cấp):** Bắt buộc các dịch vụ phải tự dịch và kiểm tra tính hợp lệ (Verify) chữ ký của thẻ JWT, KHÔNG được tin tưởng vào Header nếu không có chứng nhận hợp lệ từ nguồn đáng tin cậy.
2. **Loại bỏ việc tin tưởng Client (Zero Trust):** Sửa lại luồng giỏ hàng (Cart). Giỏ hàng chỉ được phép gửi mã sản phẩm (ID). Máy chủ phải tự tính giá trực tiếp từ cơ sở dữ liệu Sản phẩm (Catalog).
3. **Xử lý triệt để logic Tiền bạc:** Áp dụng ràng buộc duy nhất (UNIQUE) vào cột `order_id` trong DB thanh toán để ngăn chặn "đua lệnh". Không sử dụng kiểu dữ liệu số nguyên (Integer) cứng nhắc để lưu tiền tệ quốc tế hóa.
4. **Xử lý Ngoại lệ An toàn (Khắc phục A10:2025):** Buộc hệ thống tuân thủ **Fail-Fast**; nếu Vault hoặc Redis mất kết nối ở môi trường thật, hệ thống phải ngưng hoạt động (Crash) và cảnh báo thay vì lén lút tụt về cấu hình thử nghiệm. Tuyệt đối không in nguyên chuỗi lỗi nội bộ (`Exception stacktrace`) ra HTTP Response cho người dùng bên ngoài.
5. **Cấu hình môi trường an toàn (Security by Design):** Sử dụng `SandboxedEnvironment` cho hệ thống render email (Noti). Ngừng sử dụng `SessionStorage` tại Frontend và chuyển qua `HttpOnly Cookies` để bảo vệ mã token khỏi các cuộc tấn công đánh cắp phiên XSS.
