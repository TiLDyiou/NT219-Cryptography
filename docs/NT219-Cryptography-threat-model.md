# Mô hình Mối đe dọa (Threat Model): NT219-Cryptography

## 1. Mô hình Hệ thống & Phạm vi (System Model & Scope)

Báo cáo này đánh giá hệ thống `NT219-Cryptography`, một hệ thống đặt hàng và thương mại điện tử được thiết kế theo dạng vi dịch vụ (microservices - kiến trúc chia nhỏ hệ thống thành các ứng dụng nhỏ độc lập, mỗi ứng dụng chuyên làm một việc, để dễ bảo trì và mở rộng).

### Các thành phần trong phạm vi đánh giá

- **Dịch vụ Đặt hàng (Order Service)**: Đóng vai trò là người điều phối trung tâm. Lý do thiết kế như vậy là để tập trung xử lý logic kinh doanh chính, nó sẽ gọi các dịch vụ khác để hoàn tất một đơn hàng.
- **Dịch vụ Kho (Inventory Service - Cổng 8005)**: Quản lý số lượng hàng hóa trong kho.
- **Dịch vụ Thanh toán (Payment Service - Cổng 8004)**: Xử lý giao dịch thông qua cổng thanh toán Stripe.
- **Dịch vụ Vận chuyển (Shipping Service)**: Kết nối với Giao Hàng Nhanh để lo phần logistic.
- **Dịch vụ Thông báo (Notification Service)**: Gửi email thông qua máy chủ SMTP.
- **Hệ thống Truyền nhận Thông điệp (Message Broker - Kafka)**: Đang được dùng để xử lý các sự kiện kho hàng (`inventory.events`) và ghi lại nhật ký hoạt động (`audit-logs`). Hệ thống dùng Kafka để tách rời việc ghi nhận sự kiện ra khỏi luồng chạy chính, giúp hệ thống không bị chậm lại khi có quá nhiều người dùng cùng lúc.

### Ngoài phạm vi đánh giá

- Hoạt động nội bộ của các bên thứ ba (Stripe, Giao Hàng Nhanh, máy chủ email SMTP).
- Các nền tảng cơ sở hạ tầng bên dưới (Kubernetes, AWS/GCP) trừ phi nó tương tác trực tiếp với mã nguồn.

## 2. Ranh giới Tin cậy, Tài sản và Điểm xâm nhập

### Các Ranh giới Tin cậy (Trust Boundaries)

_Ranh giới tin cậy là ranh giới phân định nơi hệ thống bắt đầu/kết thúc việc tin tưởng dữ liệu được gửi đến. Dữ liệu vượt qua ranh giới này bắt buộc phải được kiểm tra (validate)._

1. **Từ Internet vào API (Bên ngoài - Dự kiến dùng Envoy)**: Hệ thống dự định dùng Envoy làm Cổng giao tiếp (API Gateway) đứng trước. Tại ranh giới này, Envoy sẽ chịu trách nhiệm chính trong việc chặn và xác thực mọi yêu cầu. Hiện tại mã nguồn bên dưới vi dịch vụ đang tin tưởng ngây thơ vào thông tin tự xưng (`X-User-Id`, `X-Merchant-Id`), do đó việc cấu hình Envoy đóng vai trò sống còn để không lọt các yêu cầu giả mạo xuống dưới.
2. **Giao tiếp nội bộ giữa các Dịch vụ (Internal HTTP)**: Chủ yếu do `order-service` điều phối. Hệ thống có cơ chế kiểm tra tính toàn vẹn (HMAC) và chống gửi lại gói tin (Nonce guard) để đảm bảo không ai can thiệp được vào nội dung gửi giữa các máy chủ. Tuy nhiên, các rào chắn này lại bị **tắt hoàn toàn** (`REQUIRE_INBOUND_HMAC=False`, `REQUIRE_NONCE_GUARD=False`). Việc lập trình viên tắt cấu hình này nhằm giúp môi trường dev ở máy cá nhân không bị cản trở bởi các lỗi bảo mật, nhưng quên bật lại.
3. **Từ Dịch vụ gọi ra Bên thứ ba (External egress)**: Các lời gọi API từ hệ thống nội bộ gửi ra Stripe, Giao Hàng Nhanh, và SMTP.
4. **Từ Dịch vụ gửi vào Kafka**: Nội bộ xuất bản và nhận thông điệp sự kiện.

