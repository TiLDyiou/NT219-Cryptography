# NỘI DUNG CHI TIẾT BÁO CÁO KHÓA LUẬN / ĐỒ ÁN NT219

> **Bản thảo nội dung** theo bố cục KLTN UIT (Phụ lục 2 + 3). Dùng song song với [KE_HOACH_VIET_BAO_CAO.md](KE_HOACH_VIET_BAO_CAO.md).
> Chỗ `«…»` là thông tin cần điền. Code dài rút gọn thành snippet minh họa; bản đầy đủ để ở Phụ lục.
> Khi convert sang Word: áp font Times 13pt, dãn dòng 1.5, lề 3/3.5/3.5/2 cm, đánh số trang từ Tóm tắt.

---

## TÊN ĐỀ TÀI

- **Tiếng Việt:** Thiết kế và Đánh giá An toàn Mật mã cho Nền tảng Thương mại Điện tử dạng Microservices
- **Tiếng Anh:** Design and Security Evaluation of Cryptographic Mechanisms for a Microservices E-commerce Platform
- **Sinh viên:** «Họ tên 1 – MSSV», «Họ tên 2 – MSSV»
- **GVHD:** «Học vị, Họ tên» · **Khoa:** «…» · **Ngành:** «…» · **Năm:** 2026

---

## TÓM TẮT (ABSTRACT)

Thương mại điện tử xử lý dữ liệu nhạy cảm (thông tin định danh, dữ liệu thanh toán) trên hạ tầng phân tán, nơi mỗi đường truyền giữa các thành phần đều là một bề mặt tấn công. Khóa luận **thiết kế, triển khai và đánh giá** một nền tảng thương mại điện tử dạng **microservices** (7 dịch vụ) với trọng tâm là **áp dụng và đo lường các cơ chế mật mã học** trong môi trường vận hành thực tế thay vì chỉ mô tả lý thuyết.

Hệ thống triển khai tám cơ chế mật mã: TLS 1.3, OAuth2/OIDC + PKCE + MFA, HMAC-SHA256 cho giao tiếp service-to-service, PSP tokenization (không lưu số thẻ), quản lý khóa bằng HashiCorp Vault (envelope encryption), mã hóa cơ sở dữ liệu (TDE + FLE), nhật ký kiểm toán append-only, và API Gateway/WAF. Hệ thống chạy thật trên **4 node** kết nối qua Tailscale WireGuard.

Phương pháp đánh giá gồm: mô hình hóa mối đe dọa **STRIDE (~50 kịch bản)**, **26 kiểm thử bảo mật** chia 5 nhóm thực nghiệm, đo **overhead mật mã trên 5000 vòng lặp**, và đối chiếu ba bộ tiêu chuẩn OWASP ASVS L2, OWASP API Security Top 10, PCI DSS v4.0.

**Kết quả chính:** 25/26 kiểm thử đạt (1 trượt do hạ tầng, không phải lỗ hổng); phát hiện và sửa 4 lỗ hổng thực tế trong mã nguồn; OWASP API Top 10 đạt 10/10; overhead mật mã phía máy chủ chỉ ~3–28 ms (cold) và <0.01 ms (warm), chiếm **dưới 6%** tổng độ trễ — phần lớn độ trễ đến từ vòng gọi Stripe (200–500 ms). Khóa luận kết luận rằng điểm yếu mật mã phổ biến nhất không nằm ở thuật toán mà ở **cách triển khai** (sai mô hình tin cậy, feature flag bị tắt nhầm, xử lý lỗi sai).

**Từ khóa:** microservices, mật mã ứng dụng, TLS, OAuth2/OIDC, HMAC, tokenization, KMS, STRIDE, PCI DSS.

---

# Chương 1. MỞ ĐẦU

## 1.1. Lý do chọn đề tài

Các nền tảng thương mại điện tử (Amazon, Shopee…) xử lý khối lượng lớn dữ liệu cá nhân và giao dịch tài chính. Khác với ứng dụng đơn khối (monolith) nơi các module gọi nhau trong cùng tiến trình, kiến trúc microservices phân rã hệ thống thành nhiều dịch vụ giao tiếp **qua mạng** — mỗi kết nối trở thành một điểm có thể bị nghe lén, giả mạo hoặc tấn công lặp lại (replay). Đây chính là bối cảnh để các cơ chế mật mã (mTLS, HMAC, API Gateway, quản lý khóa) trở nên có ý nghĩa và đo lường được.

Môn NT219 yêu cầu triển khai và đánh giá các cơ chế mật mã trong ngữ cảnh thực tế. Nếu dùng monolith, lời gọi giữa các module chỉ là *function call* trong bộ nhớ — không có đường truyền mạng để áp dụng và kiểm chứng mTLS/HMAC/Gateway. Do đó kiến trúc microservices là lựa chọn bắt buộc để biến yêu cầu mật mã thành đối tượng nghiên cứu cụ thể.

## 1.2. Mục tiêu của đề tài

1. Thiết kế một nền tảng TMĐT microservices có **ranh giới tin cậy (trust boundary)** rõ ràng.
2. Triển khai đầy đủ **8 cơ chế mật mã** ở các lớp khác nhau (truyền tải, xác thực, toàn vẹn, lưu trữ, quản lý khóa).
3. **Đánh giá định lượng** hiệu quả bảo mật (qua kiểm thử + STRIDE + tiêu chuẩn) và **chi phí hiệu năng** (overhead mật mã).
4. Rút ra bài học về **lỗi triển khai mật mã** phổ biến trong microservices.

