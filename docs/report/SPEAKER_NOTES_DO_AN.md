# KỊCH BẢN THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN NT219 (BẢN TRỰC DIỆN)

**Nhóm B1.12 · NT219.Q22.ANTT_2026 · UIT Store**

> LƯU Ý: Văn phong kịch bản này đi thẳng vào vấn đề kỹ thuật, phân tích trực diện CƠ CHẾ và TẠI SAO. Bỏ qua các từ ngữ rườm rà. Lời nói là phần in thường, thao tác là chữ in nghiêng.

---

## SLIDE 1 — TRANG BÌA (30s)

"Kính chào hội đồng. Nhóm em xin trình bày đồ án: **Thiết kế và Đánh giá An toàn Mật mã cho Nền tảng Thương mại Điện tử**.

Thay vì chỉ cấu hình các công cụ có sẵn, đồ án này tự xây dựng kiến trúc **Phòng thủ theo chiều sâu (Defense in Depth)** trên môi trường vi dịch vụ (microservices - chia nhỏ hệ thống thành các phần độc lập để dễ bảo vệ từng lớp). Chúng em trực tiếp ứng dụng mật mã vào mã nguồn để giải quyết 3 bài toán lõi: bảo vệ dữ liệu nhạy cảm (data at rest - dữ liệu lưu tĩnh trong cơ sở dữ liệu), chống mạo danh (authentication), và đảm bảo an toàn giao tiếp nội bộ (data in transit - dữ liệu đang truyền trên mạng)."

_(Chuyển slide)_

---

## SLIDE 2 — BỐI CẢNH VÀ LÝ DO CHỌN ĐỀ TÀI (1 phút)

"Tại sao lại là hệ thống Thương mại điện tử?
Vì đây là môi trường hội tụ 4 loại tài sản mang rủi ro bảo mật khắt khe nhất:

1. **Dữ liệu thẻ thanh toán:** Bắt buộc tuân thủ PCI-DSS (tiêu chuẩn bảo mật thẻ thanh toán quốc tế). Nếu lưu trữ sai cách, doanh nghiệp đối mặt rủi ro pháp lý và phạt tài chính nặng nề.
2. **Phiên đăng nhập:** Chìa khóa vào hệ thống, mục tiêu hàng đầu của các cuộc tấn công chiếm đoạt tài khoản (Account Takeover - hacker dùng token trộm được để đăng nhập trái phép).
3. **Dữ liệu cá nhân (PII):** Quyền riêng tư của khách hàng, đích nhắm của tấn công rò rỉ dữ liệu (Data Breach - tin tặc lấy cắp hàng loạt thông tin DB).
4. **Độ tin cậy nội bộ (Internal Trust):** Rủi ro kẻ tấn công leo thang đặc quyền từ một service phụ sang service trọng yếu (như Payment).

Để có môi trường đo lường thực tế, nhóm tự phát triển hệ thống e-commerce gồm 7 microservices chạy trên 4 node mạng ảo, thay vì chỉ mô phỏng trên kiến trúc nguyên khối (monolith - gom chung mọi code vào một chỗ, hỏng 1 nơi dễ sập toàn bộ)."

_(Chuyển slide)_

---

## SLIDE 3 — MỤC TIÊU CỐT LÕI VÀ GIẢI PHÁP (1 phút 30s)

"Mục tiêu là: **Bảo mật toàn diện hệ thống phân cấu mà không làm suy giảm hiệu năng trải nghiệm**.
Nhóm áp dụng triết lý **Zero Trust** (mô hình không tin tưởng bất kỳ ai, bắt buộc xác thực mọi yêu cầu kể cả gọi từ nội bộ).

Từng tài sản được bảo vệ bằng các cơ chế mật mã riêng biệt:

- **Số thẻ ngân hàng:** Áp dụng Tokenization (thay thẻ thật bằng chuỗi ký tự vô nghĩa). Dịch vụ Payment không chạm vào thẻ thật, chuyển hoàn toàn rủi ro lưu trữ sang cổng thanh toán Stripe.
- **Phiên đăng nhập:** Dùng JWT ký số bằng thuật toán phi đối xứng **RS256** (RSA 256-bit). Keycloak giữ Private Key để ký, các service dùng Public Key để tự xác minh độc lập. Cấp Access Token ngắn hạn kết hợp Refresh Token Rotation (cơ chế thu hồi ngay token cũ khi cấp mới để chặn dùng trộm).
- **Dữ liệu cá nhân (PII):** Mã hóa ở tầng ứng dụng (Field-level encryption - mã hóa riêng từng cột dữ liệu trước khi gửi xuống DB) bằng **AES-256-GCM**. Dữ liệu được bảo vệ tận gốc, ngăn chặn cả quản trị viên CSDL (DBA) đọc trộm.
- **Giao tiếp nội bộ:** Yêu cầu xác thực mọi API call bằng chữ ký **HMAC-SHA256** (sinh mã băm để kiểm tra xem ai đang gọi).
- **Quản lý khóa:** Sử dụng **HashiCorp Vault**. Mã nguồn tuyệt đối không chứa khóa (Zero Hardcode). Khóa được cấp phát động qua cơ chế AppRole."

_(Chuyển slide)_

---

## SLIDE 4 — NHẬN DIỆN RỦI RO (1 phút)

"Kiến trúc trên giải quyết trực tiếp các lỗ hổng theo chuẩn OWASP API Security Top 10:

1. **Broken Object Level Authorization - BOLA** (lỗi phân quyền cho phép xem/sửa data người khác): Kẻ tấn công sửa ID để xem đơn hàng người khác. _(Phòng thủ: Verify Role và UserID trực tiếp từ payload JWT, không tin tham số client truyền lên)_.
2. **Replay Attack** (tấn công phát lại, bắt 1 gói tin hợp lệ rồi gửi lặp lại để trục lợi): Hacker bắt gói tin API thanh toán và gửi lặp lại. _(Phòng thủ: HMAC kết hợp Timestamp và Nonce, request trễ quá 30s sẽ bị từ chối)_.
3. **Data Tampering** (hành vi chỉnh sửa dữ liệu trên đường truyền): Sửa giá tiền trước khi thanh toán. _(Phòng thủ: Chữ ký số nội bộ đảm bảo tính toàn vẹn payload)_.
4. **Credential Stuffing** (dùng tool tự động thử hàng loạt mật khẩu lộ lọt): _(Phòng thủ: Cấu hình Rate Limiting tại Envoy Gateway, chặn IP vượt 100 req/phút)_.
5. **Lỗ hổng `alg: none`:** Sửa header JWT thành `none` để xóa chữ ký bypass xác thực. _(Phòng thủ: Middleware xác minh JWT ép cứng `algorithms=["RS256"]`)_."

_(Chuyển slide)_

---

## SLIDE 5 — KIẾN TRÚC BẢO MẬT (2 phút)

"Luồng đi của một request thể hiện rõ mô hình Zero Trust:

1. **Tại Envoy API Gateway (Edge - cửa ngõ ngoài cùng):**
   - Hoạt động như SSL Termination (điểm cuối giải mã HTTPS để giảm tải cho bên trong). VPN WireGuard đóng các port HTTP thuần.
   - Áp dụng Rate Limiting (giới hạn tốc độ request) chặn brute-force.
   - Xác minh chữ ký JWT cơ bản trước khi điều hướng request vào trong.

2. **Tại tầng Microservices:**
   - Khi dịch vụ Đơn hàng gọi Thanh toán, phải gửi: (1) Identity của User (JWT) + (2) **Chữ ký HMAC kèm Timestamp**. Điều này chứng minh 'ai là user' và xác thực 'service nào đang gọi'.
   - Đối với Kafka (Bất đồng bộ): Payload được ký điện tử **ECDSA** (thuật toán chữ ký nhỏ gọn, tối ưu tốc độ). Consumer xác minh chữ ký hợp lệ mới xử lý, chặn bơm dữ liệu độc hại vào message queue.

3. **Tại hệ thống quản lý khóa:**
   - Vault là 'ngân hàng khóa'. Các service dùng AppRole lấy token tạm thời kéo API key hoặc gửi dữ liệu qua API `/encrypt` của Vault Transit."

_(Chuyển slide)_

---

## SLIDE 6 — TRIỂN KHAI VÀ CÔ LẬP MẠNG (1 phút)

"Hệ thống triển khai 4 máy ảo riêng biệt, kết nối qua VPN Tailscale (WireGuard) mã hóa End-to-End (mã hóa từ đầu gửi đến tận đầu nhận), chặn truy cập trực tiếp từ Internet.
Thiết kế này nhằm thu hẹp tối đa **Phạm vi đánh giá PCI-DSS - PCI Scope** (khoanh vùng các máy chủ xử lý thẻ để hạn chế số lượng máy phải kiểm định bảo mật hằng năm):