### Tài sản nhạy cảm (Assets)

_Tài sản là những dữ liệu mà hacker nhắm đến, và là thứ chúng ta cần bảo vệ nhất._

- **Độ nhạy cảm rất Cao**: Mã token giao dịch tài chính (`client_secret` của Stripe - Hệ thống áp dụng chính sách No-PAN-Retention, không lưu số thẻ tín dụng thật, giúp giảm thiểu rủi ro rò rỉ thẻ), Danh tính người dùng/người bán, Dữ liệu cá nhân (PII) dùng để giao hàng, và Nhật ký lưu vết hệ thống (Audit logs).
- **Độ nhạy cảm Trung bình**: Số lượng tồn kho, trạng thái của các đơn đặt hàng.

### Điểm xâm nhập (Entry Points)

_Đây là những "cửa" mà kẻ tấn công có thể chui vào._

- Các cổng giao tiếp API (HTTP REST API) của toàn bộ các dịch vụ (bị phơi ra cho người dùng và các hệ thống khác).
- Các luồng lắng nghe thông điệp từ Kafka.

## 3. Khả năng của Kẻ tấn công (Attacker Capabilities)

- **Kẻ tấn công từ bên ngoài (External Attacker)**: Có thể gửi các yêu cầu tự chế (arbitrary HTTP requests) tới bất kỳ cổng API nào bị phơi ra Internet. Đặc biệt, chúng có thể chỉnh sửa tự do các thông tin nhận diện đính kèm (HTTP headers).
- **Kẻ tấn công lọt vào mạng nội bộ (Internal/Compromised Service Attacker)**: Nếu một dịch vụ bất kỳ bị chiếm quyền, kẻ gian có thể tự do đi lang thang và chọc phá các dịch vụ khác (Lateral movement) bởi vì các hàng rào kiểm tra chữ ký (HMAC) nội bộ đã bị vô hiệu hóa.

## 4. Phân tích Các Mối đe dọa (Threats as Abuse Paths)

### T1. Giả mạo danh tính và Leo thang đặc quyền do tin tưởng mù quáng (Nghiêm trọng - Critical)

- **Kịch bản**: Hacker ở bên ngoài gửi một yêu cầu HTTP tới API và cố tình tự chèn thêm đoạn văn bản nhận diện `X-User-Id: <id_của_người_khác>` vào dữ liệu gửi đi.
- **Tác động (Impact)**: **Cao**. Hệ thống có sự phân quyền (RBAC) rõ ràng. Kẻ tấn công hoàn toàn có thể leo thang đặc quyền (Privilege Escalation), giả mạo làm Người bán hàng (Merchant) để thay đổi hàng tồn kho, hoặc mạo danh người khác để đánh cắp thông tin, đặt đơn hàng giả.
- **Khả năng xảy ra (Likelihood)**: **Cao**. Hệ thống đang bỏ qua việc kiểm tra tính xác thực (không giải mã JWT - chuỗi mã chứng minh thân phận được cấp khi đăng nhập). Đoạn code hiện tại tin tưởng 100% vào những gì người gửi khai báo ở dạng văn bản (text), nên bất kỳ ai cũng có thể dễ dàng thay đổi ID của mình thành ID người khác.
- **Tài sản bị đe dọa**: Toàn bộ dữ liệu người dùng, thông tin tài chính và sự minh bạch của hệ thống.

### T2. Tấn công từ bên trong do tắt rào chắn nội bộ (Cao - High)

