**TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN, ĐHQG-HCM**

**KHOA MẠNG MÁY TÍNH VÀ TRUYỀN THÔNG**

![](data:image/png;base64...)

**BÁO CÁO ĐỒ ÁN MÔN HỌC**

**THIẾT KẾ VÀ ĐÁNH GIÁ AN TOÀN MẬT MÃ CHO NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ DẠNG MICROSERVICES**

**Application Scenarios: Online Shopping Service Platform**

**Môn học:** NT219.Q22.ANTT - Mật mã học

**Giảng viên hướng dẫn:** TS. Nguyễn Ngọc Tự

**Sinh viên thực hiện:**

1. Nguyễn Mạnh Cường - 24520238
2. Nguyễn Đức Đại - 24520245

LỜI CẢM ƠN

Lời đầu tiên, nhóm thực hiện xin được bày tỏ lòng biết ơn sâu sắc đến TS. Nguyễn Ngọc Tự, giảng viên trực tiếp hướng dẫn đồ án môn học NT219 - Mật mã học ứng dụng. Trong suốt quá trình thực hiện đề tài, thầy đã luôn tận tâm định hướng, đặt ra những câu hỏi gợi mở giúp nhóm nhìn nhận vấn đề một cách hệ thống hơn, đồng thời thẳng thắn chỉ ra những thiếu sót để nhóm kịp thời điều chỉnh. Những góp ý quý báu của thầy không chỉ giúp đề tài hoàn thiện về mặt nội dung mà còn rèn cho chúng em tư duy phản biện, tinh thần cẩn trọng và thái độ làm việc nghiêm túc - những điều mà chúng em tin rằng sẽ còn theo mình rất lâu sau khi đồ án này khép lại.

Chúng em cũng xin gửi lời cảm ơn chân thành đến quý thầy, cô Khoa Mạng máy tính và Truyền thông, cùng toàn thể giảng viên Trường Đại học Công nghệ Thông tin – Đại học Quốc gia Thành phố Hồ Chí Minh. Những kiến thức nền tảng về an toàn thông tin, mật mã học, hệ phân tán và kiến trúc hệ thống mà quý thầy, cô đã truyền đạt qua từng học phần chính là hành trang để nhóm có thể bắt tay vào một đề tài mang tính tích hợp và thực nghiệm như thế này. Nhà trường cũng đã tạo điều kiện về môi trường học thuật và tài nguyên để nhóm có thể triển khai, thử nghiệm và đánh giá hệ thống trong điều kiện gần với thực tế nhất.

Cuối cùng, nhóm xin dành lời tri ân đến gia đình - những người đã luôn ở phía sau, tạo mọi điều kiện thuận lợi và là chỗ dựa vững chắc cho chúng em trong suốt quá trình học tập.

Do giới hạn về thời gian, kiến thức và kinh nghiệm thực tiễn, đồ án chắc chắn không tránh khỏi những thiếu sót. Nhóm thực hiện rất mong tiếp tục nhận được sự chỉ bảo, góp ý từ quý Thầy, Cô và các bạn để đề tài được hoàn thiện hơn nữa.

Nhóm xin chân thành cảm ơn!

*TP. Hồ Chí Minh, tháng 6 năm 2026*

*Nguyễn Đức Đại và Nguyễn Mạnh Cường*

#

# MỤC LỤC