## 1.3. Đối tượng và phạm vi nghiên cứu

- **Đối tượng:** các cơ chế mật mã ứng dụng (applied cryptography) trong hệ phân tán TMĐT.
- **Phạm vi:** 7 microservices (catalog, cart, order, payment, inventory, shipping, notification) + hạ tầng (Envoy, Keycloak, Vault, PostgreSQL, Kafka, ELK, Prometheus/Grafana); thanh toán dùng Stripe test mode; triển khai quy mô lab trên 4 node.
- **Ngoài phạm vi:** chứng minh hình thức (formal proof) thuật toán; quy mô production thật; HSM phần cứng.

## 1.4. Câu hỏi nghiên cứu và giả thuyết

- **RQ1:** Những điểm yếu mật mã nào (quản lý khóa, lạm dụng token, cấu hình TLS sai, mã hóa lưu trữ không đúng) thường dẫn đến compromise trong hệ thống TMĐT?
- **RQ2:** Chiến lược PSP tokenization có giảm đáng kể rủi ro gian lận thanh toán mà vẫn chấp nhận được về độ trễ không?
- **RQ3:** Hiệu quả của KMS/HSM cho khóa ký/thanh toán so với software keys về an ninh và chi phí/độ trễ ra sao?

**Giả thuyết:** Kết hợp PSP tokenization + Vault/KMS (envelope encryption) + HMAC-SHA256 service-to-service giúp giảm đáng kể rủi ro; overhead mật mã phía máy chủ ~3–28 ms — chấp nhận được so với độ trễ Stripe 200–500 ms.

## 1.5. Phương pháp thực hiện

1. **Xây dựng prototype:** 7 microservices FastAPI + Envoy + Keycloak + Vault + PostgreSQL + Kafka.
2. **Thực nghiệm bảo mật:** 26 kiểm thử theo 5 nhóm (JWT/Token, Payment Fraud, API Abuse, Key Management, Supply Chain).
3. **Đo hiệu năng:** 5000 vòng lặp mỗi phép toán, tính median/p95/p99/throughput.
4. **Mô hình hóa đe dọa:** STRIDE cho 8–9 thành phần (~50 kịch bản).
5. **Rà soát mã nguồn:** phát hiện và sửa lỗ hổng thực tế.

## 1.6. Bố cục báo cáo

Chương 1 — Mở đầu; Chương 2 — Tổng quan & cơ sở lý thuyết; Chương 3 — Thiết kế hệ thống & các cơ chế mật mã; Chương 4 — Thực nghiệm & đánh giá; Chương 5 — Kết luận; Chương 6 — Hướng phát triển.

---

# Chương 2. TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT

## 2.1. Tổng quan bài toán bảo mật TMĐT

Mô tả bối cảnh nền tảng "Online Shopping Service Platform" (tham khảo Amazon, Shopee): luồng người dùng duyệt sản phẩm → giỏ hàng → đặt hàng → thanh toán → giao hàng → thông báo. Nêu các loại dữ liệu nhạy cảm (PII, dữ liệu thanh toán) và các mối đe dọa điển hình. *(Nguồn: `docs/17_Application Scenarios...md`.)*

## 2.2. Kiến trúc Microservices và đánh đổi bảo mật

| Tiêu chí | Monolith | Microservices |
|---|---|---|
| Giao tiếp module | Function call nội bộ | Qua mạng → áp dụng được mTLS/HMAC/Gateway |
| Cách ly vùng bảo mật | Khó — cùng tiến trình | Payment chạy riêng → thu hẹp scope PCI-DSS |
| Least privilege | Cùng identity | Mỗi service quyền tối thiểu riêng |
| Độ phức tạp / độ trễ | Thấp | Cao hơn — chính là trade-off cần đo |

*Bảng 2.1: So sánh monolith và microservices dưới góc độ bảo mật.*

## 2.3. Cơ sở lý thuyết mật mã

Phần này trình bày nền tảng lý thuyết của các nguyên thủy (primitive) mật mã được sử dụng trong hệ thống, làm cơ sở cho phần thiết kế ở Chương 3.

### 2.3.1. Mật mã đối xứng và AEAD — AES-256-GCM

Mật mã khóa đối xứng dùng **chung một khóa bí mật** cho cả mã hóa và giải mã. Chuẩn được sử dụng phổ biến nhất hiện nay là **AES** (Advanced Encryption Standard) [11] — một mật mã khối (block cipher) kích thước khối 128 bit, độ dài khóa 128/192/256 bit. Đề tài dùng **AES-256** (khóa 256 bit) để có biên an toàn cao trước cả tấn công bằng máy tính lượng tử trong tương lai gần (theo Grover, độ an toàn hiệu dụng còn ~128 bit).

Một mật mã khối thuần túy chỉ mã hóa một khối; để mã hóa dữ liệu dài cần **chế độ vận hành (mode of operation)**. Đề tài dùng **GCM (Galois/Counter Mode)** [12] — một chế độ thuộc lớp **AEAD (Authenticated Encryption with Associated Data)**. AEAD cung cấp đồng thời:

- **Tính bí mật (confidentiality):** dữ liệu được mã hóa theo kiểu stream (CTR mode bên trong GCM).
- **Tính toàn vẹn và xác thực (integrity + authenticity):** sinh ra một **thẻ xác thực (authentication tag)** 128 bit; mọi sửa đổi ciphertext hoặc associated data đều bị phát hiện khi giải mã.