- **Kịch bản**: Hacker bằng cách nào đó lọt được vào mạng nội bộ (qua một lỗ hổng ứng dụng khác hoặc chiếm được một máy chủ chứa code) và gọi thẳng vào các dịch vụ quan trọng (Kho hàng, Thanh toán).
- **Tác động (Impact)**: **Cao**. Chúng có thể đi đường tắt, vòng qua dịch vụ kiểm duyệt trung tâm `order-service`, để tự ý tăng khống hàng tồn, tạo giao dịch thanh toán ảo hoặc đánh cắp dữ liệu.
- **Khả năng xảy ra (Likelihood)**: **Cao**. Bởi vì lập trình viên đã cấu hình tắt rào chắn bảo mật (`REQUIRE_INBOUND_HMAC=False` và `REQUIRE_NONCE_GUARD=False`) nhằm tiện cho việc viết code cục bộ, điều này khiến cho mọi yêu cầu nội bộ đều mặc định là hợp lệ mà không hề phải trải qua bước kiểm tra chữ ký an toàn.
- **Tài sản bị đe dọa**: Trạng thái cơ sở dữ liệu, tính toàn vẹn của cả hệ thống.

### T3. Hệ thống bị sập (DoS) ở dịch vụ Thanh toán (Trung bình - Medium)

- **Kịch bản**: Hacker hoặc một người dùng vô tình kích hoạt một lỗi thanh toán (chẳng hạn như nhập sai thẻ).
- **Tác động (Impact)**: **Trung bình**. File mã nguồn `payment_repository.py` đang cố lưu một trường dữ liệu có tên là `client_secret` (vốn không hề được tạo trong bảng dữ liệu database), và đồng thời sai lệch tên biến (`error_code` so với `failure_code`). Đoạn code làm vậy vì quá trình làm việc rời rạc, không đồng bộ kỹ càng giữa người viết logic (nhằm lưu trữ đủ các biến trả về từ dịch vụ bên thứ 3) và người xây dựng cấu trúc database, dẫn đến mỗi khi có giao dịch lỗi, chương trình sẽ không lưu được vào cơ sở dữ liệu và bị sập.
- **Khả năng xảy ra (Likelihood)**: **Cao** (Chắc chắn 100% khi có giao dịch thất bại).
- **Tài sản bị đe dọa**: Độ ổn định và khả năng phục vụ thanh toán (Hệ thống sẽ bị kẹt luồng và không thể ghi nhận thanh toán).

### T4. Đơn hàng "Bóng Ma" vì tính năng tiện lợi cho lập trình viên (Cao - High)

- **Kịch bản**: Dịch vụ kho hàng bị lỗi hoặc mất mạng trong lúc khách đang thanh toán đơn hàng.
- **Tác động (Impact)**: **Cao**. Do cờ cấu hình `dev_stub_on_failure = True` đang được bật, khi dịch vụ bị lỗi kết nối, đoạn code sẽ đánh chặn cái lỗi đó lại và giả mạo một kết quả "Thành công ảo" để chương trình tiếp tục chạy. Lập trình viên viết vậy để dễ dàng test nhánh đặt hàng mà không phải tốn công dựng hệ thống kho lên, nhưng lại đẩy rủi ro ra hệ thống thật: Đơn hàng sẽ báo với khách là đã xong nhưng kho không trừ hàng, hệ thống cũng không ghi nhận, dẫn đến các sai lệch lớn về tiền bạc.
- **Khả năng xảy ra (Likelihood)**: **Trung bình**. Tuy chỉ xảy ra khi hệ thống bị trục trặc nền tảng, nhưng vì cách code thiết kế đang cố che giấu lỗi thay vì ngăn chặn nó ngay lập tức (fail open thay vì fail secure), rủi ro này vẫn mang tính phá hoại cao.
- **Tài sản bị đe dọa**: Quản trị tài chính, Trạng thái chuẩn xác của kho hàng.

## 5. Giải pháp Khắc phục & Đề xuất (Mitigations & Recommendations)

### Các giải pháp cần làm ngay