- **Node 1:** Envoy Gateway (Cửa ngõ).
- **Node 2:** Core Services (Order, Catalog).
- **Node 3:** Payment & Vault.
- **Node 4:** Database Cluster.

Cách ly Node 3 (chứa tác vụ tài chính và quản lý khóa) giúp hệ thống chỉ cần kiểm định PCI khắt khe trên đúng node này, tiết kiệm lớn chi phí vận hành bảo mật."

_(Chuyển slide)_

---

## SLIDE 7 — DEMO HỆ THỐNG (3 phút)

"Nhóm xin demo trực tiếp 4 kịch bản phòng thủ:

1. **Chống mạo danh JWT (alg: none / Invalid Signature):**
   - Đóng vai kẻ tấn công, sửa payload JWT từ `user` thành `admin`.
   - Hệ thống trả về 401 Unauthorized do sai chữ ký RS256. Đổi thuật toán sang `none`, API Gateway tiếp tục chặn đứng.
2. **Chống Replay Attack API Nội bộ:**
   - Can thiệp bắt gói tin giữa Order và Payment, chèn lại gói tin cũ hợp lệ.
   - Service từ chối xử lý do phát hiện Timestamp đã quá hạn hoặc Nonce bị trùng.
3. **Thao túng giá (Data Tampering):**
   - Kẻ tấn công sửa trường `total_price` ở Frontend xuống 1 USD.
   - Backend tự tính toán đối chiếu qua DB nội bộ, phát hiện bất đồng bộ và hủy giao dịch.
4. **Bảo mật DB (Field-level Encryption - mã hóa từng trường dữ liệu):**
   - Truy cập thẳng DB bằng quyền Admin. Cột thông tin thẻ/PII khách hàng bị mã hóa toàn bộ bằng thuật toán AES-256-GCM thành Ciphertext (đoạn văn bản vô nghĩa), DBA không thể đọc được plain-text (văn bản gốc)."

_(Thao tác demo dứt khoát, show rõ terminal log / Grafana để hội đồng thấy request bị chặn ở bước nào)_

---

## KẾT LUẬN (30s)

"Đồ án đã chứng minh: Việc đưa mật mã vào bảo vệ hệ thống vi dịch vụ là hoàn toàn khả thi trên thực tế, đảm bảo an toàn từ cửa ngõ đến Database với chi phí hiệu năng cực thấp nhờ kiến trúc Defense in Depth và Zero Trust.

Cảm ơn hội đồng đã lắng nghe. Nhóm xin phép nhận câu hỏi phản biện."

---

# PHẦN HỎI — ĐÁP (Chuẩn bị sẵn cho phản biện trực diện)

**(Trọng tâm kỹ thuật để giải thích nguyên lý thiết kế)**

**Hỏi: Tại sao không làm monolith (nguyên khối) cho đơn giản mà phải dùng microservices?**
"Mục đích cốt lõi của đồ án là ứng dụng mật mã vào mạng lưới phân tán. Kiến trúc Monolith chia sẻ chung vùng nhớ, không có ranh giới mạng nội bộ, nên các cơ chế trọng tâm như: xác thực API nội bộ bằng HMAC, quản lý khóa phân tán với Vault, hay chữ ký sự kiện Kafka sẽ mất đi ý nghĩa. Microservices là điều kiện bắt buộc để bộc lộ và thử nghiệm các giải pháp mật mã này."

**Hỏi: Giao tiếp giữa Order và Payment tại sao dùng HMAC mà không truyền thẳng JWT của user?**
"JWT chỉ chứng minh 'ai là người dùng', không chứng minh được 'ai là dịch vụ đang gọi'. HMAC kèm timestamp giải quyết được cả 2: Xác minh định danh của dịch vụ gọi (Order) và chống tấn công Replay Attack. Ngoài ra, tốc độ băm HMAC đối xứng nhanh hơn rất nhiều so với xác minh chữ ký phi đối xứng của JWT, cực kỳ tối ưu cho API nội bộ gọi liên tục."