[MỤC LỤC 3](#_Toc232945217)

[DANH MỤC HÌNH 5](#_Toc232945218)

[DANH MỤC BẢNG 7](#_Toc232945219)

[DANH MỤC TỪ VIẾT TẮT 9](#_Toc232945220)

[TÓM TẮT 13](#_Toc232945221)

[Chương 1. MỞ ĐẦU 14](#_Toc232945222)

[1.1. Lý do chọn đề tài 14](#_Toc232945223)

[1.2. Mục tiêu của đề tài 15](#_Toc232945224)

[1.3. Đối tượng và phạm vi nghiên cứu 16](#_Toc232945225)

[1.4. Câu hỏi nghiên cứu và giả thuyết 16](#_Toc232945226)

[1.5. Phương pháp thực hiện 17](#_Toc232945227)

[1.6. Bố cục báo cáo 17](#_Toc232945228)

[Chương 2. TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT 17](#_Toc232945229)

[2.1. Tổng quan bài toán bảo mật thương mại điện tử 17](#_Toc232945230)

[2.2. Kiến trúc Microservices và đánh đổi bảo mật 18](#_Toc232945231)

[2.3. Cơ sở lý thuyết mật mã 19](#_Toc232945232)

[2.3.1. Mật mã đối xứng và AEAD - AES-256-GCM. 19](#_Toc232945233)

[2.3.2. Hàm băm và mã xác thực thông điệp SHA-256, HMAC... 20](#_Toc232945234)

[2.3.3. Mật mã khóa công khai và chữ ký số RSA, ECDSA.. 21](#_Toc232945235)

[2.3.4. JWT token và mô hình tin cậy. 21](#_Toc232945236)

[2.3.5. Giao thức truyền tải an toàn TLS1.3. 22](#_Toc232945237)

[2.3.6. Xác thực ủy quyền OAuth 2.0, OIDC, PKCE, MFA 22](#_Toc232945238)

[2.3.7. Quản lý khóa KMS, HSM và Envelope Encryption 22](#_Toc232945239)

[2.3.8. Bảo vệ dữ liệu thanh toán - PSP Tokenization 23](#_Toc232945240)

[2.4. Mô hình hóa mối đe dọa và tiêu chuẩn đánh giá 23](#_Toc232945241)

[2.5. Các công trình liên quan, khoảng trống và đóng góp 23](#_Toc232945242)

[Chương 3. THIẾT KẾ HỆ THỐNG VÀ CÁC CƠ CHẾ MẬT MÃ 24](#_Toc232945243)

[3.1. Kiến trúc tổng thể 24](#_Toc232945244)

[3.1.1. Stack công nghệ và lý do lựa chọn 25](#_Toc232945245)

[3.2. Trust Boundaries và Data Flow 26](#_Toc232945246)

[3.3. Triển khai các cơ chế mật mã 27](#_Toc232945247)

[3.4. Checkout Flow - Saga Pattern 28](#_Toc232945248)

[3.5. Phân tích STRIDE threat model 28](#_Toc232945249)

[Chương 4. THỰC NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ 29](#_Toc232945250)

[4.1. Môi trường và phương pháp thực nghiệm 29](#_Toc232945251)

[4.2. Rà soát mã nguồn và lỗ hổng phát hiện 29](#_Toc232945252)

[4.3. Kết quả 5 nhóm security experiments 29](#_Toc232945253)

[4.4. Static analysis và pentest 30](#_Toc232945254)

[4.5. Hiệu năng mật mã 30](#_Toc232945255)

[4.6. Đối chiếu tiêu chuẩn (OWASP / PCI DSS) 30](#_Toc232945256)

[4.7. Bàn luận kết quả 30](#_Toc232945257)

[Chương 5. KẾT LUẬN 31](#_Toc232945258)

[Chương 6. HƯỚNG PHÁT TRIỂN 31](#_Toc232945259)

[TÀI LIỆU THAM KHẢO 31](#_Toc232945260)

[PHỤ LỤC 31](#_Toc232945261)

# DANH MỤC HÌNH

| Hình | Tên hình |
| --- | --- |
| Hình 2.1 | Sự khác biệt giữa lời gọi nội bộ (monolith) và lời gọi qua mạng (microservices) |
| Hình 2.2 | Cấu trúc HMAC dựa trên hàm băm |
| Hình 2.3 | Mô hình Envelope Encryption hai tầng khóa DEK/KEK |
| Hình 3.1 | Kiến trúc giải pháp tổng thể |
| Hình 3.2 | Phương án triển khai (2 host / 3 VM) |
| Hình 3.3 | Data Flow Diagram và 8 ranh giới tin cậy |
| Hình 3.4 | Chuỗi 5 lớp lọc tại Envoy Gateway |
| Hình 3.5 | Định dạng blob ciphertext của FLE |
| Hình 3.6 | Luồng Checkout theo Saga Pattern (sequence diagram) |
| Hình 4.1 | Phân rã overhead mật mã trên một request checkout |

# DANH MỤC BẢNG

| Bảng | Tên bảng |
| --- | --- |
| Bảng 2.1 | So sánh Monolith và Microservices dưới góc độ bảo mật |
| Bảng 2.2 | Tổng hợp 8 cơ chế mật mã và nền tảng lý thuyết |
| Bảng 3.1 | Stack công nghệ và lý do lựa chọn |
| Bảng 3.2 | Danh sách 7 microservices |
| Bảng 3.3 | Tám ranh giới tin cậy (Trust Boundaries) |
| Bảng 3.4 | Cấu hình bảo mật xác thực OAuth2/OIDC |
| Bảng 3.5 | Chín transit key đã provision trên Vault |
| Bảng 3.6 | Cơ chế bù trừ (compensation) của Saga |
| Bảng 3.7 | Phân bố threat STRIDE theo mức độ |
| Bảng 3.8 | Các Critical threat tiêu biểu và mitigation |
| Bảng 4.1 | Phân bố phát hiện qua rà soát mã nguồn |
| Bảng 4.2 | Bốn lỗi đã sửa qua thực nghiệm |
| Bảng 4.3 | Kết quả Experiment 1 - JWT & Token |
| Bảng 4.4 | Kết quả Experiment 2 - Payment Fraud |
| Bảng 4.5 | Kết quả Experiment 3 - API Abuse |
| Bảng 4.6 | Kết quả Experiment 4 & 5 - Key Management, Supply Chain |
| Bảng 4.7 | Kết quả benchmark mật mã (5000 vòng) |
| Bảng 4.8 | Tổng hợp đối chiếu tiêu chuẩn Trước/Sau |
| Bảng 4.9 | OWASP API Security Top 10 (2023) |
| Bảng 4.10 | PCI DSS v4.0 |

# DANH MỤC TỪ VIẾT TẮT

| Viết tắt | Tiếng Anh đầy đủ | Diễn giải |
| --- | --- | --- |
| AEAD | Authenticated Encryption with Associated Data | Mã hóa có xác thực kèm dữ liệu liên kết |
| AES | Advanced Encryption Standard | Chuẩn mã hóa đối xứng thay thế cho DES |
| API | Application Programming Interface | Giao diện lập trình ứng dụng |
| ASVS | Application Security Verification Standard | Chuẩn kiểm định bảo mật ứng dụng (OWASP) |
| CDN | Content Delivery Network | Mạng phân phối nội dung |
| CVE | Common Vulnerabilities and Exposures | Định danh lỗ hổng công khai |
| DEK | Data Encryption Key | Khóa mã hóa dữ liệu |
| DFD | Data Flow Diagram | Sơ đồ luồng dữ liệu |
| ECDHE | Elliptic Curve Diffie–Hellman Ephemeral | Cơ chế tự động thiết lập chìa khóa bảo mật dùng một lần cho mỗi phiên kết nối. |
| ECDSA | Elliptic Curve Digital Signature Algorithm | Chữ ký số trên đường cong elliptic |
| FLE | Field-Level Encryption | Mã hóa chọn lọc các ô dữ liệu nhạy cảm nhất (như mật khẩu, số thẻ) thay vì toàn bộ cơ sở dữ liệu |
| GCM | Galois/Counter Mode | Chế độ vận hành AEAD của AES |
| HMAC | Hash-based Message Authentication Code | Mã xác thực thông điệp dựa trên hàm băm |
| HSM | Hardware Security Module | Mô-đun bảo mật phần cứng |
| IDOR | Insecure Direct Object Reference | Tham chiếu đối tượng trực tiếp không an toàn |
| IV | Initialization Vector | Vector khởi tạo |
| JWKS | JSON Web Key Set | Tập khóa công khai dạng JSON |
| JWT | JSON Web Token | Token xác thực dạng JSON |
| KEK | Key Encryption Key | Khóa mã hoá |
| KMS | Key Management Service | Dịch vụ quản lý khóa |
| MFA | Multi-Factor Authentication | Xác thực đa yếu tố |
| mTLS | Mutual TLS | TLS xác thực hai chiều |
| OIDC | OpenID Connect | Lớp xác thực trên OAuth 2.0 |
| PAN | Primary Account Number | Số thẻ thanh toán |
| PCI DSS | Payment Card Industry Data Security Standard | Tiêu chuẩn an toàn dữ liệu thẻ |
| PFS | Perfect Forward Secrecy | Bí mật chuyển tiếp hoàn hảo |
| PII | Personally Identifiable Information | Thông tin định danh cá nhân |
| PKCE | Proof Key for Code Exchange | Cơ chế chống chặn authorization code |
| PSP | Payment Service Provider | Nhà cung cấp dịch vụ thanh toán |
| RBAC | Role-Based Access Control | Kiểm soát truy cập theo role |
| SAQ | Self-Assessment Questionnaire | Bảng tự đánh giá tuân thủ PCI |
| SAST | Static Application Security Testing | Kiểm thử bảo mật mã nguồn tĩnh |
| SQLi | SQL Injection | Tấn công chèn câu lệnh SQL |
| SSRF | Server-Side Request Forgery | Giả mạo yêu cầu phía máy chủ |
| SSTI | Server-Side Template Injection | Chèn template phía máy chủ |
| STRIDE | Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege | Khung mô hình hóa mối đe dọa |
| TDE | Transparent Data Encryption | Mã hóa cơ sở dữ liệu tự động ngay trên ổ cứng |
| TLS | Transport Layer Security | Giao thức mật mã học đảm bảo tính bảo mật, toàn vẹn và xác thực cho dữ liệu truyền tải trên mạng |
| TOTP | Time-based One-Time Password | Mật khẩu một lần theo thời gian |
| TTL | Time To Live | Thời gian sống của token |
| WAF | Web Application Firewall | Tường lửa ứng dụng web |
| XSS | Cross-Site Scripting | Tấn công chèn mã script |

# TÓM TẮT

Thương mại điện tử xử lý những loại dữ liệu nhạy cảm bậc nhất - thông tin định danh cá nhân (PII) và dữ liệu thanh toán - trên một hạ tầng phân tán, nơi mỗi đường truyền giữa các thành phần đều trở thành một bề mặt tấn công tiềm tàng. Đồ án thiết kế, hiện thực và đánh giá định lượng một nền tảng thương mại điện tử theo kiến trúc microservices gồm bảy dịch vụ, với trọng tâm là áp dụng và đo lường các cơ chế mật mã học trong môi trường vận hành thực tế, thay vì chỉ dừng lại ở mô tả lý thuyết.

Hệ thống hiện thực tám cơ chế mật mã trải trên năm lớp bảo vệ: (1) TLS/HTTPS cho lớp truyền tải; (2) OAuth2 Authorization Code kết hợp PKCE (S256) với JWT access token cho lớp xác thực; (3) HMAC-SHA256 kèm nonce và timestamp bảo đảm toàn vẹn cho giao tiếp service-to-service; (4) tokenization qua nhà cung cấp dịch vụ thanh toán (PSP) nhằm loại bỏ hoàn toàn số thẻ (PAN) khỏi hệ thống; (5) quản lý khóa tập trung bằng HashiCorp Vault theo mô hình envelope encryption; (6) mã hóa dữ liệu FLE cho các thông tin nhạy cảm trong cơ sở dữ liệu; (7) nhật ký kiểm toán bất biến (append-only); và (API Gateway/WAF đóng vai trò điểm tiếp nhận và lọc lưu lượng tại biên (ingress/edge). Hệ thống được triển khai trên hạ tầng nhiều node kết nối qua mạng riêng ảo Tailscale (WireGuard), Keycloak cấp phát JWT và HashiCorp Vault Transit phục vụ các thao tác mã hoá.

Qua quá trình thực nghiệm, đồ án nhận thấy các điểm yếu mật mã trong thực tế hiếm khi bắt nguồn từ bản thân thuật toán, mà chủ yếu nảy sinh từ những khiếm khuyết trong khâu thiết kế và vận hành hệ thống. Cụ thể, việc xác định sai trust boundary, quản lý cấu hình bảo mật thiếu nhất quán hoặc lỗi thời, xử lý ngoại lệ sai và sự tồn tại của các cơ chế dự phòng ẩn (silent fallback) đều trực tiếp bào mòn hiệu quả phòng thủ, tạo ra trạng thái “an toàn ảo” có thể đe dọa toàn bộ kiến trúc hệ thống.

# Chương 1. MỞ ĐẦU

## 1.1. Lý do chọn đề tài

Các nền tảng thương mại điện tử hiện nay (như Amazon, Shopee, Tiki...) phải xử lý liên tục một khối lượng lớn dữ liệu nhạy cảm, bao gồm thông tin định danh cá nhân (PII) và dữ liệu giao dịch tài chính. Những luồng dữ liệu này luôn chịu sự ràng buộc khắt khe từ các tiêu chuẩn bảo mật quốc tế (điển hình như PCI DSS) và các quy định bảo vệ quyền riêng tư. Một sự cố rò rỉ không chỉ gây tổn thất trực tiếp về tài chính mà còn hủy hoại uy tín và kéo theo các rủi ro pháp lý nghiêm trọng cho doanh nghiệp.

Bên cạnh đó, để đáp ứng khả năng mở rộng, các hệ thống này hầu hết đều chuyển dịch sang kiến trúc phân tán (microservices). Bề mặt tấn công theo đó cũng được mở rộng: mỗi kết nối giao tiếp qua mạng nội bộ đều trở thành một điểm có nguy cơ bị nghe lén, giả mạo hoặc chịu tấn công lặp lại (replay attack). Bối cảnh thực tiễn này đòi hỏi các cơ chế mật mã phải được đưa ra khỏi khuôn khổ lý thuyết để áp dụng vào thực tế. Đây chính là động lực chính để đồ án lựa chọn xây dựng kiến trúc thương mại điện tử phân tán, qua đó tạo ra môi trường cụ thể nhằm triển khai, kiểm chứng và đo lường trực tiếp hiệu quả của các lớp bảo mật mật mã.

## 1.2. Mục tiêu của đề tài

1. **Thiết kế** một nền tảng thương mại điện tử microservices có **ranh giới tin cậy (trust boundary)** được xác định rõ ràng, trong đó mỗi ranh giới có cơ chế xác thực/mã hóa tương ứng.
2. **Triển khai đầy đủ tám cơ chế mật mã** trải trên năm lớp: truyền tải (TLS), xác thực/ủy quyền (OAuth2), toàn vẹn thông điệp (HMAC), bảo vệ dữ liệu lưu trữ (TDE/FLE) và quản lý khóa (KMS).
3. **Đánh giá định lượng** đồng thời hai khía cạnh: *hiệu quả bảo mật* và *chi phí hiệu năng*.
4. **Rút ra bài học** về các dạng lỗi triển khai mật mã phổ biến trong hệ phân tán, thông qua rà soát mã nguồn thực tế.

## 1.3. Đối tượng và phạm vi nghiên cứu

* **Đối tượng nghiên cứu**: Đồ án tập trung nghiên cứu việc ứng dụng các cơ chế mật mã vào hệ thống thương mại điện tử dựa trên kiến trúc phân tán (microservices). Phạm vi nghiên cứu bao quát từ khía cạnh thiết kế kiến trúc (bao gồm lựa chọn thuật toán mật mã cốt lõi và thiết lập mức độ tin cậy giữa các thành phần) cho đến khía cạnh triển khai vận hành thực tế (như cấu hình tham số, xử lý ngoại lệ và quản lý khóa).
* **Phạm vi triển khai:** 7 microservices (catalog, cart, order, payment, inventory, shipping, notification) cùng hạ tầng đi kèm (Envoy Gateway, Keycloak, HashiCorp Vault, PostgreSQL, Apache Kafka). Thanh toán dùng Stripe ở chế độ test. Hệ thống được triển khai ở quy mô lab trên 4 node ảo.

## 1.4. Câu hỏi nghiên cứu và giả thuyết

* **RQ1:** Những điểm yếu mật mã nào (cấu hình TLS sai, quản lý khóa lỏng lẻo, mã hóa lưu trữ yếu kém) thường bị tin tặc lợi dụng để xâm phạm hệ thống và đánh cắp dữ liệu người dùng trong thực tế?
* **RQ2:** Cơ chế xác thực thông điệp (HMAC-SHA256, Nonce) và Tokenization ngăn chặn các thủ đoạn gian lận tài chính (sửa đổi payload thanh toán, tấn công lặp lại) và đảm bảo tính chống chối bỏ (non-repudiation) cho các giao dịch như thế nào để bảo vệ tuyệt đối quyền lợi người dùng?

## 1.5. Phương pháp thực hiện

1. **Xây dựng prototype hoàn chỉnh:** 7 microservices viết bằng Python/FastAPI theo kiến trúc clean architecture, tích hợp Envoy + Keycloak + Vault + PostgreSQL + Kafka + Redis.
2. **Thực nghiệm bảo mật:** 26 kiểm thử chia thành 5 nhóm (JWT/Token, Payment Fraud, API Abuse, Key Management, Supply Chain), chạy trực tiếp trên hệ thống live.
3. **Mô hình hóa mối đe dọa:** áp dụng STRIDE cho 9 thành phần, sinh ~50 kịch bản tấn công kèm mitigation.
4. **Rà soát mã nguồn:** đọc kỹ toàn bộ 7 dịch vụ để phát hiện lỗ hổng logic và lỗi mô hình tin cậy mà cấu hình không khắc phục được.

# Chương 2. TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT

## 2.1. Tổng quan bài toán bảo mật thương mại điện tử

Nền tảng được nghiên cứu thuộc dạng "Online Shopping Service Platform" - mô hình tham khảo các sàn lớn như Amazon, Shopee. Luồng nghiệp vụ điển hình của người dùng gồm sáu bước: **duyệt sản phẩm → thêm vào giỏ hàng → đặt hàng → thanh toán → giao hàng → nhận thông báo**. Trên hành trình đó, hệ thống thu thập và xử lý nhiều loại dữ liệu với mức nhạy cảm khác nhau:

* **Dữ liệu công khai:** thông tin sản phẩm, giá niêm yết - có thể đọc không cần xác thực.
* **Dữ liệu định danh cá nhân (PII):** email, số điện thoại, địa chỉ giao hàng - cần mã hóa khi lưu trữ và che (mask) khi ghi log.
* **Dữ liệu thanh toán:** Thông tin thẻ thanh toán là dữ liệu nhạy cảm và cần tuân thủ tiêu chuẩn PCI DSS; do đó, hướng tiếp cận an toàn thường được khuyến nghị là hạn chế tối đa việc để luồng dữ liệu này đi qua hoặc lưu trữ trực tiếp trên hệ thống nội bộ.

Tương ứng với từng bước nghiệp vụ là tập các mối đe dọa: ở lớp truyền tải là nghe lén và MitM attack; ở lớp xác thực là chiếm tài khoản, giả mạo token; ở lớp giao tiếp nội bộ là dịch vụ giả mạo và tấn công lặp lại; ở lớp thanh toán là giả mạo webhook, thao túng số tiền và rò rỉ số thẻ; ở lớp lưu trữ là rò rỉ dữ liệu qua backup hoặc truy cập vật lý. Mỗi mối đe dọa này được phân tích hệ thống bằng STRIDE ở mục 3.5.

## 2.2. Kiến trúc Microservices và đánh đổi bảo mật

Bảng 2.1 so sánh hai kiến trúc dưới góc độ bảo mật, giải thích vì sao microservices là lựa chọn bắt buộc cho mục tiêu của đề tài.

| Tiêu chí | Monolith | Microservices |
| --- | --- | --- |
| Giao tiếp module | Function call nội bộ trong bộ nhớ | Qua mạng áp dụng và đo được mTLS/HMAC/Gateway |
| Cách ly vùng bảo mật | Khó - mọi module cùng tiến trình, cùng vùng nhớ | Payment chạy node riêng, thu hẹp scope PCI DSS xuống SAQ A-EP |
| Least privilege | Mọi module cùng một identity/quyền | Mỗi dịch vụ một quyền tối thiểu, một danh tính riêng |
| Bán kính ảnh hưởng khi bị xâm nhập | Toàn bộ ứng dụng | Giới hạn trong dịch vụ bị xâm nhập |
| Độ phức tạp / độ trễ | Thấp | Cao hơn. |

*Bảng 2.1: So sánh Monolith và Microservices dưới góc độ bảo mật.*

Đề tài thừa nhận đầy đủ nhược điểm của microservices: độ phức tạp vận hành cao hơn, độ trễ tăng do giao tiếp qua mạng, và khó đảm bảo tính nhất quán dữ liệu phân tán. Tuy nhiên, trong ngữ cảnh môn học, chính sự phức tạp này là **đối tượng nghiên cứu**: đề tài đo lường trade-off giữa mức bảo mật tăng thêm và chi phí hiệu năng đánh đổi (mục 4.5). Vấn đề nhất quán dữ liệu được xử lý bằng *Saga pattern* và *idempotency key* (mục 3.4).

## 2.3. Cơ sở lý thuyết mật mã

Phần này trình bày nền tảng lý thuyết của các mật mã được sử dụng, làm cơ sở cho phần thiết kế ở Chương 3. Bảng 2.2 tóm tắt ánh xạ giữa cơ chế và lý thuyết.

| Cơ chế trong hệ thống | Primitive/giao thức | Mục đích bảo mật chính |
| --- | --- | --- |
| TLS 1.3 (lớp truyền tải) | ECDHE + AEAD + chứng chỉ X.509 | Bí mật, toàn vẹn, xác thực máy chủ |
| JWT (Keycloak) | ES256 | Xác thực danh tính, tách bạch quyền |
| HMAC Service-to-Service | HMAC-SHA256 | Toàn vẹn + xác thực nguồn gốc thông điệp |
| FLE (PII) | AES-256-GCM (AEAD) + envelope | Bí mật + toàn vẹn dữ liệu lưu trữ |
| Audit signing | ECDSA-P256 (chữ ký số) | Chống chối bỏ |
| Audit integrity | HMAC-SHA256 | Toàn vẹn nhật ký |
| PSP tokenization | thay PAN bằng token | Loại bỏ dữ liệu thẻ khỏi scope |

*Bảng 2.2: Tổng hợp 8 cơ chế mật mã và nền tảng lý thuyết.*

### 2.3.1. Mật mã đối xứng và AEAD - AES-256-GCM

Hệ thống sử dụng mật mã khóa đối xứng AES-256, đảm bảo biên độ an toàn dài hạn (~128-bit) ngay cả khi đối mặt với rủi ro điện toán lượng tử (thuật toán Grover).

Vì AES là mật mã khối, hệ thống tích hợp chế độ GCM (Galois/Counter Mode) thuộc nhóm mã hóa có xác thực (AEAD). GCM đồng thời cung cấp ba thuộc tính bảo mật cốt lõi:

* Tính bí mật: Dữ liệu mã hóa dòng qua cơ chế đếm CTR.
* Tính toàn vẹn và Xác thực: Tự động đính kèm thẻ xác thực 128-bit. Việc giải mã sẽ bị từ chối lập tức nếu dữ liệu bị sửa đổi.

Để duy trì tính an toàn tối đa cho GCM, hệ thống tuân thủ nghiêm ngặt nguyên tắc không tái sử dụng giá trị khởi tạo (Nonce/IV). Codebase sử dụng hàm sinh số giả ngẫu nhiên an toàn mật mã (`os.urandom`) để tạo Nonce 96-bit độc nhất cho mỗi chu kỳ mã hóa (xem mã nguồn ở mục 3.3.6). Cuối cùng, nhờ khả năng tương thích tập lệnh tăng tốc phần cứng AES-NI, kiến trúc này đạt thông lượng xử lý cực cao (mục 4.5: ~2,2 triệu phép/giây) mà không gây nghẽn cổ chai hệ thống.

### 2.3.2. Hàm băm và mã xác thực thông điệp - SHA-256, HMAC

Hàm băm thuần túy không đảm bảo nguồn gốc thông điệp, bất kỳ ai cũng tính được giá trị băm. Để vừa kiểm tra toàn vẹn vừa xác thực nguồn gốc, cần một MAC (Message Authentication Code). HMAC là cấu trúc MAC dựa trên hàm băm, được định nghĩa:

HMAC(K, m) = H( (K ⊕ opad) ∥ H( (K ⊕ ipad) ∥ m ) )

trong đó K là khóa bí mật chia sẻ, H là SHA-256, còn ipad/opad là hai hằng số đệm. Vì chỉ bên nắm khóa K mới tạo và kiểm tra được giá trị HMAC, cơ chế này chống được giả mạo thông điệp.

Đề tài dùng HMAC-SHA256 cho hai mục đích: (i) ký request service-to-service (mục 3.3.3) và (ii) bảo vệ toàn vẹn nhật ký kiểm toán (mục 3.3.7). Để chống tấn công lặp lại (replay) - kẻ tấn công bắt lại một request hợp lệ và gửi lại nguyên văn - HMAC được kết hợp thêm hai yếu tố: một timestamp với cửa sổ chấp nhận ±5 phút (chống replay cũ), và một nonce dùng một lần lưu trong Redis (chống replay bản sao chính xác). Bên cạnh đó, để ngăn chặn tấn công đo thời gian (timing attack), quá trình xác thực chữ ký sử dụng hàm đối chiếu có thời gian thực thi không đổi (`hmac.compare\_digest`).

### 2.3.3. Mật mã khóa công khai và chữ ký số - RSA, ECDSA

Thay vì dùng RSA, đồ án chọn ECDSA trên đường cong P-256. ECDSA đạt cùng mức an toàn nhưng tối ưu hơn hẳn về kích thước (khóa 256-bit tương đương RSA 3072-bit).

Cơ chế này được áp dụng cho hai nghiệp vụ:

* Ký JWT: Keycloak độc quyền giữ khóa riêng để ký token bằng ES256 (ECDSA P-256 + SHA-256). Các vi dịch vụ lấy khóa công khai qua JWKS để tự xác minh khoá trước khi kiểm tra phân quyền.
* Ký Audit Log: Dùng khóa `payment-sign-key` (chuẩn ECDSA-P256) qua Vault Transit Engine để ký audit log (xem mục 3.3.7).

### 2.3.4. Token xác thực - JWT và mô hình tin cậy

Để ký và xác minh JWT, đồ án quyết định sử dụng thuật toán bất đối xứng ES256 thay vì thuật toán đối xứng (như HMAC-SHA256). Lựa chọn này nhằm giải quyết triệt để bài toán Privilege Separation.

Nếu dùng thuật toán đối xứng, hệ thống phải chia sẻ chung một khóa bí mật cho cả bên tạo token và bên kiểm tra token. Điều này vô cùng rủi ro: chỉ cần một service servicebị xâm nhập, kẻ tấn công sẽ lấy được khóa bí mật và có thể tự do làm giả token để đánh lừa toàn bộ hệ thống.

Thuật toán bất đối xứng ES256 khắc phục điểm yếu này bằng cách sử dụng một cặp khóa:

* Private Key để tạo chữ ký: Chỉ duy nhất máy chủ định danh (Keycloak) được phép giữ khóa này để phát hành token. Khóa này được bảo vệ nghiêm ngặt tại một nơi duy nhất.
* Public Key để xác minh: Các service khác tải khóa này về chỉ để kiểm tra xem token có hợp lệ hay không. Khóa công khai không thể dùng để làm giả token.

Sự phân tách rõ ràng giữa "quyền phát hành" và "quyền xác minh" giúp khoanh vùng rủi ro. Ngay cả khi một node bị tổn hại, kẻ tấn công cũng không thể tự tạo ra danh tính giả mạo.

### 2.3.5. Giao thức truyền tải an toàn - TLS 1.3

TLS (Transport Layer Security) 1.3 bảo vệ kênh truyền giữa hai bên, cung cấp tính bí mật, toàn vẹn và xác thực máy chủ thông qua chứng chỉ X.509.

mTLS (mutual TLS) mở rộng TLS để cả hai bên xác thực lẫn nhau bằng chứng chỉ - phù hợp cho giao tiếp service-to-service nội bộ.

# Chương 3. THIẾT KẾ HỆ THỐNG VÀ CÁC CƠ CHẾ MẬT MÃ

## 3.1. Kiến trúc tổng thể

Hệ thống được triển khai trên **4 node** ảo kết nối qua mạng riêng ảo Tailscale (WireGuard), mỗi node đảm nhận một vai trò bảo mật riêng biệt nhằm thực thi nguyên tắc cách ly và đặc quyền tối thiểu.

![](data:image/png;base64...)

*Hình 3.1: Kiến trúc giải pháp - Client→Nginx→Envoy (xác thực qua Keycloak, JWT ES256/EC-SHA256); Catalog/Cart/Order; Payment+Vault trong vùng PCI-DSS; DB qua TLS.*

![](data:image/png;base64...)

*Hình 3.2: Phương án triển khai - Máy host A gồm 3 máy ảo (VM1 Nginx+Envoy+Keycloak, VM2 Catalog/Cart/Order, VM3 Payment+Vault) và Máy host B (Database, Kafka), kết nối qua Tailscale WireGuard + TLS.*

### 3.1.1. Stack công nghệ và lý do lựa chọn

| Lớp | Công nghệ |
| --- | --- |
| Ngôn ngữ | Python 3.13 + FastAPI |
| API Gateway | Envoy Proxy |
| Identity | Keycloak |
| Key Management | HashiCorp Vault |
| Database | PostgreSQL 15 |
| Message Bus | Apache Kafka 7.6 |
| Payment PSP | Stripe (test mode) |

## 3.3. Triển khai 8 cơ chế mật mã

**3.3.1. TLS 1.3 / HTTPS:** Envoy termination TLS 1.3. Mã hóa toàn bộ traffic user→gateway, chống MitM.

**3.3.2. OAuth2/OIDC + PKCE + MFA: Sử dụng thuật toán ES256 (EC-SHA256) để tách bạch quyền: chỉ Identity Provider giữ khóa ký. Access Token TTL được đặt 120s.**

**3.3.3. HMAC-SHA256 Service-to-Service:** Mỗi request nội bộ được ký bằng HMAC-SHA256 (qua Vault Transit) với timestamp + nonce; bên nhận verify timestamp (±5 phút), nonce (Redis chống replay) và chữ ký.

**3.3.4. PSP Tokenization:** Stripe.js chạy client-side nhận thẻ → trả token cho backend. Database chỉ lưu psp\_payment\_method\_id, giảm phạm vi PCI DSS.

**3.3.5. Key Management - HashiCorp Vault:** Sử dụng Vault làm KMS, áp dụng Envelope encryption (DEK + KEK) kết hợp DEK caching để tăng tốc.

**3.3.6. Database Encryption (TDE + FLE):** Mã hóa ổ đĩa (TDE) và mã hóa ở mức trường dữ liệu (FLE) cho PII.

![](data:image/png;base64...)

*Hình 3.5: Định dạng blob ciphertext của FLE.*

**3.3.7. Append-only Audit Log:** Khóa bằng PostgreSQL RULE, đảm bảo tính toàn vẹn (integrity) chống Repudiation.

**3.3.8. WAF & API Gateway Hardening:** Envoy chuỗi 5 lớp bao gồm JWT authn, Rate Limit 100/60s, WAF Lua chặn SQLi/XSS, và CORS.

![](data:image/png;base64...)

*Hình 3.4: Chuỗi 5 lớp lọc tại Envoy Gateway.*

# Chương 4. THỰC NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ

## 4.1. Môi trường và phương pháp thực nghiệm

Chạy trên live infrastructure 4 node; thanh toán Stripe test mode; Vault Transit. Đo 5000 vòng/phép toán.

## 4.2. Rà soát mã nguồn và lỗ hổng phát hiện

**Phân loại rủi ro theo nhóm OWASP**

|  |  |
| --- | --- |
| **Nhóm OWASP** | **Rủi ro cụ thể phát hiện trong codebase** |
| Authentication Failures | 1.1 Tin header khi không có gateway · 1.2 JWT chỉ base64-decode, không verify chữ ký |
| Broken Access Control | 2.1 Admin API thiếu xác thực · 2.2 Webhook shipping giả đổi trạng thái đơn |
| Insecure Design | 3.1 Race condition → charge 2 lần · 3.2 Ghi event trước khi xử lý · 3.3 Tính giá từ client · 3.4 Lỗi quy đổi tiền tệ khi refund |
| Injection | 4.1 Rò rỉ token qua trình duyệt (XSS) · SSTI template noti |
| Mishandling Exceptions | 5.1 Silent fallback vô hiệu hóa bảo mật · 5.2 Error message rò rỉ thông tin |
|  |  |

| ID | Mức | Lỗ hổng | Fix |
| --- | --- | --- | --- |
| T1 | Medium | Webhook trả HTTP 500 | Trả HTTP 400 đúng nghĩa |
| T2 | Low | ARRAY(String) crash trên SQLite | Đổi sang kiểu JSON |
| T3 | Low | Dòng heredoc lẫn vào YAML | Xóa dòng đầu |
| T4 | Info | payment-service/.env bị track trong git | git rm --cached |

## 4.3. Kết quả 5 nhóm security experiments

Thực hiện 26 bài test: 25/26 Passed. Bài trượt do Kafka timeout (hạ tầng, không phải bảo mật).

## 4.4. Static analysis và pentest

Sử dụng Bandit, Trivy, gitleaks quét, không phát hiện rò rỉ secret thực sự và 0 HIGH/CRITICAL CVEs trên hạ tầng chuẩn.

## 4.5. Hiệu năng mật mã

| Phép toán | Median | p95 | Throughput |
| --- | --- | --- | --- |
| AES-256-GCM encrypt | 0.0005 ms | 0.0006 ms | 2.2M ops/s |
| Vault DEK unwrap (cold) | 24.6 ms | 38 ms | - |
| Vault DEK unwrap (cached) | ~0.001 ms | - | - |

Overhead do mã hóa chiếm < 6% tổng thời gian (Stripe round-trip tốn 200–500 ms).

![](data:image/png;base64...)

*Hình 4.1: Phân rã overhead mật mã trên một request checkout.*

## 4.6. Đối chiếu tiêu chuẩn (OWASP / PCI DSS)

OWASP API Top 10 (2023) đạt 10/10 PASS. OWASP ASVS L2 và PCI DSS v4.0 đạt phần lớn, chỉ cảnh báo ở mật khẩu DB mặc định.

## 4.7. Bàn luận kết quả

Điểm yếu lớn nhất không nằm ở thuật toán mà ở **cách triển khai**. Caching đóng vai trò then chốt giảm tải gọi Vault.

# Chương 5. KẾT LUẬN

Hệ thống xác nhận giả thuyết: cơ chế tokenization kết hợp Envelope encryption đảm bảo bảo mật cao với overhead thấp. Rủi ro thực tế hoàn toàn do cấu hình và lập trình.

# TÀI LIỆU THAM KHẢO

[1] E. Rescorla, "The Transport Layer Security (TLS) Protocol Version 1.3," RFC 8446, IETF, Aug. 2018.

[2] D. Hardt, "The OAuth 2.0 Authorization Framework," RFC 6749, IETF, Oct. 2012.

[3] N. Sakimura, J. Bradley, and N. Agarwal, "Proof Key for Code Exchange by OAuth Public Clients," RFC 7636, IETF, Sep. 2015.

[4] H. Krawczyk, M. Bellare, and R. Canetti, "HMAC: Keyed-Hashing for Message Authentication," RFC 2104, IETF, Feb. 1997.

[5] OWASP Foundation, "Application Security Verification Standard (ASVS) v4.0.3," 2021.

[6] OWASP Foundation, "OWASP API Security Top 10 - 2023," 2023.

[7] PCI Security Standards Council, "Payment Card Industry Data Security Standard (PCI DSS), v4.0," Mar. 2022.

[8] HashiCorp, "Vault Transit Secrets Engine Documentation."

[9] Stripe Inc., "Payment Methods and Tokenization Documentation."

[10] Microsoft Corporation, "The STRIDE Threat Model," Microsoft Docs, 2009.

# PHỤ LỤC