1. **Cấu hình Envoy API Gateway & Kiểm chứng mã JWT để chặn giả mạo (T1)**:
   - Cấu hình chặt chẽ Envoy đứng chặn đầu để tiếp nhận mọi yêu cầu. Envoy bắt buộc phải kiểm chứng tính hợp lệ của chuỗi mã danh tính (JWT signatures) để đảm bảo không ai giả danh ai được. Mục đích là để thiết lập một "bảo vệ trạm gác" - các dịch vụ bên trong chỉ cần tin bảo vệ trạm gác này, thay vì phải tự xác minh từng người khách một cách ngây thơ qua những trường văn bản.
2. **Bật lại cấu hình Bảo mật Giao tiếp Nội bộ (T2)**:
   - Sửa các cờ cấu hình `REQUIRE_INBOUND_HMAC=True` và `REQUIRE_NONCE_GUARD=True` ở tất cả các môi trường (chỉ trừ môi trường viết code trên máy cá nhân). Việc này bắt buộc mọi dịch vụ phải "đeo bảng tên có chữ ký số" khi nói chuyện với nhau, nhờ đó kẻ tấn công có lọt vào mạng cũng không thể bịa ra thông điệp hợp lệ.
3. **Sửa lỗi sai cấu trúc Database ở Thanh toán (T3)**:
   - Đồng bộ tên biến trong file code và file khai báo database (`error_code` cần sửa thành `failure_code`), đồng thời thêm cột `client_secret` vào cơ sở dữ liệu để chương trình không bị gọi thiếu trường dữ liệu và văng lỗi nữa.
4. **Tắt bỏ các cấu hình "Nhượng bộ" cho Dev ở môi trường thực tế (T4)**:
   - Đặt cờ `dev_stub_on_failure = False`. Hệ thống cần nguyên tắc "Chết sớm còn hơn sống sai" (Fail-fast - phát hiện sai thì chặn luồng chạy lại ngay lập tức): Thà báo lỗi để khóa đơn hàng, còn hơn âm thầm chạy tiếp tạo ra dữ liệu ma.
   - Tắt cơ chế `ENABLE_SQLITE_FALLBACK=False` (Tự động lùi về lưu vào một file tạm) để tránh việc cứ hễ mất mạng là một phần dữ liệu lại bị rơi rớt trong máy cục bộ làm phân mảnh toàn hệ thống.
5. **Dọn dẹp Khóa bảo mật (Secrets Management)**:
   - Tuyệt đối không viết thẳng mật khẩu hay mã bảo mật (như `INTERNAL_API_TOKEN`) vào trong văn bản mã nguồn. Code làm vậy vì lúc lập trình thì dùng biến có sẵn gõ thẳng vào sẽ nhanh hơn rất nhiều, nhưng nếu lọt source code là mất sạch quyền kiểm soát hệ thống. Thay vào đó, máy chủ khi khởi chạy phải tự động đọc biến bảo mật (biến môi trường) hoặc lấy qua Vault.

## 6. Thông tin Kiến trúc đã được Xác nhận (Confirmed Context)

Dựa trên xác nhận từ đội ngũ phát triển, mô hình này được chốt với các tiêu chuẩn sau:

1. **API Gateway**: Sử dụng **Envoy** làm cổng chặn đầu và điều hướng giao thông. Mọi yêu cầu xác thực JWT bắt buộc phải diễn ra tại Envoy.
2. **Quản lý Quyền truy cập (RBAC)**: Có phân định rạch ròi giữa Standard Users (Người dùng thường) và Merchants (Người bán), do đó việc ngăn chặn leo thang đặc quyền từ mức người dùng lên người bán (như rủi ro T1) là ưu tiên cực kỳ quan trọng.
3. **Dữ liệu Thanh toán**: Hệ thống tuân thủ **No-PAN-Retention** (Không lưu giữ số thẻ thanh toán chính/Credit Card thật của khách hàng), chỉ làm việc với mã token/secret của Stripe. Điều này giúp loại bỏ rủi ro rò rỉ dữ liệu thẻ thanh toán nếu cơ sở dữ liệu bị tấn công.