**Hỏi: AES-256-GCM dùng mã hóa DB có ưu điểm gì so với AES-CBC?**
"AES-GCM là chế độ Authenticated Encryption (Mã hóa có xác thực). GCM sinh ra một thẻ Tag (MAC) đi kèm để đảm bảo tính toàn vẹn của Ciphertext. Nếu hacker truy cập thẳng vào Database sửa đổi bit mã hóa, hàm giải mã sẽ quăng lỗi ngay lập tức. Tính năng này chặn đứng hoàn toàn các cuộc tấn công padding oracle hay bit-flipping (các kỹ thuật lợi dụng điểm yếu thuật toán cũ để đảo ngược hoặc sửa dữ liệu) vốn là điểm yếu của AES-CBC."

**Hỏi: Vault AppRole hoạt động như thế nào, làm sao an toàn hơn file .env?**
"Thay vì dùng một khóa tĩnh sống vĩnh viễn (như .env), AppRole cấp quyền qua 2 tham số: `RoleID` (dạng public) và `SecretID` (dạng private, tự động xoay vòng thay mới liên tục). AppRole sinh ra một Token có vòng đời cực ngắn (TTL) và chỉ cấp quyền truy cập theo đúng thư mục (path) được phân. Ngay cả khi hacker chiếm được 1 container cũng không thể lấy được Master Key để xâm nhập các tài nguyên khác."

---

# PHỤ LỤC: TỪ ĐIỂN KIẾN TRÚC & MẬT MÃ (Dành cho vấn đáp)

**1. Các Triết Lý Bảo Mật Cốt Lõi:**

- **Zero Trust:** Không tin tưởng bất cứ ai, dù là request từ ngoài hay trong mạng nội bộ. Xác thực và cấp quyền cho mọi tương tác.
- **Defense in Depth:** Lớp 1 (Envoy WAF/Rate Limit) -> Lớp 2 (JWT Auth) -> Lớp 3 (HMAC Internal Auth) -> Lớp 4 (Mã hóa Database). Thủng 1 lớp không sập toàn bộ.
- **PCI Scope:** Kỹ thuật thu hẹp khu vực hạ tầng dính dáng đến dữ liệu thẻ, cô lập mạng Payment giúp giảm chi phí kiểm định PCI-DSS hằng năm.

**2. Mật mã ứng dụng:**

- **Symmetric (AES-256-GCM):** Mã hóa tĩnh PII (Tên, Địa chỉ). Giao tiếp với Vault qua `VaultTransit` API.
- **Asymmetric (RS256):** Keycloak giữ Private Key ký JWT. Services giữ Public Key xác minh. Kiến trúc lý tưởng cho phân tán vì không chia sẻ Private Key.
- **HMAC (Hash-based Message Authentication Code):** Sinh chữ ký API nội bộ. Đảm bảo toàn vẹn dữ liệu, chống mạo danh.
- **Envelope Encryption (Mã hóa bao thư):** Dùng Data Encryption Key (DEK) mã hóa dữ liệu, sau đó dùng Key Encryption Key (KEK) mã hóa DEK. Giúp hệ thống dễ dàng Key Rotation định kỳ mà không phải giải mã lại toàn bộ Database.
- **Tokenization (Stripe):** Thẻ thật được cổng thanh toán đổi thành chuỗi Token ngẫu nhiên (chỉ có ý nghĩa 1 chiều). Hệ thống nội bộ lưu Token này, triệt tiêu rủi ro lộ số thẻ.

**3. Cơ sở hạ tầng Phân Tán:**

- **Envoy Proxy:** Edge Proxy (Cửa ngõ ngoài cùng chặn mọi kết nối lạ), xử lý TLS Termination, Rate Limit và JWT decode ban đầu.
- **Apache Kafka:** Giao tiếp bất đồng bộ, payload được ký ECDSA (băm SHA-256) chống bơm message độc giả mạo.
- **Saga Pattern & Idempotency:** Xử lý lỗi giao dịch liên chuỗi (Saga tự động rollback/hoàn tồn kho). Idempotency (tính lũy đẳng - cơ chế đảm bảo một request dù bị gọi lặp nhiều lần vẫn chỉ trừ tiền 1 lần) chặn nguy cơ bị gọi lặp request gây trừ tiền khách nhiều lần bằng Header `Idempotency-Key`.
- **WireGuard (Tailscale):** Mạng Overlay mã hóa E2E (End-to-End) toàn bộ các node, chặn các port nhạy cảm khỏi Public Internet.

## Khối Giao tiếp Ngoại vi (Client + Edge/Identity)