GCM yêu cầu mỗi lần mã hóa dưới cùng một khóa phải dùng một **IV/nonce duy nhất** (đề tài dùng 96 bit ngẫu nhiên `os.urandom(12)`); việc **tái sử dụng nonce** với cùng khóa sẽ phá vỡ hoàn toàn tính an toàn của GCM — đây là điểm cần đặc biệt lưu ý khi triển khai. AES-GCM được tăng tốc phần cứng bằng tập lệnh **AES-NI** trên CPU hiện đại, lý giải throughput rất cao đo được trong thực nghiệm (mục 4.5: ~2,2 triệu phép/giây).

### 2.3.2. Hàm băm và mã xác thực thông điệp — SHA-256, HMAC

**Hàm băm mật mã (cryptographic hash)** ánh xạ dữ liệu độ dài tùy ý thành chuỗi cố định, với ba tính chất: kháng tiền ảnh (preimage), kháng tiền ảnh thứ hai và **kháng va chạm (collision resistance)**. Đề tài dùng **SHA-256** thuộc họ **SHA-2** [13].

Hàm băm thuần túy **không** đảm bảo nguồn gốc thông điệp (ai cũng băm được). Để vừa kiểm tra toàn vẹn vừa xác thực nguồn gốc, ta dùng **MAC (Message Authentication Code)**. **HMAC** [14] là cấu trúc MAC dựa trên hàm băm:

> HMAC(K, m) = H( (K ⊕ opad) ∥ H( (K ⊕ ipad) ∥ m ) )

với `K` là khóa bí mật chia sẻ, `H` là SHA-256, `ipad/opad` là hằng số đệm. Chỉ bên nắm khóa `K` mới tạo/kiểm tra được HMAC, nên HMAC chống được giả mạo thông điệp. Đề tài dùng **HMAC-SHA256** cho hai mục đích: (i) ký request service-to-service (mục 3.3.3) và (ii) bảo vệ toàn vẹn nhật ký kiểm toán (mục 3.3.7). Để chống **tấn công lặp lại (replay)**, HMAC được kết hợp thêm **timestamp** (cửa sổ ±5 phút) và **nonce** một lần (lưu Redis).

### 2.3.3. Mật mã khóa công khai và chữ ký số — RSA, ECDSA

Mật mã khóa công khai (bất đối xứng) dùng **cặp khóa**: khóa riêng (private) giữ bí mật và khóa công khai (public) công bố rộng rãi. Ứng dụng quan trọng là **chữ ký số (digital signature)**: bên ký dùng khóa riêng tạo chữ ký, bất kỳ ai cũng dùng khóa công khai để xác minh — qua đó đạt tính **xác thực** và **chống chối bỏ (non-repudiation)**.