- Envoy tiếp nhận toàn bộ traffic từ bên ngoài, chịu trách nhiệm _TLS Termination_ (là quá trình giải mã các yêu cầu được mã hóa (HTTPS/TLS) tại một điểm trung gian trước khi chuyển tiếp dữ liệu đó đến máy chủ đích dưới dạng chưa mã hóa HTTP), xác thực request, định tuyến (Routing) và cân bằng tải (Load Balancing).
- Keycloak là IdP (Identity Provider), chịu trách nhiệm xác thực tài khoản và xác nhận role của tài khoản đó.
- Envoy sẽ tiếp nhận các request, check xem request đó đã có JWT ( Json Web Token, nó chứa thông tin như User ID, thời gian hết hạn, và đặc biệt là có chữ ký điện tử của Keycloak để không ai có thể làm giả) chưa (nếu có rồi thì chuyển tới backend, chưa thì cho qua Keycloak).
- **HashiCorp Vault** hoạt động như một két sắt trung tâm để quản lý vòng đời của các bí mật trong cụm máy chủ.
- Vault chuyên lưu trữ **external credentials (VD: API Keys)**; lưu trữ **các encryption keys** cho tất cả các cơ sở dữ liệu; và bảo vệ các khóa có giá trị cực cao như **khóa quản trị của Cổng thanh toán (PSP admin keys)** để tránh việc kẻ tấn công xâm nhập và thao túng giao dịch.

# Keycloak

Về bản chất, Keycloak là một nền tảng Quản lý Định danh và Truy cập (Identity and Access Management - IAM) độc lập. Nó được tích hợp sẵn một máy chủ giao diện (Web Server) chứa mã nguồn HTML, CSS và JavaScript.

- Khi người dùng cần đăng nhập, hệ thống sẽ điều hướng họ đến thẳng các trang web do Keycloak cung cấp.
- Các giao diện này được quản lý qua cơ chế **Theme** (Giao diện mẫu). Đội ngũ phát triển hoàn toàn có thể tùy biến CSS/HTML để trang đăng nhập của Keycloak trông giống hệt với thiết kế của sàn thương mại điện tử.
  **Keycloak còn chứa những thành phần cốt lõi nào khác?** Ngoài giao diện đăng nhập, Keycloak là một "pháo đài" chứa các module sau:

1. **Cơ sở dữ liệu người dùng (User Store):** Nơi lưu trữ thông tin đăng nhập, mật khẩu (đã được băm mã hóa một chiều - Hashing), và các thuộc tính cơ bản.
2. **Bộ máy cấp phát Token (Token Issuer Engine):** Module chịu trách nhiệm chạy các thuật toán mã hóa (như đã phân tích ở phần JWT) để sinh ra, gia hạn hoặc thu hồi Token.
3. **Trình quản lý Phiên (Session Management):** Theo dõi xem ai đang đăng nhập, thiết bị nào đang được sử dụng. Nếu bạn bấm "Đăng xuất khỏi mọi thiết bị", module này sẽ ra lệnh vô hiệu hóa toàn bộ Token của bạn.
4. **Cổng Liên kết Định danh (Identity Brokering):** Đây là module giúp hệ thống của bạn có nút _"Đăng nhập bằng Google/Facebook"_. Keycloak sẽ tự động đi nói chuyện với Google, lấy thông tin về và quy chuẩn lại thành JWT nội bộ của hệ thống bạn.
5. **Bảng điều khiển Quản trị (Admin Console):** Một giao diện dành riêng cho Admin để tạo người dùng mới, phân quyền (Role-Based Access Control), hoặc cấu hình mức độ bảo mật (như ép buộc xác thực 2 lớp - 2FA).
   Keycloak tạo và kí JWT bằng thuật toán RS256.

## mTLS (Mutual Transport Layer Security)

Là một cơ chế xác thực hai chiều bắt buộc **cả hai bên** giao tiếp phải xuất trình chứng chỉ điện tử - certificate để xác minh lẫn nhau trước khi trao đổi dữ liệu.
Trong nền tảng thương mại điện tử, mTLS không dùng cho khách hàng bên ngoài mà được áp dụng triệt để cho giao tiếp nội bộ giữa các Microservices. Mỗi dịch vụ được cấp một danh tính riêng (thông qua hệ thống như SPIFFE/SPIRE hoặc lưới dịch vụ Istio) kèm theo một chứng chỉ điện tử để liên lạc. Toàn bộ các lời gọi API nội bộ này đều được xác thực và cấp quyền nghiêm ngặt dựa trên nguyên tắc đặc quyền tối thiểu (least privilege).