- **RSA** [15] dựa trên độ khó của bài toán phân tích thừa số nguyên lớn. Đề tài dùng **RS256** (RSA-PSS/PKCS#1 với SHA-256) để Keycloak ký **JWT** (mục 2.3.4) — khóa riêng chỉ Keycloak giữ, các service chỉ cần khóa công khai (qua JWKS) để xác minh.
- **ECDSA trên đường cong P-256** [16] cho cùng mức an toàn với RSA nhưng kích thước khóa/chữ ký nhỏ hơn nhiều (khóa ~256 bit so với RSA ~3072 bit). Đề tài dùng **ECDSA-P256** (Vault transit key) để ký các bản ghi audit. *(Trên hệ thống live, JWT đã được chuyển sang **ES256** — ECDSA-P256 + SHA-256 — để hưởng lợi ích kích thước; xem hạn chế ở mục 5.3.)*

### 2.3.4. Token xác thực — JWT và mô hình tin cậy

**JWT (JSON Web Token)** [17] là chuẩn token gồm ba phần `header.payload.signature` mã hóa Base64URL. Phần `payload` chứa các **claim** (sub, exp, aud, iss, roles…); phần `signature` được tạo bằng thuật toán trong `header`. Hai nhóm thuật toán: **HMAC** (đối xứng, ví dụ HS256) và **chữ ký số** (bất đối xứng, RS256/ES256). Đề tài chọn **RS256** để **tách bạch quyền**: chỉ Identity Provider (Keycloak) giữ khóa ký, các resource service chỉ xác minh.

Một lớp lỗ hổng JWT kinh điển là **`alg:none`** (token không chữ ký) và **nhầm lẫn thuật toán** (algorithm confusion: ép server dùng public key như khóa HMAC). Phòng chống đòi hỏi: chốt cứng danh sách thuật toán chấp nhận, luôn kiểm tra `aud`/`iss`/`exp`, và **không bao giờ** tin `alg` do client cung cấp một cách mù quáng (thực nghiệm Experiment 1, mục 4.3). Vì JWT là **stateless**, không thể thu hồi tức thời sau khi phát — đề tài giảm thiểu bằng **TTL ngắn 120 giây** + refresh token rotation.

### 2.3.5. Giao thức truyền tải an toàn — TLS 1.3

**TLS (Transport Layer Security) 1.3** [1] bảo vệ kênh truyền giữa hai bên, cung cấp bí mật, toàn vẹn và xác thực máy chủ (qua chứng chỉ X.509). So với TLS 1.2, phiên bản 1.3 **loại bỏ các cipher suite yếu** (RC4, CBC dễ tổn thương, RSA key exchange tĩnh), bắt buộc **AEAD** và **forward secrecy** (ECDHE), đồng thời rút gọn bắt tay còn 1-RTT. Trong hệ thống, **mTLS (mutual TLS)** mở rộng TLS để **cả hai bên** xác thực lẫn nhau bằng chứng chỉ — phù hợp cho giao tiếp service-to-service; trạng thái triển khai mTLS được nêu ở mục 5.3.

### 2.3.6. Xác thực ủy quyền — OAuth 2.0, OIDC, PKCE, MFA

**OAuth 2.0** [2] là khung **ủy quyền (authorization)**: cấp cho client một access token để truy cập tài nguyên thay mặt người dùng, không chia sẻ mật khẩu. **OpenID Connect (OIDC)** xây trên OAuth2 để bổ sung **xác thực (authentication)** danh tính (ID token). Đề tài dùng **Authorization Code flow**.

**PKCE (Proof Key for Code Exchange)** [3] chống tấn công **chặn authorization code**: client sinh `code_verifier` ngẫu nhiên, gửi `code_challenge = SHA-256(code_verifier)` (phương thức **S256**) khi xin code, rồi xuất trình `code_verifier` khi đổi lấy token — kẻ chặn được code nhưng không có verifier sẽ thất bại.

**MFA (Multi-Factor Authentication)** bổ sung yếu tố thứ hai ngoài mật khẩu; đề tài dùng **TOTP (Time-based One-Time Password)** [18] — mã 6 chữ số sinh từ khóa bí mật chia sẻ + thời gian, chống chiếm tài khoản ngay cả khi lộ mật khẩu.

### 2.3.7. Quản lý khóa — KMS, HSM và Envelope Encryption

An toàn của toàn hệ thống quy về **an toàn của khóa**. **KMS (Key Management Service)** tập trung hóa việc tạo, lưu, xoay (rotation) và kiểm toán việc dùng khóa; **HSM (Hardware Security Module)** là thiết bị phần cứng chống can thiệp, giữ khóa không bao giờ rời thiết bị. Đề tài dùng **HashiCorp Vault Transit** làm KMS emulator [19].

**Envelope encryption** là mô hình hai tầng khóa giải quyết đánh đổi giữa an toàn và hiệu năng:

- **DEK (Data Encryption Key):** khóa AES sinh ngẫu nhiên cho từng đơn vị dữ liệu, dùng để mã hóa dữ liệu cục bộ (rất nhanh).
- **KEK (Key Encryption Key):** khóa "bọc" DEK, **nằm trong KMS/HSM và không bao giờ xuất ra**. DEK được mã hóa (wrap) bởi KEK rồi lưu kèm ciphertext.

Khi giải mã, ứng dụng gửi DEK đã wrap tới KMS để unwrap (một lần gọi mạng), sau đó dùng DEK giải mã dữ liệu cục bộ. Mô hình này cho phép **cache DEK** để tránh gọi KMS mỗi request (mục 3.3.5, 4.5), đồng thời vẫn giữ KEK trong ranh giới an toàn và ghi log mọi lần dùng khóa — đáp ứng yêu cầu kiểm toán của PCI DSS.

### 2.3.8. Bảo vệ dữ liệu thanh toán — PSP Tokenization

**Tokenization** thay thế dữ liệu nhạy cảm bằng **token** không có giá trị khai thác ngoài ngữ cảnh. Với thanh toán, **PSP (Payment Service Provider) tokenization** chuyển việc thu nhận số thẻ (**PAN — Primary Account Number**) sang nhà cung cấp (Stripe): trình duyệt gửi thẻ thẳng tới Stripe, backend chỉ nhận **token** (`pm_xxx`) để thực hiện giao dịch. Nhờ đó PAN **không bao giờ đi qua hoặc lưu trên** hệ thống, giúp **thu hẹp phạm vi tuân thủ PCI DSS** (từ SAQ D xuống SAQ A-EP) và loại bỏ rủi ro rò rỉ thẻ ngay cả khi backend bị xâm nhập (mục 3.3.4).

> *Ghi chú trích dẫn:* các mã `[n]` tham chiếu mục Tài liệu tham khảo; cần rà soát lại số trang/năm và sắp xếp theo chuẩn IEEE khi hoàn thiện.

## 2.4. Mô hình hóa mối đe dọa và tiêu chuẩn

- **STRIDE** (Microsoft): Spoofing/Tampering/Repudiation/Information Disclosure/DoS/Elevation of Privilege.
- **OWASP ASVS v4.0**, **OWASP API Security Top 10 (2023)**, **PCI DSS v4.0** — vai trò làm thước đo đánh giá.

## 2.5. Khoảng trống và đóng góp của đề tài

Phần lớn tài liệu mô tả cơ chế mật mã ở mức lý thuyết hoặc một cơ chế đơn lẻ. Đề tài đóng góp một **hệ thống tích hợp đầy đủ 8 cơ chế** chạy thật, kèm **đo lường định lượng** overhead và đối chiếu đa tiêu chuẩn — qua đó chỉ ra rằng rủi ro thực tế đến từ lỗi triển khai chứ không phải thuật toán.

---

# Chương 3. THIẾT KẾ HỆ THỐNG VÀ CÁC CƠ CHẾ MẬT MÃ

## 3.1. Kiến trúc tổng thể

Hệ thống gồm 4 node: **Node 1 — Ingress** (Envoy Gateway :10000 + Keycloak :8080), **Node 2 — Services** (catalog/cart/order/inventory/shipping/noti), **Node 3 — Payment + Vault**, **Node 4 — Data** (PostgreSQL/Kafka/ELK/Prometheus/Grafana). Các node kết nối qua Tailscale WireGuard; bên ngoài có Stripe PSP và Gmail SMTP.

> *Hình 3.1: Sơ đồ kiến trúc tổng thể 4 node* — export từ `docs/architecture.drawio` / `enmerce_architecture_diagram_final_v4.png`.
> *Hình 3.2: Sơ đồ triển khai (deployment)* — từ `docs/topology.drawio` / `slide6_deployment.drawio`.

### 3.1.1. Stack công nghệ

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| Ngôn ngữ | Python 3.13, FastAPI | Tất cả microservices |
| API Gateway | Envoy Proxy | TLS termination, JWT, WAF, rate limit |
| Identity | Keycloak 26 | OAuth2/OIDC, MFA, JWT RS256 |
| Key Management | HashiCorp Vault | Transit encryption, secrets |
| Database | PostgreSQL 15 | Lưu trữ, TDE |
| Message Bus | Apache Kafka 7.6 | Event streaming, audit logs |
| Cache | Redis | Nonce guard, idempotency |
| Observability | ELK + Prometheus + Grafana | Logging, metrics |
| Payment PSP | Stripe (test mode) | Tokenization, 3DS |
| Networking | Tailscale WireGuard | VPN giữa 4 node |

*Bảng 3.1: Stack công nghệ.*

### 3.1.2. Chi tiết 7 microservices

| Service | Port | Công nghệ | Vai trò |
|---|---|---|---|
| catalog-service | 8001 | FastAPI + SQLAlchemy | Catalog sản phẩm, public read |
| cart-service | 8002 | FastAPI + Redis | Giỏ hàng |
| order-service | 8003 | FastAPI + PostgreSQL | Saga orchestrator |
| payment-service | 8004 | FastAPI + Stripe + Vault | Thanh toán, tokenization |
| inventory-service | 8005 | FastAPI + PostgreSQL | Tồn kho |
| shipping-service | 8006 | FastAPI + GHN API | Vận chuyển |
| noti-service | 8007 | FastAPI + SMTP | Email thông báo |

*Bảng 3.2: Danh sách microservices.*

## 3.2. Trust Boundaries và Data Flow

### 3.2.1. Tám ranh giới tin cậy

| TB | Lớp | Cơ chế bảo vệ | Đe dọa chính |
|---|---|---|---|
| TB1 | Internet (untrusted) | — | Mọi packet là nghi ngờ |
| TB2 | Edge: CDN + Envoy | TLS 1.3 + JWT RS256 | Spoofing, MitM, DDoS |
| TB3 | Backend services | HMAC-SHA256 + Nonce Guard | Rogue service, replay |
| TB4 | Data layer | TLS + TDE + FLE | Insider, truy cập vật lý |
| TB5 | Key Management (Vault) | AppRole + audit log | Trộm khóa |
| TB6 | Stripe PSP | HTTPS + webhook HMAC | Webhook spoofing/replay |
| TB7 | ML/Fraud API | HTTPS + API key (Vault) | Lộ API key |
| TB8 | Gmail SMTP | SMTP/TLS + creds (Vault) | Lộ credential, spam |

*Bảng 3.3: Tám ranh giới tin cậy. Nguyên tắc: zero implicit trust — xác thực lại tại mỗi ranh giới.*

> *Hình 3.3: Data Flow Diagram* — từ `docs/data_flow_diagram.md`. Lưu ý nêu rõ Nginx tại cổng 80 (DFD hiện thiếu).

## 3.3. Triển khai 8 cơ chế mật mã

### 3.3.1. TLS 1.3 / HTTPS
Envoy termination TLS 1.3 (server.crt/server.key). Xác minh thực tế: `curl -k https://100.96.240.45:10000/api/v1/catalog/products` → HTTP 200. Tác dụng: mã hóa toàn bộ traffic user→gateway, chống MitM, loại cipher yếu của TLS 1.2.

### 3.3.2. OAuth2/OIDC + PKCE + MFA
Luồng: login Keycloak (HTTPS) → password + TOTP → authorization code + PKCE (S256) → exchange lấy Access Token (JWT RS256, TTL 120s) → Envoy verify JWT bằng JWKS → inject `X-User-Id` đã xác thực cho backend.

| Tham số | Giá trị | Lý do |
|---|---|---|
| Algorithm | RS256 | Private key chỉ Keycloak giữ |
| Access Token TTL | 120s | Giảm cửa sổ nếu token bị trộm |
| Refresh rotation | Strict | Hủy token cũ khi refresh |
| PKCE | S256 | Chống chặn authorization code |
| MFA | TOTP | Chống account takeover |
| verify_aud | `account` | Chống audience confusion |
| brute_force | lockout sau 5 fail | Chống credential stuffing |

*Bảng 3.4: Cấu hình bảo mật xác thực.*

### 3.3.3. HMAC-SHA256 Service-to-Service
Mỗi request nội bộ được ký bằng HMAC-SHA256 (qua Vault Transit) với timestamp + nonce; bên nhận verify timestamp (±5 phút), nonce (Redis chống replay) và chữ ký. Production bật `REQUIRE_INBOUND_HMAC=True`. Overhead median **0.0013 ms**.

```python
# Bên ký (rút gọn) — services/payment-service/.../crypto/hmac_signer.py
def build_canonical_request(method, path, ts, nonce, body):
    body_hash = hashlib.sha256(body).hexdigest()
    return f"{method.upper()}\n{path}\n{ts}\n{nonce}\n{body_hash}"
# canonical → Vault Transit hmac(key="order-hmac-key") → X-Signature
```

### 3.3.4. PSP Tokenization (No PAN)
Stripe.js chạy client-side nhận thẻ → trả `PaymentMethod` token (`pm_xxx`) → backend charge bằng token, **không bao giờ thấy số thẻ thật**. DB chỉ lưu `psp_payment_method_id`, `card_last4`, `card_brand` (không có `card_number/cvv/expiry`). Hệ quả: PCI-DSS scope giảm từ SAQ D → SAQ A-EP.

### 3.3.5. Key Management — HashiCorp Vault
Vault thay env vars vì có audit log, rotation không redeploy, dynamic secrets, AppRole per-service, mã hóa at-rest AES-256-GCM, KEK không export (Transit). Xác thực qua AppRole (role_id + secret_id).

| Key | Thuật toán | Dùng cho |
|---|---|---|
| payment-fle-key | AES-256-GCM | FLE PII (email, address) |
| order-hmac-key | HMAC-SHA256 | S2S request signing |
| payment-sign-key | ECDSA-P256 | Chữ ký audit record |
| payment-audit-key | HMAC-SHA256 | Toàn vẹn audit log |
| inventory/order/shipping/noti-fle-key | AES-256-GCM | FLE dữ liệu nhạy cảm |
| inventory-sign-key | ECDSA-P256 | Inventory audit signing |

*Bảng 3.5: 9 transit key đã provision.*

**Envelope encryption + DEK caching:** mỗi lần mã hóa sinh DEK + IV ngẫu nhiên, AES-GCM dữ liệu, wrap DEK bằng KEK (Vault). Sau khi unwrap (24.6 ms) DEK được cache 5 phút → 99% request chỉ tốn 0.0005 ms AES local.

### 3.3.6. Database Encryption (TDE + FLE)
- **TDE:** mã hóa toàn bộ data file PostgreSQL trên disk (chống lấy ổ cứng vật lý), transparent với app.
- **FLE:** mã hóa từng trường nhạy cảm bằng envelope encryption; blob lưu DB: `[version][len(EncDEK)][EncDEK][IV][Ciphertext+Tag]`. DBA chỉ thấy ciphertext, cần Vault + AppRole mới giải mã.
- **Trạng thái:** code FLE hoàn chỉnh, chưa activate runtime (cần Vault root token trong lab) — P0 còn lại.

### 3.3.7. Append-only Audit Log
Migration 0007 tạo PostgreSQL RULE chặn DELETE/UPDATE trên `payment_audit_log`. Audit còn được đẩy qua Kafka `audit-logs` → Logstash → Elasticsearch → Kibana. Đáp ứng PCI DSS Req 10.3, chống Repudiation (STRIDE), GDPR Art.30.

### 3.3.8. WAF & API Gateway Hardening
Envoy chuỗi 5 lớp: TLS 1.3 → JWT authn (JWKS) → rate limit 100req/60s/IP → WAF Lua (chặn SQLi/XSS/scanner UA) → CORS whitelist. Route prefix-rewrite tới backend.

## 3.4. Checkout Flow — Saga Pattern
7 microservices không có distributed ACID → dùng **Saga Orchestrator** (order-service điều phối): ReserveInventory → CheckFraud → ProcessPayment (Stripe Checkout + 3DS + webhook) → ConfirmReservation → CreateShipment → SendEmail. Mỗi bước nội bộ đều HMAC-signed.

| Bước thất bại | Compensation |
|---|---|
| Fraud detected | ReleaseInventory → CANCELLED |
| Payment declined | ReleaseInventory → CANCELLED |
| Shipment fail | Không rollback payment — customer service xử lý |

*Bảng 3.6: Cơ chế bù trừ (compensation).*

**Idempotency:** mỗi payment có `idempotency_key` (UUID), kết quả đầu cache Redis. Test 2.3: req1 438 ms (Stripe thật) → req2/req3 chỉ 5 ms (cache hit, không charge lại).

## 3.5. Phân tích STRIDE
Áp dụng STRIDE cho 9 thành phần (Frontend, CDN, Gateway, Keycloak, Backend services, Payment+Stripe, Data stores, Vault, CI/CD). Tổng ~50 kịch bản.

| Severity | Số lượng | Ví dụ |
|---|---|---|
| Critical | 13 | JWT forgery, PAN exposure, Vault compromise, webhook spoofing |
| High | 18 | HMAC bypass, token theft, SQLi, MitM |
| Medium | 12 | User enumeration, CORS bypass, repudiation |
| Low | 7 | Client ReDoS, timing attack, header info leak |

*Bảng 3.7: Phân bố threat theo mức độ.* (Bảng đầy đủ Critical threats + mitigation — xem Phụ lục.)

---

# Chương 4. THỰC NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ

## 4.1. Môi trường và phương pháp thực nghiệm
Chạy trên live infrastructure 4 node; thanh toán Stripe test mode (checkout session `cs_test_...` thật); JWT thật từ Keycloak; Vault Transit đang chạy. Hiệu năng đo 5000 vòng/phép toán trên Apple Silicon (Node 4).

## 4.2. Lỗ hổng phát hiện và đã sửa
| ID | Mức | Lỗ hổng | Fix |
|---|---|---|---|
| T1 | Critical | Đọc `X-User-Id` trực tiếp (trust-based auth) | Backend chỉ nhận từ Envoy; Gateway verify JWT rồi inject header |
| T2 | High | `REQUIRE_INBOUND_HMAC=False` (HMAC guard tắt) | Bật True + nonce guard trong mọi `.env` |
| T3 | High | Dev stub `dev_stub_on_failure=True`, SQLite fallback | Tắt stub, fail-fast |
| T4 | Medium | Webhook InvalidSignature → HTTP 500 | Trả 400 đúng ngữ nghĩa |

*Bảng 4.1: Bốn lỗ hổng phát hiện qua code review + thực nghiệm.*

## 4.3. Kết quả 5 nhóm security experiments (26 tests)

**Experiment 1 — JWT & Token:** alg:none→500, claim forgery→401, expiry→401, refresh replay→400, user enum→same message. *Test 1.5 (token sau logout còn valid): known tradeoff của stateless JWT, TTL 120s mitigate.*

**Experiment 2 — Payment Fraud:** webhook thiếu/forged/replay signature→400; idempotency 438ms→5ms; no PAN in DB verified; Stripe real checkout→200. *Test 2.4 (COD amount từ client): warning P1. Test 2.5 (IDOR refund): code 403 verified, re-run gặp 500 do Kafka timeout — hạ tầng.*

**Experiment 3 — API Abuse (Envoy HTTPS):** credential stuffing→lockout #17→429; rate limit 110→100×200+10×429; CORS evil→blocked; **WAF SQLi 5/5→403**; **scanner UA 5/5→403**; direct bypass→404. Latency throttled: median 121ms · p95 210ms · p99 221ms.

**Experiment 4 — Key Management:** Vault health (initialized/unsealed)→OK; KMS latency 50 vòng: median 24.6ms · p95 38ms · p99 140ms. Seal/unseal drill: skipped (rủi ro production).

**Experiment 5 — Supply Chain:** dependency CVE 0 HIGH/CRITICAL; 0 real secrets trong git; unsigned image deploy: cần cosign + k8s admission (pending).

**Bổ sung:** API3 (catalog không lộ cost/margin/supplier/password) ✅; API7 (SSRF — URL xử lý plain text) ✅.

## 4.4. Static analysis & pentest
- **Bandit:** HIGH=0, MEDIUM=8 (chủ yếu false positive B104 bind 0.0.0.0 trong container), LOW=28.
- **pip-audit:** 0 HIGH CVE mọi service (còn 2 MEDIUM `cryptography==46.0.6` PYSEC-2026-36).
- **Trivy:** 0 HIGH/CRITICAL, 0 secret. **gitleaks:** 7 findings, 0 credential thật.

## 4.5. Hiệu năng mật mã

| Phép toán | Median | p95 | p99 | Throughput |
|---|---|---|---|---|
| AES-256-GCM encrypt | 0.0005 ms | 0.0006 | 0.0007 | 2.2M ops/s |
| AES-256-GCM decrypt | 0.0005 ms | 0.0006 | 0.0007 | 2.1M ops/s |
| HMAC-SHA256 sign | 0.0013 ms | 0.0014 | 0.0015 | 960K ops/s |
| JWT decode (cached) | 0.0013 ms | 0.0015 | 0.0018 | — |
| Vault DEK unwrap (cold) | 24.6 ms | 38 | 140 | — |
| Vault DEK unwrap (cached) | ~0.001 ms | — | — | — |
| Stripe round-trip | 200–500 ms | — | — | — |

*Bảng 4.2: Kết quả benchmark mật mã (5000 vòng).*

**Phân tích overhead/1 request checkout:** JWT +0.001ms, HMAC +0.001ms, Vault unwrap +24.6ms (cold)/+0.001ms (warm), AES decrypt +0.001ms → tổng crypto cold ~3–28ms, warm ~0.003ms. Stripe 200–500ms là bottleneck thật → **crypto < 6% tổng latency**.

## 4.6. Đối chiếu tiêu chuẩn (OWASP / PCI DSS)

| Bộ tiêu chuẩn | Trước | Sau |
|---|---|---|
| Security tests PASS | 14/30 | 25/26 |
| OWASP ASVS L2 | 1P/5⚠/4❌ | **9P/3⚠/0❌** |
| OWASP API Top 10 | 2P/3⚠/2❌ | **10P/0⚠/0❌** |
| PCI DSS v4.0 | 2P/3⚠/3❌ | **8P/1⚠/0❌** |
| pip-audit CVEs | 40 | 8 (−80%) |

*Bảng 4.3: Tổng hợp Trước/Sau.* 3 mục ⚠ của ASVS do FLE chưa activate (V6/V8) và PostgreSQL password mặc định `123456` chưa đổi (V14/PCI Req 2.2).

## 4.7. Bàn luận
Kết quả khớp giả thuyết: overhead mật mã không đáng kể so với network/PSP. Nguồn rủi ro thực tế là **lỗi triển khai** (T1–T4) chứ không phải thuật toán. DEK caching giải quyết được nút thắt latency của Vault. *(Tham khảo thêm `docs/SECURITY_SYNTHESIS_PREDICTION.md`.)*

---

# Chương 5. KẾT LUẬN

## 5.1. Kết quả đạt được và trả lời câu hỏi nghiên cứu
- **RQ1:** Điểm yếu phổ biến nhất là **sai sót triển khai** — mô hình tin cậy sai (đọc header chưa verify), feature flag bảo mật bị tắt, error handling sai — không phải thuật toán yếu.
- **RQ2:** PSP tokenization **hiệu quả cao** — PAN không vào hệ thống, thu hẹp scope PCI xuống SAQ A-EP; overhead đến từ network (200–500ms) chứ không từ crypto; webhook HMAC verify chặn giả mạo.
- **RQ3:** Vault phù hợp lab/prototype (audit + AppRole + rotation), nhược điểm 24.6ms được khắc phục bằng DEK caching; production nên dùng Cloud KMS/HSM (10–20ms / ~1ms, hardware-backed).

## 5.2. Đóng góp
Một hệ thống TMĐT microservices tích hợp đầy đủ 8 cơ chế mật mã, chạy thật, kèm bộ đánh giá định lượng (26 tests + STRIDE + 3 tiêu chuẩn + benchmark) và danh mục lỗi triển khai điển hình.

## 5.3. Hạn chế
- **FLE** chưa activate runtime (cần Vault root token).
- **PostgreSQL** còn password mặc định `123456`.
- **mTLS mesh** đúng nghĩa còn ở mức thiết kế/backlog (uvicorn TLS không bắt tay được với Envoy BoringSSL; CA key cũ đã mất) — hiện các service chạy plain HTTP sau Envoy.
- **JWT ES256** mới migrate trên live (2026-06-03), **chưa đưa vào repo** (repo vẫn RS256).
- 1 test trượt do Kafka timeout (hạ tầng macOS), không phải lỗ hổng.

---

# Chương 6. HƯỚNG PHÁT TRIỂN
- Triển khai **mTLS sidecar mesh** (nginx/Envoy-sidecar) cho từng service.
- Port thay đổi **ES256** vào repo để vĩnh viễn; bổ sung key rotation tự động.
- Kích hoạt **FLE runtime** + đổi mật khẩu PostgreSQL.
- **cosign** ký artifact + k8s admission webhook (hoàn tất supply chain).
- Thay Vault bằng **Cloud KMS/HSM** cho production; mở rộng quy mô + load test diện rộng.

---

# TÀI LIỆU THAM KHẢO (chuẩn IEEE — cần hoàn thiện)

**Tiếng Anh (mẫu, cần bổ sung số trang/nhà xuất bản):**
- [1] E. Rescorla, "The Transport Layer Security (TLS) Protocol Version 1.3," RFC 8446, IETF, 2018.
- [2] D. Hardt, "The OAuth 2.0 Authorization Framework," RFC 6749, IETF, 2012.
- [3] N. Sakimura et al., "Proof Key for Code Exchange by OAuth Public Clients," RFC 7636, IETF, 2015.
- [4] H. Krawczyk et al., "HMAC: Keyed-Hashing for Message Authentication," RFC 2104, IETF, 1997.
- [5] OWASP Foundation, "Application Security Verification Standard v4.0," 2019.
- [6] OWASP Foundation, "API Security Top 10," 2023.
- [7] PCI Security Standards Council, "PCI DSS v4.0," 2022.
- [8] HashiCorp, "Vault Transit Secrets Engine Documentation."
- [9] Stripe, "Payment Methods & Tokenization Documentation."
- [10] Microsoft, "The STRIDE Threat Model."
- [11] National Institute of Standards and Technology, "Advanced Encryption Standard (AES)," FIPS PUB 197, 2001.
- [12] M. Dworkin, "Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC," NIST SP 800-38D, 2007.
- [13] National Institute of Standards and Technology, "Secure Hash Standard (SHS)," FIPS PUB 180-4, 2015.
- [14] H. Krawczyk, M. Bellare, and R. Canetti, "HMAC: Keyed-Hashing for Message Authentication," RFC 2104, IETF, 1997.
- [15] R. L. Rivest, A. Shamir, and L. Adleman, "A Method for Obtaining Digital Signatures and Public-Key Cryptosystems," Communications of the ACM, vol. 21, no. 2, pp. 120–126, 1978.
- [16] National Institute of Standards and Technology, "Digital Signature Standard (DSS)," FIPS PUB 186-4, 2013.
- [17] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," RFC 7519, IETF, 2015.
- [18] D. M'Raihi et al., "TOTP: Time-Based One-Time Password Algorithm," RFC 6238, IETF, 2011.
- [19] HashiCorp, "Vault Transit Secrets Engine Documentation."

> **GAP:** sắp xếp alphabet theo họ tác giả, tách mục tiếng Việt nếu có, bổ sung giáo trình NT219. Hiện đánh số [1]–[19] theo thứ tự xuất hiện để tiện đối chiếu khi viết.

---

# PHỤ LỤC
- **A.** Cấu trúc repository (cây thư mục `services/`, `infra/`, `docs/`, `scripts/`).
- **B.** Security libraries & versions (cryptography 46.0.6, python-jose 3.3.0, hvac 2.x, stripe 11.x, httpx 0.27, starlette 1.0.1, fastapi 0.115.x).
- **C.** Envoy JWT filter config + WAF Lua rules (đầy đủ).
- **D.** Vault Transit key provisioning script + AppRole.
- **E.** Kafka topics (`inventory.events`, `payment.events`, `audit-logs`).
- **F.** Hướng dẫn cài đặt/triển khai (từ `DEPLOY-GUIDE.md`, `TAILSCALE_DEPLOYMENT.md`).
- **G.** Bảng STRIDE đầy đủ (~50 threat + mitigation).
- **H.** Mã nguồn đầy đủ các cơ chế mật mã (hmac_signer, envelope_encryption, hmac_verification, migration 0007).

---

# DANH MỤC TỪ VIẾT TẮT (gom sẵn)
AEAD, AES, API, ASVS, CDN, CVE, DEK, DFD, FLE, GCM, HMAC, HSM, IDOR, IV, JWKS, JWT, KEK, KMS, MFA, mTLS, OIDC, PAN, PCI DSS, PII, PKCE, PSP, RBAC, SAQ, SAST, SQLi, SSRF, STRIDE, TDE, TLS, TOTP, TTL, WAF, XSS.