- **Chống dịch vụ giả mạo**: Nhờ có mTLS, dịch vụ giả mạo không sở hữu chứng chỉ do hệ thống cấp phát. Các dịch vụ thật khác sẽ **từ chối kết nối ngay lập tức** vì không xác minh được danh tính đối phương.
- **Bảo vệ dữ liệu không bị nghe lén nội bộ**: Mọi dữ liệu truyền giữa các dịch vụ bên trong (như thông tin cá nhân, đơn hàng) đều được mã hóa hoàn toàn.

* **Loại bỏ việc "giấu" mật khẩu trong mã nguồn**: Thông thường, các hệ thống cũ hay dùng các mật khẩu tĩnh giấu trong mã nguồn. Với mTLS, hệ thống dùng các chứng chỉ điện tử có **thời gian sống cực kỳ ngắn (short-lived certs)** và liên tục tự động gia hạn (auto-rotation). Do đó, kẻ tấn công có trộm được một chứng chỉ, nó cũng sẽ rất nhanh chóng hết hạn và trở nên vô dụng.

## PCI-DSS

**PCI-DSS** (Payment Card Industry Data Security Standard - Tiêu chuẩn Bảo mật Dữ liệu Ngành Thẻ Thanh toán) là một bộ tiêu chuẩn an ninh thông tin bắt buộc dành cho **bất kỳ tổ chức nào** có liên quan đến việc xử lý, lưu trữ hoặc truyền tải dữ liệu thẻ tín dụng.
Tiêu chuẩn này áp dụng cho tất cả các thực thể có liên quan đến quá trình xử lý tài khoản thanh toán (bao gồm người bán, bộ phận xử lý, tổ chức phát hành, nhà cung cấp dịch vụ) có lưu trữ, xử lý, truyền tải dữ liệu chủ thẻ (CHD - Cardholder Data) và dữ liệu xác thực nhạy cảm (SAD - Sensitive Authentication Data), hoặc các hệ thống có thể ảnh hưởng đến bảo mật của các dữ liệu này.
Mục tiêu cốt lõi của PCI-DSS rất đơn giản: **Bảo vệ dữ liệu của chủ thẻ khỏi bị đánh cắp và ngăn chặn gian lận giao dịch.**

## Idempotency-Key

Trong môi trường mạng, đôi khi yêu cầu đã gửi đi thành công nhưng phản hồi từ Server lại bị thất lạc. Lúc này, Client sẽ tự động gửi lại yêu cầu đó.

- **Nếu không có Idempotency:** có thể bị đặt 2 đơn hàng, trừ tiền 2 lần.
- **Nếu có Idempotency:** Server nhận diện được đây là yêu cầu cũ thông qua cái "Key", nó sẽ không xử lý lại mà trả ngay kết quả của lần xử lý đầu tiên.

## HMAC

Là một kỹ thuật mã hóa dùng để tạo ra một "mã xác thực" hoặc "chữ ký" bảo vệ một khối dữ liệu. Nó hoạt động dựa trên sự kết hợp giữa một **hàm băm** (như SHA-256) và một **khóa bí mật**. Xem nó như cơ chế tạo ra một tem chống giả đi kèm dữ liệu.
**Cơ chế hoạt động cốt lõi:**

1. Cả hệ thống gửi và hệ thống nhận đều phải chia sẻ chung một khóa bí mật (secret key) mà người ngoài không biết.
2. Khi bên gửi muốn truyền dữ liệu, họ sẽ trộn dữ liệu gốc đó với khóa bí mật rồi cho qua hàm băm để tạo ra một chuỗi ký tự đặc biệt gọi là chuỗi HMAC (chữ ký).
3. Bên gửi truyền đi cả dữ liệu gốc và chuỗi HMAC.
4. Khi hệ thống nhận được dữ liệu, nó sẽ tự lấy dữ liệu gốc đó kết hợp với khóa bí mật đang giữ để tính toán ra một chuỗi HMAC thứ hai.
5. Nếu chuỗi HMAC tự tính khớp hoàn toàn với chuỗi HMAC được gửi tới, hệ thống có thể khẳng định chắc chắn 100% hai điều: **Dữ liệu chưa bị ai can thiệp/chỉnh sửa trên đường đi** và **Dữ liệu chắc chắn xuất phát từ người giữ khóa hợp lệ**.
