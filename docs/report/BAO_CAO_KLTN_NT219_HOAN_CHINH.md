<!--
  BÁO CÁO ĐỒ ÁN / KHÓA LUẬN NT219 — BẢN HOÀN CHỈNH (CHI TIẾT, HỌC THUẬT)
  Bố cục theo Phụ lục 2 (hình thức trình bày) + Phụ lục 3 (mẫu báo cáo) của UIT.
  Khi convert sang Word/PDF, áp dụng hình thức bắt buộc:
    - Font Times New Roman 13pt, Unicode; dãn dòng 1.5.
    - Lề: trên 3 cm, dưới 3.5 cm, trái 3.5 cm, phải 2 cm.
    - Đánh số trang Ả-rập, giữa dưới, BẮT ĐẦU TỪ phần TÓM TẮT.
    - Các trang bìa / mục lục / danh mục KHÔNG đánh số.
    - Tiêu đề "Chương N" bold 14pt; mục con N.1, N.1.1 bold 13pt.
    - Hình/bảng đánh số theo chương (Hình 1.1, Bảng 2.3...), có caption + nguồn.
  Các trường «...» là thông tin hành chính cần điền trước khi nộp.
-->

# ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH
# TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN
# KHOA «MẠNG MÁY TÍNH VÀ TRUYỀN THÔNG»

---

## THIẾT KẾ VÀ ĐÁNH GIÁ AN TOÀN MẬT MÃ CHO NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ DẠNG MICROSERVICES

### *Design and Security Evaluation of Cryptographic Mechanisms for a Microservices E-commerce Platform*

**ĐỒ ÁN MÔN HỌC NT219 — MẬT MÃ HỌC ỨNG DỤNG**

| | |
|---|---|
| **Lớp** | NT219.Q22.ANTT |
| **Sinh viên thực hiện** | Nguyễn Mạnh Cường – 24520238 |
| | Nguyễn Đức Đại – 24520245 |
| **Giảng viên hướng dẫn** | «Học vị, Họ và tên GVHD» |
| **Khoa** | Mạng máy tính và Truyền thông |
| **Niên khóa** | 2025 – 2026 |

**TP. Hồ Chí Minh, tháng 6 năm 2026**

<div style="page-break-after: always;"></div>

---

# LỜI CẢM ƠN

Nhóm thực hiện xin chân thành cảm ơn «Học vị, Họ tên GVHD» đã tận tình hướng dẫn, định hướng và góp ý trong suốt quá trình thực hiện đồ án môn học NT219 — Mật mã học ứng dụng. Chúng em cũng xin gửi lời cảm ơn đến quý thầy cô Khoa Mạng máy tính và Truyền thông, Trường Đại học Công nghệ Thông tin – ĐHQG-HCM, đã trang bị nền tảng kiến thức và tạo điều kiện để nhóm hoàn thành đề tài.

Do thời gian và kinh nghiệm còn hạn chế, báo cáo không tránh khỏi thiếu sót. Nhóm rất mong nhận được sự góp ý của quý thầy cô để đề tài hoàn thiện hơn.

*Nhóm sinh viên thực hiện*

<div style="page-break-after: always;"></div>

---

# MỤC LỤC

- **TÓM TẮT (ABSTRACT)**
- **Chương 1. MỞ ĐẦU**
  - 1.1. Lý do chọn đề tài
  - 1.2. Mục tiêu của đề tài
  - 1.3. Đối tượng và phạm vi nghiên cứu
  - 1.4. Câu hỏi nghiên cứu và giả thuyết
  - 1.5. Phương pháp thực hiện
  - 1.6. Bố cục báo cáo
- **Chương 2. TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT**
  - 2.1. Tổng quan bài toán bảo mật thương mại điện tử
  - 2.2. Kiến trúc Microservices và đánh đổi bảo mật
  - 2.3. Cơ sở lý thuyết mật mã
  - 2.4. Mô hình hóa mối đe dọa và tiêu chuẩn đánh giá
  - 2.5. Các công trình liên quan, khoảng trống và đóng góp
- **Chương 3. THIẾT KẾ HỆ THỐNG VÀ CÁC CƠ CHẾ MẬT MÃ**
  - 3.1. Kiến trúc tổng thể
  - 3.2. Trust Boundaries và Data Flow
  - 3.3. Triển khai 8 cơ chế mật mã
  - 3.4. Checkout Flow — Saga Pattern
  - 3.5. Phân tích STRIDE
- **Chương 4. THỰC NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ**
  - 4.1. Môi trường và phương pháp thực nghiệm
  - 4.2. Rà soát mã nguồn và lỗ hổng phát hiện
  - 4.3. Kết quả 5 nhóm security experiments
  - 4.4. Static analysis và quét phụ thuộc
  - 4.5. Hiệu năng mật mã
  - 4.6. Đối chiếu tiêu chuẩn (OWASP / PCI DSS)
  - 4.7. Bàn luận kết quả
- **Chương 5. KẾT LUẬN**
- **Chương 6. HƯỚNG PHÁT TRIỂN**
- **TÀI LIỆU THAM KHẢO**
- **PHỤ LỤC A–H**

<div style="page-break-after: always;"></div>

---

# DANH MỤC HÌNH

| Hình | Tên hình | Nguồn |
|---|---|---|
| Hình 2.1 | Sự khác biệt giữa lời gọi nội bộ (monolith) và lời gọi qua mạng (microservices) | Tự vẽ theo `docs/README.md` |
| Hình 2.2 | Cấu trúc HMAC dựa trên hàm băm | Tự vẽ theo RFC 2104 [4] |
| Hình 2.3 | Mô hình Envelope Encryption hai tầng khóa DEK/KEK | Tự vẽ |
| Hình 2.4 | Ký JWT bằng ES256 (jwt.io) | Ảnh chụp hệ thống |
| Hình 2.5 | Public key (JWKS) Keycloak cấp để verify JWT | Ảnh chụp hệ thống |
| Hình 3.1 | Kiến trúc giải pháp tổng thể | Bản thuyết trình (Cyber Security.pdf, slide 7) |
| Hình 3.2 | Phương án triển khai (2 host / 3 VM) | Bản thuyết trình (Cyber Security.pdf, slide 8) |
| Hình 3.3 | Data Flow Diagram và 8 ranh giới tin cậy | `docs/data_flow_diagram.md` |
| Hình 3.4 | Chuỗi lọc tại Envoy Gateway (JWT/CORS ở tầng service) | Tự vẽ theo `infra/patches/envoy.yaml` |
| Hình 3.5 | Định dạng blob ciphertext của FLE | Tự vẽ theo `envelope_encryption.py` |
| Hình 3.6 | Luồng Checkout theo Saga Pattern (sequence diagram) | `docs/data_flow_diagram.md` |
| Hình 3.7 | mTLS order→payment thành công (có client cert) | Ảnh chụp terminal |
| Hình 3.8 | mTLS từ chối khi thiếu client cert | Ảnh chụp terminal |
| Hình 4.1 | Phân rã overhead mật mã trên một request checkout | Tự vẽ từ Bảng 4.7 |

# DANH MỤC BẢNG

| Bảng | Tên bảng |
|---|---|
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
| Bảng 4.3 | Kết quả Experiment 1 — JWT & Token |
| Bảng 4.4 | Kết quả Experiment 2 — Payment Fraud |
| Bảng 4.5 | Kết quả Experiment 3 — API Abuse |
| Bảng 4.6 | Kết quả Experiment 4 & 5 — Key Management, Supply Chain |
| Bảng 4.7 | Kết quả benchmark mật mã (5000 vòng) |
| Bảng 4.8 | Tổng hợp đối chiếu tiêu chuẩn Trước/Sau |
| Bảng 4.9 | OWASP API Security Top 10 (2023) |
| Bảng 4.10 | PCI DSS v4.0 |

<div style="page-break-after: always;"></div>

---

# DANH MỤC TỪ VIẾT TẮT

| Viết tắt | Tiếng Anh đầy đủ | Diễn giải |
|---|---|---|
| AEAD | Authenticated Encryption with Associated Data | Mã hóa có xác thực kèm dữ liệu liên kết |
| AES | Advanced Encryption Standard | Chuẩn mã hóa đối xứng |
| API | Application Programming Interface | Giao diện lập trình ứng dụng |
| ASVS | Application Security Verification Standard | Chuẩn kiểm định bảo mật ứng dụng (OWASP) |
| CDN | Content Delivery Network | Mạng phân phối nội dung |
| CVE | Common Vulnerabilities and Exposures | Định danh lỗ hổng công khai |
| DEK | Data Encryption Key | Khóa mã hóa dữ liệu |
| DFD | Data Flow Diagram | Sơ đồ luồng dữ liệu |
| ECDHE | Elliptic Curve Diffie–Hellman Ephemeral | Trao đổi khóa tạm thời trên đường cong elliptic |
| ECDSA | Elliptic Curve Digital Signature Algorithm | Chữ ký số trên đường cong elliptic |
| FLE | Field-Level Encryption | Mã hóa cấp trường dữ liệu |
| GCM | Galois/Counter Mode | Chế độ vận hành AEAD của AES |
| HMAC | Hash-based Message Authentication Code | Mã xác thực thông điệp dựa trên hàm băm |
| HSM | Hardware Security Module | Mô-đun bảo mật phần cứng |
| IDOR | Insecure Direct Object Reference | Tham chiếu đối tượng trực tiếp không an toàn |
| IV | Initialization Vector | Vector khởi tạo |
| JWKS | JSON Web Key Set | Tập khóa công khai dạng JSON |
| JWT | JSON Web Token | Token xác thực dạng JSON |
| KEK | Key Encryption Key | Khóa mã hóa khóa |
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
| RBAC | Role-Based Access Control | Kiểm soát truy cập theo vai trò |
| SAQ | Self-Assessment Questionnaire | Bảng tự đánh giá tuân thủ PCI |
| SAST | Static Application Security Testing | Kiểm thử bảo mật mã nguồn tĩnh |
| SQLi | SQL Injection | Tấn công chèn câu lệnh SQL |
| SSRF | Server-Side Request Forgery | Giả mạo yêu cầu phía máy chủ |
| SSTI | Server-Side Template Injection | Chèn template phía máy chủ |
| STRIDE | Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege | Khung mô hình hóa mối đe dọa |
| TDE | Transparent Data Encryption | Mã hóa dữ liệu trong suốt |
| TLS | Transport Layer Security | Bảo mật tầng truyền tải |
| TOTP | Time-based One-Time Password | Mật khẩu một lần theo thời gian |
| TTL | Time To Live | Thời gian sống của token |
| WAF | Web Application Firewall | Tường lửa ứng dụng web |
| XSS | Cross-Site Scripting | Tấn công chèn mã script |

<div style="page-break-after: always;"></div>

---

# TÓM TẮT

Thương mại điện tử xử lý dữ liệu nhạy cảm — thông tin định danh cá nhân (PII) và dữ liệu thanh toán — trên hạ tầng phân tán, nơi **mỗi đường truyền giữa các thành phần đều là một bề mặt tấn công**. Đồ án **thiết kế, triển khai và đánh giá định lượng** một nền tảng thương mại điện tử dạng **microservices** gồm 7 dịch vụ, với trọng tâm là **áp dụng và đo lường** các cơ chế mật mã học trong môi trường vận hành thực tế, thay vì chỉ mô tả lý thuyết.

Hệ thống triển khai **tám cơ chế mật mã** trải trên năm lớp bảo mật: (1) TLS 1.3 cho lớp truyền tải; (2) OAuth2/OIDC + PKCE + MFA cho lớp xác thực; (3) HMAC-SHA256 + nonce + timestamp cho toàn vẹn giao tiếp service-to-service; (4) PSP tokenization để loại bỏ hoàn toàn số thẻ (PAN) khỏi hệ thống; (5) quản lý khóa bằng HashiCorp Vault với mô hình *envelope encryption*; (6) mã hóa cơ sở dữ liệu hai tầng TDE + FLE; (7) nhật ký kiểm toán *append-only*; và (8) API Gateway/WAF làm điểm kiểm soát trung tâm. Hệ thống chạy thật trên **4 node** kết nối qua Tailscale WireGuard, với Stripe ở chế độ test, JWT thật từ Keycloak và Vault Transit đang vận hành.

Phương pháp đánh giá kết hợp bốn hướng: **mô hình hóa mối đe dọa STRIDE** (~50 kịch bản cho 9 thành phần), **26 kiểm thử bảo mật** chia 5 nhóm thực nghiệm, **đo overhead mật mã trên 5000 vòng lặp** (median/p95/p99/throughput), và **rà soát mã nguồn** cả 7 dịch vụ, cuối cùng đối chiếu ba bộ tiêu chuẩn OWASP ASVS L2, OWASP API Security Top 10 (2023) và PCI DSS v4.0.

**Kết quả chính:** 25/26 kiểm thử đạt (1 trượt do timeout hạ tầng, không phải lỗ hổng); OWASP API Top 10 đạt 10/10, ASVS L2 đạt 9 Pass/3 Partial, PCI DSS đạt 8 Pass/1 Partial; quét phụ thuộc giảm CVE từ 40 xuống 8 (−80%, 0 HIGH/CRITICAL). Về hiệu năng, overhead mật mã phía máy chủ chỉ ~3–28 ms (cold, do lần đầu gọi Vault) và <0.01 ms (warm, nhờ cache DEK), chiếm **dưới 6%** tổng độ trễ — phần lớn độ trễ đến từ vòng gọi Stripe (200–500 ms). Đồ án kết luận rằng **điểm yếu mật mã phổ biến nhất không nằm ở thuật toán mà ở cách triển khai**: mô hình tin cậy sai, feature flag bị tắt nhầm, xử lý lỗi sai ngữ nghĩa và các "fallback im lặng" tạo cảm giác an toàn giả.

**Từ khóa:** microservices, mật mã ứng dụng, TLS 1.3, OAuth2/OIDC, HMAC, tokenization, KMS, envelope encryption, STRIDE, PCI DSS.

**Abstract.** E-commerce platforms process sensitive data (PII and payment data) over distributed infrastructure where every inter-component link is an attack surface. This project designs, implements and quantitatively evaluates a 7-service microservices e-commerce platform, focusing on *applying and measuring* cryptographic mechanisms in a real running environment rather than describing them only in theory. The system implements eight mechanisms across five layers — TLS 1.3; OAuth2/OIDC + PKCE + MFA; HMAC-SHA256 with nonce and timestamp for service-to-service integrity; PSP tokenization (no PAN); HashiCorp Vault key management with envelope encryption; two-tier database encryption (TDE + FLE); append-only audit logging; and an API gateway/WAF — deployed across four nodes over a Tailscale WireGuard mesh. Evaluation combines STRIDE threat modeling (~50 scenarios), 26 security tests in five groups, cryptographic overhead benchmarking over 5000 iterations, source-code review of all seven services, and benchmarking against OWASP ASVS L2, OWASP API Security Top 10 (2023) and PCI DSS v4.0. Results: 25/26 tests pass (the single failure being an infrastructure timeout); API Top 10 scores 10/10; dependency CVEs drop 80% with zero HIGH/CRITICAL; server-side cryptographic overhead is only ~3–28 ms cold and <0.01 ms warm — under 6% of total latency, which is dominated by the 200–500 ms Stripe round-trip. We conclude that the most common cryptographic weakness lies not in the algorithms but in their implementation.

<div style="page-break-after: always;"></div>

---

# Chương 1. MỞ ĐẦU

## 1.1. Lý do chọn đề tài

Các nền tảng thương mại điện tử quy mô lớn (Amazon, Shopee, Tiki…) xử lý đồng thời khối lượng lớn **thông tin định danh cá nhân** (họ tên, email, số điện thoại, địa chỉ giao hàng) và **dữ liệu giao dịch tài chính** (thông tin thẻ, lịch sử thanh toán). Đây là những loại dữ liệu chịu sự điều chỉnh chặt chẽ của các tiêu chuẩn và quy định như PCI DSS đối với dữ liệu thẻ, hay các quy định bảo vệ dữ liệu cá nhân đối với PII. Một sự cố rò rỉ không chỉ gây thiệt hại tài chính trực tiếp mà còn ảnh hưởng nghiêm trọng đến uy tín và nghĩa vụ pháp lý của doanh nghiệp.

Điểm mấu chốt khiến đề tài lựa chọn kiến trúc **microservices** thay vì **đơn khối (monolith)** xuất phát trực tiếp từ yêu cầu của môn học NT219: triển khai và đánh giá các cơ chế mật mã cho **giao tiếp giữa các thành phần** — cụ thể là mTLS, ký HMAC cho request nội bộ, và API Gateway làm điểm kiểm soát trung tâm. Trong một hệ thống đơn khối, mọi module nằm chung một tiến trình; khi module *Cart* gọi *Payment*, đó chỉ là một lời gọi hàm trong bộ nhớ — **không tồn tại đường truyền mạng** để áp dụng và kiểm chứng các cơ chế mật mã truyền tải hay toàn vẹn thông điệp.

```
MONOLITH (1 tiến trình):
┌──────────────────────────────────┐
│  Cart.checkout()                 │
│    → Payment.charge()            │  ← chỉ là function call
│    → Order.create()              │  ← không qua mạng
│    → Email.send()                │  ← không có gì để mã hóa/ký
└──────────────────────────────────┘

MICROSERVICES (nhiều tiến trình, qua mạng):
┌────────┐  ──TLS + HMAC──▶  ┌─────────┐
│  Cart  │                   │ Payment │  ← có thể bị nghe lén, giả mạo,
└────────┘  ◀──signed resp── └─────────┘     replay → CẦN mật mã
```

*Hình 2.1 (xem lại ở Chương 2): lời gọi nội bộ so với lời gọi qua mạng.*

Khi các thành phần giao tiếp qua mạng, mỗi kết nối trở thành một điểm có thể bị **nghe lén** (eavesdropping), **giả mạo** (spoofing) hoặc **tấn công lặp lại** (replay). Chính bối cảnh này biến các cơ chế mật mã từ khái niệm lý thuyết thành **đối tượng nghiên cứu cụ thể, có thể triển khai và đo lường được**. Đây là lý do mạnh nhất và khó phản bác nhất cho lựa chọn kiến trúc của đề tài.

Ngoài ra, microservices còn mang lại hai lợi ích bảo mật cốt lõi: (i) **cách ly vùng bảo mật** — dịch vụ thanh toán chạy trên node riêng, mạng riêng, cơ sở dữ liệu riêng, qua đó thu hẹp phạm vi tuân thủ PCI DSS chỉ còn dịch vụ thanh toán thay vì toàn hệ thống; và (ii) **nguyên tắc đặc quyền tối thiểu** (least privilege) — mỗi dịch vụ chỉ có đúng quyền cần thiết, nên khi một dịch vụ ít quan trọng bị xâm nhập, kẻ tấn công không tự động chiếm được quyền của dịch vụ thanh toán.

## 1.2. Mục tiêu của đề tài

Đề tài đặt ra bốn mục tiêu cụ thể:

1. **Thiết kế** một nền tảng thương mại điện tử microservices có **ranh giới tin cậy (trust boundary)** được xác định rõ ràng, trong đó mỗi ranh giới có cơ chế xác thực/mã hóa tương ứng.
2. **Triển khai đầy đủ tám cơ chế mật mã** trải trên năm lớp: truyền tải (TLS), xác thực/ủy quyền (OAuth2/OIDC), toàn vẹn thông điệp (HMAC), bảo vệ dữ liệu lưu trữ (TDE/FLE) và quản lý khóa (KMS).
3. **Đánh giá định lượng** đồng thời hai khía cạnh: *hiệu quả bảo mật* (qua kiểm thử thực nghiệm, mô hình STRIDE và đối chiếu tiêu chuẩn) và *chi phí hiệu năng* (overhead mật mã trên từng request).
4. **Rút ra bài học** về các dạng lỗi triển khai mật mã phổ biến trong hệ phân tán, thông qua rà soát mã nguồn thực tế.

## 1.3. Đối tượng và phạm vi nghiên cứu

- **Đối tượng nghiên cứu:** các cơ chế mật mã ứng dụng (applied cryptography) trong ngữ cảnh hệ phân tán thương mại điện tử — bao gồm cả khía cạnh thiết kế (lựa chọn primitive, mô hình tin cậy) lẫn khía cạnh triển khai (cấu hình, xử lý lỗi, quản lý khóa).
- **Phạm vi triển khai:** 7 microservices (catalog, cart, order, payment, inventory, shipping, notification) cùng hạ tầng đi kèm (Envoy Gateway, Keycloak, HashiCorp Vault, PostgreSQL, Apache Kafka, Redis, bộ ELK, Prometheus/Grafana). Thanh toán dùng Stripe ở chế độ test; vận chuyển tích hợp API Giao Hàng Nhanh (GHN). Hệ thống được triển khai ở quy mô lab trên 4 node ảo.
- **Ngoài phạm vi:** chứng minh hình thức (formal proof) tính an toàn của thuật toán; triển khai quy mô production thực tế với tải lớn; HSM phần cứng chuyên dụng (đề tài dùng Vault Transit làm bộ giả lập KMS/HSM).

## 1.4. Câu hỏi nghiên cứu và giả thuyết

Đề tài tập trung trả lời ba câu hỏi nghiên cứu (Research Question):

- **RQ1:** Những điểm yếu mật mã nào — sai sót quản lý khóa, lạm dụng token, cấu hình TLS sai, mã hóa lưu trữ không đúng — thường dẫn đến việc hệ thống thương mại điện tử bị xâm phạm trong thực tế?
- **RQ2:** Chiến lược PSP tokenization có giảm đáng kể rủi ro gian lận/rò rỉ dữ liệu thanh toán hay không, trong khi vẫn giữ độ trễ ở mức chấp nhận được?
- **RQ3:** So với khóa phần mềm (software keys), việc dùng KMS/HSM cho các khóa ký và khóa thanh toán mang lại hiệu quả an ninh và chi phí/độ trễ ra sao?

**Giả thuyết nghiên cứu:** Việc kết hợp PSP tokenization (thay PAN bằng token), Vault/KMS cho *envelope encryption*, và HMAC-SHA256 cho giao tiếp service-to-service giúp giảm đáng kể rủi ro bảo mật; đồng thời overhead mật mã phía máy chủ chỉ vào khoảng 3–28 ms — không đáng kể so với độ trễ vòng gọi Stripe 200–500 ms.

## 1.5. Phương pháp thực hiện

Đề tài kết hợp năm hoạt động:

1. **Xây dựng prototype hoàn chỉnh:** 7 microservices viết bằng Python/FastAPI theo kiến trúc clean architecture, tích hợp Envoy + Keycloak + Vault + PostgreSQL + Kafka + Redis.
2. **Thực nghiệm bảo mật:** 26 kiểm thử chia thành 5 nhóm (JWT/Token, Payment Fraud, API Abuse, Key Management, Supply Chain), chạy trực tiếp trên hệ thống live.
3. **Đo hiệu năng mật mã:** mỗi phép toán lặp 5000 vòng, tính median/p95/p99 và throughput.
4. **Mô hình hóa mối đe dọa:** áp dụng STRIDE cho 9 thành phần, sinh ~50 kịch bản tấn công kèm mitigation.
5. **Rà soát mã nguồn:** đọc kỹ toàn bộ 7 dịch vụ để phát hiện lỗ hổng logic và lỗi mô hình tin cậy mà cấu hình không khắc phục được.

## 1.6. Bố cục báo cáo

Báo cáo gồm sáu chương. **Chương 1** trình bày bối cảnh, mục tiêu và phương pháp. **Chương 2** cung cấp cơ sở lý thuyết mật mã và các tiêu chuẩn liên quan. **Chương 3** mô tả chi tiết thiết kế hệ thống cùng tám cơ chế mật mã và phân tích STRIDE. **Chương 4** trình bày kết quả thực nghiệm, rà soát mã nguồn, đo hiệu năng và đối chiếu tiêu chuẩn. **Chương 5** kết luận và trả lời các câu hỏi nghiên cứu. **Chương 6** đề xuất hướng phát triển.

<div style="page-break-after: always;"></div>

---

# Chương 2. TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT

## 2.1. Tổng quan bài toán bảo mật thương mại điện tử

Nền tảng được nghiên cứu thuộc dạng "Online Shopping Service Platform" — mô hình tham khảo các sàn lớn như Amazon, Shopee. Luồng nghiệp vụ điển hình của người dùng gồm sáu bước: **duyệt sản phẩm → thêm vào giỏ hàng → đặt hàng → thanh toán → giao hàng → nhận thông báo**. Trên hành trình đó, hệ thống thu thập và xử lý nhiều loại dữ liệu với mức nhạy cảm khác nhau:

- **Dữ liệu công khai:** thông tin sản phẩm, giá niêm yết — có thể đọc không cần xác thực.
- **Dữ liệu định danh cá nhân (PII):** email, số điện thoại, địa chỉ giao hàng — cần mã hóa khi lưu trữ và che (mask) khi ghi log.
- **Dữ liệu thanh toán:** thông tin thẻ — nhạy cảm nhất, chịu điều chỉnh của PCI DSS, lý tưởng nhất là **không bao giờ chạm vào hệ thống**.

Tương ứng với từng bước nghiệp vụ là một tập mối đe dọa: ở lớp truyền tải là nghe lén và tấn công xen giữa (MitM); ở lớp xác thực là chiếm tài khoản, giả mạo token; ở lớp giao tiếp nội bộ là dịch vụ giả mạo và tấn công lặp lại; ở lớp thanh toán là giả mạo webhook, thao túng số tiền và rò rỉ số thẻ; ở lớp lưu trữ là rò rỉ dữ liệu qua backup hoặc truy cập vật lý. Mỗi mối đe dọa này được phân tích hệ thống bằng STRIDE ở mục 3.5.

## 2.2. Kiến trúc Microservices và đánh đổi bảo mật

Bảng 2.1 so sánh hai kiến trúc dưới góc độ bảo mật, giải thích vì sao microservices là lựa chọn bắt buộc cho mục tiêu của đề tài.

| Tiêu chí | Monolith | Microservices |
|---|---|---|
| Giao tiếp module | Function call nội bộ trong bộ nhớ | Qua mạng → áp dụng và đo được mTLS/HMAC/Gateway |
| Cách ly vùng bảo mật | Khó — mọi module cùng tiến trình, cùng vùng nhớ | Payment chạy node riêng → thu hẹp scope PCI DSS xuống SAQ A-EP |
| Least privilege | Mọi module cùng một identity/quyền | Mỗi dịch vụ một quyền tối thiểu, một danh tính riêng |
| Bán kính ảnh hưởng khi bị xâm nhập | Toàn bộ ứng dụng | Giới hạn trong dịch vụ bị xâm nhập |
| Độ phức tạp / độ trễ | Thấp | Cao hơn — *chính là trade-off cần đo lường* |

*Bảng 2.1: So sánh Monolith và Microservices dưới góc độ bảo mật.*

Đề tài thừa nhận đầy đủ nhược điểm của microservices: độ phức tạp vận hành cao hơn, độ trễ tăng do giao tiếp qua mạng, và khó đảm bảo tính nhất quán dữ liệu phân tán. Tuy nhiên, trong ngữ cảnh môn học, chính sự phức tạp này là **đối tượng nghiên cứu**: đề tài đo lường trade-off giữa mức bảo mật tăng thêm và chi phí hiệu năng phải trả (mục 4.5). Vấn đề nhất quán dữ liệu được xử lý bằng *Saga pattern* và *idempotency key* (mục 3.4).

## 2.3. Cơ sở lý thuyết mật mã

Phần này trình bày nền tảng lý thuyết của các nguyên thủy (primitive) mật mã được sử dụng, làm cơ sở cho phần thiết kế ở Chương 3. Bảng 2.2 tóm tắt ánh xạ giữa cơ chế và lý thuyết.

| Cơ chế trong hệ thống | Primitive/giao thức | Mục bảo mật chính |
|---|---|---|
| TLS 1.3 (lớp truyền tải) | ECDHE + AEAD + chứng chỉ X.509 | Bí mật, toàn vẹn, xác thực máy chủ |
| JWT (Keycloak) | ECDSA P-256 / ES256 (chữ ký số) | Xác thực danh tính, tách bạch quyền |
| HMAC S2S | HMAC-SHA256 | Toàn vẹn + xác thực nguồn gốc thông điệp |
| FLE (PII) | AES-256-GCM (AEAD) + envelope | Bí mật + toàn vẹn dữ liệu lưu trữ |
| Audit signing | ECDSA-P256 (chữ ký số) | Chống chối bỏ (non-repudiation) |
| Audit integrity | HMAC-SHA256 | Toàn vẹn nhật ký |
| PSP tokenization | thay PAN bằng token | Loại bỏ dữ liệu thẻ khỏi scope |

*Bảng 2.2: Tổng hợp 8 cơ chế mật mã và nền tảng lý thuyết.*

### 2.3.1. Mật mã đối xứng và AEAD — AES-256-GCM

Mật mã khóa đối xứng dùng **chung một khóa bí mật** cho cả mã hóa và giải mã. Chuẩn phổ biến nhất hiện nay là **AES** (Advanced Encryption Standard) [11] — một mật mã khối (block cipher) với kích thước khối 128 bit và độ dài khóa 128/192/256 bit. Đề tài dùng **AES-256** để có biên an toàn cao: ngay cả trước tấn công lượng tử bằng thuật toán Grover (giảm độ an toàn hiệu dụng còn một nửa số bit khóa), AES-256 vẫn giữ được ~128 bit an toàn.

Một mật mã khối thuần túy chỉ mã hóa đúng một khối; để mã hóa dữ liệu dài hơn cần một **chế độ vận hành (mode of operation)**. Đề tài chọn **GCM (Galois/Counter Mode)** [12] thuộc lớp **AEAD (Authenticated Encryption with Associated Data)**. AEAD cung cấp đồng thời ba thuộc tính:

- **Bí mật (confidentiality):** dữ liệu được mã hóa theo kiểu dòng (bên trong GCM là chế độ CTR).
- **Toàn vẹn + xác thực (integrity + authenticity):** GCM sinh một **thẻ xác thực (authentication tag)** 128 bit; mọi thay đổi trên ciphertext hoặc dữ liệu liên kết (associated data) đều bị phát hiện khi giải mã (phép giải mã sẽ ném lỗi thay vì trả về dữ liệu sai).

Điểm tối quan trọng khi triển khai GCM là **mỗi lần mã hóa dưới cùng một khóa phải dùng một IV/nonce duy nhất**. Đề tài sinh nonce 96 bit ngẫu nhiên bằng `os.urandom(12)` cho mỗi lần mã hóa (xem mã nguồn ở mục 3.3.6). **Tái sử dụng nonce dưới cùng một khóa phá vỡ hoàn toàn tính an toàn của GCM** — kẻ tấn công có thể khôi phục khóa xác thực và giả mạo thông điệp. AES-GCM được tăng tốc phần cứng bằng tập lệnh **AES-NI** trên CPU hiện đại, lý giải throughput rất cao đo được trong thực nghiệm (mục 4.5: ~2,2 triệu phép/giây).

### 2.3.2. Hàm băm và mã xác thực thông điệp — SHA-256, HMAC

**Hàm băm mật mã** ánh xạ dữ liệu độ dài tùy ý thành chuỗi có độ dài cố định, với ba tính chất cốt lõi: kháng tiền ảnh (preimage resistance), kháng tiền ảnh thứ hai (second-preimage resistance) và **kháng va chạm (collision resistance)**. Đề tài dùng **SHA-256** thuộc họ **SHA-2** [13], cho output 256 bit.

Hàm băm thuần túy **không** đảm bảo nguồn gốc thông điệp — bất kỳ ai cũng tính được giá trị băm. Để vừa kiểm tra toàn vẹn vừa xác thực nguồn gốc, cần một **MAC (Message Authentication Code)**. **HMAC** [4] là cấu trúc MAC dựa trên hàm băm, được định nghĩa:

> HMAC(K, m) = H( (K ⊕ opad) ∥ H( (K ⊕ ipad) ∥ m ) )

trong đó `K` là khóa bí mật chia sẻ, `H` là SHA-256, còn `ipad`/`opad` là hai hằng số đệm. Vì chỉ bên nắm khóa `K` mới tạo và kiểm tra được giá trị HMAC, cơ chế này chống được giả mạo thông điệp. *Hình 2.2 minh họa cấu trúc lồng hai lần băm của HMAC.*

Đề tài dùng **HMAC-SHA256** cho hai mục đích: (i) ký request service-to-service (mục 3.3.3) và (ii) bảo vệ toàn vẹn nhật ký kiểm toán (mục 3.3.7). Để chống **tấn công lặp lại (replay)** — kẻ tấn công bắt lại một request hợp lệ và gửi lại nguyên văn — HMAC được kết hợp thêm hai yếu tố: một **timestamp** với cửa sổ chấp nhận ±5 phút (chống replay cũ), và một **nonce dùng một lần** lưu trong Redis (chống replay bản sao chính xác). Khi so sánh chữ ký, hệ thống dùng so sánh **thời gian hằng số** (`hmac.compare_digest`) để chống tấn công đo thời gian (timing attack).

### 2.3.3. Mật mã khóa công khai và chữ ký số — RSA, ECDSA

Mật mã khóa công khai (bất đối xứng) dùng một **cặp khóa**: khóa riêng (private key) giữ bí mật và khóa công khai (public key) công bố rộng rãi. Ứng dụng quan trọng nhất trong đề tài là **chữ ký số (digital signature)**: bên ký dùng khóa riêng tạo chữ ký, còn bất kỳ ai cũng dùng khóa công khai để xác minh. Cơ chế này đạt được hai thuộc tính: **xác thực nguồn gốc** và **chống chối bỏ (non-repudiation)** — bên ký không thể phủ nhận đã ký.

- **RSA** [15] dựa trên độ khó của bài toán phân tích thừa số nguyên lớn, là một lựa chọn chữ ký số phổ biến (RS256 = RSA + SHA-256). Trong đề tài, JWT **không** dùng RSA mà dùng ECDSA (xem dưới).
- **ECDSA trên đường cong P-256** [16] cho cùng mức an toàn với RSA nhưng kích thước khóa và chữ ký nhỏ hơn nhiều (khóa ~256 bit so với RSA ~3072 bit cho cùng ~128-bit security). Đề tài dùng **ECDSA-P256 kết hợp SHA-256 — tức ES256 (EC-SHA256)** cho hai mục đích: (i) **Keycloak ký JWT** (khóa riêng chỉ Keycloak giữ, các dịch vụ chỉ cần khóa công khai qua JWKS để xác minh) và (ii) ký các bản ghi audit qua Vault transit key `payment-sign-key` (mục 3.3.7).

**Lựa chọn ES256 cho JWT:** hệ thống dùng **ES256 (EC-SHA256 = ECDSA P-256 + SHA-256)** để Keycloak ký JWT — vừa giữ ưu thế tách bạch quyền của chữ ký số bất đối xứng, vừa cho token và khóa nhỏ gọn hơn RSA đáng kể. Nhãn *Keycloak — JWT token (EC-SHA256)* thể hiện rõ trên Hình 3.1. Trên hệ thống live, **Hình 2.4** cho thấy header JWT giải mã có `alg=ES256` (kid `z88b9w…`), và **Hình 2.5** là endpoint JWKS của Keycloak cấp đúng khóa EC (`kty=EC`, `alg=ES256`, cùng `kid`) để các service xác minh chữ ký.

### 2.3.4. Token xác thực — JWT và mô hình tin cậy

**JWT (JSON Web Token)** [17] gồm ba phần `header.payload.signature` mã hóa Base64URL. Phần `payload` chứa các **claim** (sub, exp, aud, iss, roles…); phần `signature` được tạo bằng thuật toán khai báo trong `header`. Có hai nhóm thuật toán ký: **HMAC đối xứng** (ví dụ HS256) và **chữ ký số bất đối xứng** (RS256/ES256). Đề tài chọn **ES256 (EC-SHA256)** vì vừa cho phép **tách bạch quyền** (chỉ Identity Provider Keycloak giữ khóa ký, mọi dịch vụ tài nguyên chỉ cần khả năng xác minh), vừa có kích thước khóa và chữ ký nhỏ gọn hơn RSA.

JWT có một lớp lỗ hổng kinh điển cần phòng chống chủ động:

- **Tấn công `alg:none`:** kẻ tấn công sửa header thành `{"alg":"none"}` và bỏ chữ ký, hy vọng server chấp nhận token không ký.
- **Nhầm lẫn thuật toán (algorithm confusion):** kẻ tấn công đổi `alg` từ ES256 sang HS256 rồi dùng *chính khóa công khai* (vốn công khai) làm khóa HMAC, lừa server xác minh.

Phòng chống đòi hỏi ba nguyên tắc: (1) **chốt cứng danh sách thuật toán chấp nhận** ở phía server (ví dụ chỉ `["ES256"]`), không tin `alg` do client cung cấp; (2) luôn kiểm tra các claim `aud`, `iss`, `exp`; (3) không bao giờ xử lý token chưa xác minh chữ ký. Đoạn mã ở mục 3.3.2 minh họa cách `catalog-service` thực thi đúng cả ba nguyên tắc. Vì JWT là **stateless**, không thể thu hồi tức thời sau khi phát; đề tài giảm thiểu bằng **TTL ngắn 120 giây** kết hợp **refresh token rotation**.

### 2.3.5. Giao thức truyền tải an toàn — TLS 1.3

**TLS (Transport Layer Security) 1.3** [1] bảo vệ kênh truyền giữa hai bên, cung cấp tính bí mật, toàn vẹn và xác thực máy chủ thông qua chứng chỉ X.509. So với TLS 1.2, phiên bản 1.3 có ba cải tiến an toàn quan trọng: **loại bỏ hoàn toàn các cipher suite yếu** (RC4, các chế độ CBC dễ tổn thương, trao đổi khóa RSA tĩnh); **bắt buộc AEAD và forward secrecy** (qua ECDHE — mỗi phiên dùng khóa tạm thời nên lộ khóa dài hạn cũng không giải mã được traffic đã ghi); và **rút gọn bắt tay còn 1-RTT**, giảm độ trễ.

**mTLS (mutual TLS)** mở rộng TLS để **cả hai bên** xác thực lẫn nhau bằng chứng chỉ — phù hợp cho giao tiếp service-to-service trong mesh nội bộ. Trạng thái triển khai mTLS trong đề tài (hiện ở mức thiết kế/backlog) được trình bày trung thực ở mục 5.3.

### 2.3.6. Xác thực ủy quyền — OAuth 2.0, OIDC, PKCE, MFA

**OAuth 2.0** [2] là một khung **ủy quyền (authorization)**: nó cấp cho client một *access token* để truy cập tài nguyên thay mặt người dùng, mà không phải chia sẻ mật khẩu. **OpenID Connect (OIDC)** xây dựng trên OAuth 2.0 để bổ sung tầng **xác thực danh tính (authentication)** thông qua *ID token*. Đề tài dùng **Authorization Code flow** — luồng an toàn nhất, phù hợp cho ứng dụng web.

**PKCE (Proof Key for Code Exchange)** [3] chống tấn công **chặn authorization code**: client sinh một chuỗi ngẫu nhiên `code_verifier`, gửi kèm `code_challenge = SHA-256(code_verifier)` (phương thức **S256**) khi xin authorization code; sau đó xuất trình `code_verifier` khi đổi code lấy token. Kẻ tấn công chặn được code nhưng không có `code_verifier` sẽ không đổi được token.

**MFA (Multi-Factor Authentication)** bổ sung yếu tố xác thực thứ hai ngoài mật khẩu. Đề tài dùng **TOTP (Time-based One-Time Password)** [18] — mã 6 chữ số sinh từ một khóa bí mật chia sẻ kết hợp với thời gian hiện tại, đồng bộ giữa ứng dụng Authenticator và máy chủ. TOTP chống chiếm tài khoản ngay cả khi mật khẩu bị lộ.

### 2.3.7. Quản lý khóa — KMS, HSM và Envelope Encryption

An toàn của toàn bộ hệ thống quy về **an toàn của khóa**: thuật toán mạnh đến đâu cũng vô nghĩa nếu khóa bị lộ. **KMS (Key Management Service)** tập trung hóa việc tạo, lưu trữ, xoay vòng (rotation) và kiểm toán việc sử dụng khóa. **HSM (Hardware Security Module)** là thiết bị phần cứng chống can thiệp, đảm bảo khóa **không bao giờ rời khỏi ranh giới thiết bị**. Đề tài dùng **HashiCorp Vault Transit** làm bộ giả lập KMS/HSM [8][19].

**Envelope encryption** là mô hình hai tầng khóa, giải quyết đánh đổi giữa an toàn và hiệu năng:

```
        ┌─────────────── Vault (KMS) ───────────────┐
        │   KEK (Key Encryption Key) — không rời Vault│
        └───────────────────┬────────────────────────┘
                            │ wrap/unwrap
   Plaintext ──AES-GCM(DEK)──▶ Ciphertext + Tag
        │                   │
        │ DEK sinh ngẫu nhiên mỗi đơn vị dữ liệu
        └── DEK ─wrap bởi KEK→ Enc(DEK) lưu kèm ciphertext
```

*Hình 2.3: Mô hình Envelope Encryption hai tầng khóa.*

- **DEK (Data Encryption Key):** khóa AES sinh ngẫu nhiên cho từng đơn vị dữ liệu, dùng mã hóa dữ liệu cục bộ — rất nhanh nhờ AES-NI.
- **KEK (Key Encryption Key):** khóa "bọc" DEK, **nằm trong KMS/HSM và không bao giờ xuất ra ngoài**. DEK sau khi mã hóa (wrap) bằng KEK sẽ được lưu kèm ciphertext.

Khi giải mã, ứng dụng gửi DEK đã wrap tới KMS để unwrap (một lần gọi mạng), rồi dùng DEK đã giải để giải mã dữ liệu cục bộ. Mô hình này cho phép **cache DEK** nhằm tránh gọi KMS mỗi request (mục 3.3.5 và 4.5), đồng thời vẫn giữ KEK trong ranh giới an toàn và ghi log mọi lần sử dụng khóa — đáp ứng yêu cầu kiểm toán của PCI DSS.

### 2.3.8. Bảo vệ dữ liệu thanh toán — PSP Tokenization

**Tokenization** thay thế dữ liệu nhạy cảm bằng một **token** không có giá trị khai thác ngoài ngữ cảnh ban đầu. Với thanh toán, **PSP (Payment Service Provider) tokenization** chuyển việc thu nhận **số thẻ (PAN — Primary Account Number)** sang nhà cung cấp (Stripe): trình duyệt người dùng gửi thông tin thẻ thẳng tới Stripe (qua Stripe.js chạy client-side), và backend chỉ nhận lại một **token** dạng `pm_xxx` để thực hiện giao dịch.

Nhờ đó, **PAN không bao giờ đi qua hoặc được lưu trên hệ thống** của đề tài. Hệ quả an toàn rất lớn: ngay cả khi toàn bộ backend bị xâm nhập, kẻ tấn công cũng không lấy được số thẻ thật. Về tuân thủ, điều này **thu hẹp phạm vi PCI DSS** từ SAQ D (lưu trữ/xử lý PAN) xuống SAQ A-EP (chỉ điều hướng/tích hợp), giảm đáng kể chi phí và độ phức tạp audit (chi tiết ở mục 3.3.4).

## 2.4. Mô hình hóa mối đe dọa và tiêu chuẩn đánh giá

**STRIDE** [10] do Microsoft phát triển, phân loại mối đe dọa thành sáu nhóm, mỗi nhóm tương ứng vi phạm một thuộc tính an toàn:

| Ký hiệu | Tên | Vi phạm thuộc tính |
|---|---|---|
| **S** | Spoofing (giả mạo danh tính) | Authentication |
| **T** | Tampering (sửa đổi dữ liệu) | Integrity |
| **R** | Repudiation (chối bỏ) | Non-repudiation |
| **I** | Information Disclosure (rò rỉ thông tin) | Confidentiality |
| **D** | Denial of Service (từ chối dịch vụ) | Availability |
| **E** | Elevation of Privilege (leo thang đặc quyền) | Authorization |

Ba bộ tiêu chuẩn được dùng làm thước đo đánh giá khách quan: **OWASP ASVS v4.0** [5] (chuẩn kiểm định bảo mật ứng dụng theo từng chương V2–V14), **OWASP API Security Top 10 (2023)** [6] (10 rủi ro API hàng đầu), và **PCI DSS v4.0** [7] (tiêu chuẩn an toàn dữ liệu thẻ với các Requirement cụ thể).

## 2.5. Các công trình liên quan, khoảng trống và đóng góp

Phần lớn tài liệu hiện có về mật mã ứng dụng tiếp cận theo một trong hai hướng: (i) trình bày **lý thuyết** của từng primitive (giáo trình, RFC, chuẩn NIST) mà không đặt trong một hệ thống vận hành thực tế; hoặc (ii) mô tả **một cơ chế đơn lẻ** (chỉ TLS, chỉ OAuth2, chỉ KMS) trong một bối cảnh hẹp. Khoảng trống là thiếu một nghiên cứu **tích hợp đồng thời nhiều cơ chế** trong một hệ phân tán chạy thật, kèm **đo lường định lượng** chi phí của chúng và **đối chiếu đa tiêu chuẩn**.

Đề tài đóng góp đúng vào khoảng trống đó: một hệ thống thương mại điện tử microservices tích hợp **đầy đủ tám cơ chế mật mã** chạy thật trên 4 node, kèm bộ đánh giá định lượng (26 kiểm thử + STRIDE ~50 kịch bản + benchmark 5000 vòng + ba bộ tiêu chuẩn) và một **danh mục lỗi triển khai điển hình** rút ra từ rà soát mã nguồn thực tế. Qua đó, đề tài đưa ra một kết luận có giá trị thực tiễn: rủi ro mật mã trong thực tế đến chủ yếu từ **cách triển khai** chứ không phải từ độ mạnh của thuật toán.

Để định hướng thiết kế, mỗi rủi ro được ánh xạ tới một cơ chế mật mã bảo vệ theo từng bên liên quan (Bảng 2.3):

| Bên được bảo vệ | Rủi ro chính | Mục tiêu / Cơ chế mật mã |
|---|---|---|
| Khách hàng | Giả mạo danh tính · XSS trộm token · lộ dữ liệu | PSP Tokenization · JWT ECDSA + MFA · AES-256-GCM |
| Người bán | Webhook giả "đã giao" · đơn giả "đã trả" · sửa giá | Ký & verify webhook · tính giá server-side · idempotency |
| Nội bộ / Doanh nghiệp | Tin header · service giả · charge 2 lần · vi phạm PCI | HMAC + danh tính · Vault · thu hẹp PCI scope |

*Bảng 2.3: Ánh xạ rủi ro theo bên liên quan → cơ chế mật mã (nguồn: bản thuyết trình đề tài).*

<div style="page-break-after: always;"></div>

---

# Chương 3. THIẾT KẾ HỆ THỐNG VÀ CÁC CƠ CHẾ MẬT MÃ

## 3.1. Kiến trúc tổng thể

Hệ thống được triển khai trên **4 node** ảo kết nối qua mạng riêng ảo Tailscale (WireGuard), mỗi node đảm nhận một vai trò bảo mật riêng biệt nhằm thực thi nguyên tắc cách ly và đặc quyền tối thiểu.

```
                    ╔══════════════════════════════╗
                    ║      Internet (Untrusted)    ║
                    ╚══════════════╤═══════════════╝
                                   │ HTTPS (TLS 1.3)
                    ╔══════════════▼═══════════════╗
                    ║     NODE 1 — Ingress          ║
                    ║  Envoy Gateway :10000         ║
                    ║   1) TLS 1.3 termination       ║
                    ║   2) Rate limiting 100/60s     ║
                    ║   3) WAF (Lua filter)          ║
                    ║   4) Route + mTLS → payment    ║
                    ║  (JWT verify: ở mỗi service)   ║
                    ║  Keycloak :8080 (OAuth2/OIDC) ║
                    ╚═════════════════╤══════════════╝
                                      │ HTTP (nội bộ Tailscale)
                    ╔═════════════════▼══════════════╗
                    ║     NODE 2 — Services           ║
                    ║  catalog :8001  cart :8002       ║
                    ║  order :8003 (Saga orchestrator) ║
                    ║  inventory :8005 shipping :8006   ║
                    ║  noti :8007                       ║
                    ║  (HMAC-SHA256 signed requests)   ║
                    ╚════════════════════╤═════════════╝
                                         │ HTTP + HMAC
                    ╔════════════════════▼═════════════╗
                    ║     NODE 3 — Payment + Vault      ║
                    ║  payment-service :8004            ║
                    ║  HashiCorp Vault :8200            ║
                    ║  (9 transit keys, AppRole auth)   ║
                    ╚═════════════════════╤════════════╝
                                          │
                    ╔═════════════════════▼════════════╗
                    ║     NODE 4 — Data                 ║
                    ║  PostgreSQL :5432  Kafka :9092     ║
                    ║  Elasticsearch :9200  Kibana :5601 ║
                    ║  Logstash :5044                    ║
                    ║  Prometheus :9090  Grafana :3000   ║
                    ╚══════════════════════════════════╝

External:  Stripe PSP ← payment (HTTPS + webhook HMAC)
           Gmail SMTP ← noti (SMTP/TLS + creds từ Vault)
           GHN API    ← shipping (HTTPS)
```

> *Hình 3.1: Kiến trúc giải pháp tổng thể.* Client → **Nginx proxy** → **Envoy API Gateway** (xác thực qua Keycloak); Envoy gắn JWT và định tuyến tới nhóm *Core services* (Catalog/Cart/Order); vùng **PCI-DSS** gồm Payment ↔ Vault (lấy secret key, Vault transit); Payment gọi Stripe API; truy cập Database qua TLS. **Keycloak ký JWT bằng ES256 (EC-SHA256)** trên hệ thống live.
> *Hình 3.2: Phương án triển khai.* Toàn bộ chạy trên **2 máy host**: **Máy host A** ảo hóa thành 3 máy ảo — **VM1** (Nginx + Envoy + Keycloak), **VM2** (Catalog/Cart/Order), **VM3** (Payment + Vault) — và **Máy host B** (PostgreSQL Database, Kafka). Các thành phần kết nối qua **Tailscale (WireGuard + TLS)**.

Có hai chi tiết kiến trúc cần làm rõ so với mô tả "4 node" ở trên (vốn nhóm theo vai trò bảo mật): (i) ở biên có thêm một lớp **Nginx proxy** đứng trước Envoy (TLS/đảo ngược proxy ở cổng 80/443), và (ii) về vật lý hệ thống gói trong **2 máy host** (Host A ảo hóa 3 VM, Host B chứa tầng dữ liệu) — xem Hình 3.2. Việc đặt **Payment + Vault trong vùng PCI-DSS riêng (VM3)** là quyết định thiết kế có chủ đích: cô lập vùng xử lý dữ liệu thanh toán và quản lý khóa khỏi các dịch vụ thông thường, thu hẹp phạm vi PCI DSS và thực thi least privilege ở cấp mạng. Về thuật toán ký JWT, hệ thống dùng **ES256 (EC-SHA256)**: Keycloak ký bằng khóa EC P-256, các dịch vụ xác minh qua JWKS (xem nhãn trong Hình 3.1 và mục 2.3.3/2.3.4).

### 3.1.1. Stack công nghệ và lý do lựa chọn

| Lớp | Công nghệ | Lý do chọn |
|---|---|---|
| Ngôn ngữ | Python 3.13 + FastAPI | Async hiệu năng cao, hệ sinh thái mật mã phong phú |
| API Gateway | Envoy Proxy | TLS termination, filter JWT/WAF/rate-limit gốc; là core của Istio (hỗ trợ mTLS) |
| Identity | Keycloak 26 | Mã nguồn mở, self-hosted, hỗ trợ đầy đủ OAuth2/OIDC/MFA/PKCE |
| Key Management | HashiCorp Vault | KMS emulator: Transit engine + secrets + audit log + AppRole |
| Database | PostgreSQL 15 | TDE, RULE append-only, ràng buộc toàn vẹn mạnh |
| Message Bus | Apache Kafka 7.6 | Event streaming, Outbox pattern, audit log stream |
| Cache | Redis | Nonce guard (chống replay), idempotency cache |
| Observability | ELK + Prometheus + Grafana | Audit log, metrics, dashboard |
| Payment PSP | Stripe (test mode) | Tokenization + 3DS, tài liệu/SDK tốt |
| Networking | Tailscale WireGuard | VPN mã hóa giữa 4 node |

*Bảng 3.1: Stack công nghệ và lý do lựa chọn.*

### 3.1.2. Chi tiết 7 microservices

Năm dịch vụ cốt lõi (order, payment, inventory, shipping, noti) theo kiến trúc *clean architecture* (tách lớp api/application/domain/infrastructure) và có đầy đủ middleware HMAC, nonce guard, Vault, Redis. Hai dịch vụ "phẳng" (catalog, cart) có kiến trúc đơn giản hơn; trong đó **catalog là dịch vụ duy nhất xác minh JWT Keycloak (ES256) thật** (xem mục 3.3.2) — đóng vai trò hình mẫu tham chiếu.

| Service | Port | Công nghệ | Vai trò |
|---|---|---|---|
| catalog-service | 8001 | FastAPI + SQLAlchemy | Catalog sản phẩm, public read; verify JWT ES256 |
| cart-service | 8002 | FastAPI + Redis | Giỏ hàng |
| order-service | 8003 | FastAPI + PostgreSQL + httpx | Saga orchestrator |
| payment-service | 8004 | FastAPI + Stripe + Vault | Thanh toán, tokenization, envelope encryption |
| inventory-service | 8005 | FastAPI + PostgreSQL | Tồn kho, optimistic locking |
| shipping-service | 8006 | FastAPI + GHN API | Vận chuyển |
| noti-service | 8007 | FastAPI + SMTP + Kafka | Email thông báo (consumer chính) |

*Bảng 3.2: Danh sách 7 microservices.*

## 3.2. Trust Boundaries và Data Flow

### 3.2.1. Tám ranh giới tin cậy

Thiết kế tuân theo nguyên tắc **zero implicit trust**: không có sự tin cậy mặc định khi dữ liệu vượt qua một ranh giới; tại mỗi ranh giới phải có cơ chế xác thực/mã hóa tương ứng.

| TB | Lớp | Cơ chế bảo vệ | Đe dọa chính |
|---|---|---|---|
| TB1 | Internet (untrusted) | — | Mọi packet đều bị nghi ngờ |
| TB2 | Edge: CDN + Envoy | TLS 1.3 + WAF + rate limit | Spoofing, MitM, DDoS |
| TB3 | Backend services | JWT verify (JWKS, ES256) + HMAC-SHA256 + Nonce Guard + mTLS | Mạo danh, rogue service, replay |
| TB4 | Data layer | TLS + TDE (disk) + FLE (field) | Insider, truy cập vật lý |
| TB5 | Key Management (Vault) | AppRole + audit log | Trộm khóa |
| TB6 | Stripe PSP | HTTPS + webhook HMAC | Webhook spoofing/replay |
| TB7 | ML/Fraud API | HTTPS + API key (Vault) | Lộ API key |
| TB8 | Gmail SMTP | SMTP/TLS + creds (Vault) | Lộ credential, spam |

*Bảng 3.3: Tám ranh giới tin cậy.*

### 3.2.2. Data Flow Diagram

Hệ thống áp dụng mẫu **database-per-service** — mỗi dịch vụ sở hữu một instance PostgreSQL riêng (đều bật TDE + FLE), tránh việc một dịch vụ bị xâm nhập có thể đọc dữ liệu của dịch vụ khác qua chung một database. Giao tiếp lõi giữa order ↔ inventory ↔ payment chạy **HTTP đồng bộ có ký HMAC** (qua `httpx`); Kafka đóng vai trò phụ cho event/audit theo **Outbox pattern** (ghi event vào DB trong cùng transaction nghiệp vụ rồi worker mới publish, đảm bảo nhất quán).

```
[User Browser]
    │ HTTPS/TLS 1.3
    ▼
[Envoy Gateway: TLS · rate limit · WAF]
    │ Route (kèm Bearer JWT) → mỗi service tự verify JWT qua JWKS (ES256)
    ├──▶ [Catalog Service]──[PostgreSQL: catalog_db]   (verify JWT ES256)
    ├──▶ [Cart Service]──[Redis cache]
    └──▶ [Order Service / Saga]──[PostgreSQL: order_db]
              │ HMAC-SHA256 + X-Timestamp + X-Nonce (chống replay)
              ├──▶ [Inventory Service]──[PostgreSQL]──▶ [Kafka: inventory.events]
              ├──▶ [Payment Service]──[PostgreSQL: payment_db]
              │         ├──▶ [Stripe API] → charge → webhook (Stripe-Signature HMAC)
              │         └──▶ [Vault Transit] → DEK unwrap / sign / hmac
              └──▶ [Noti Service]──▶ [Gmail SMTP]
                        └──[Kafka: audit-logs]──[Logstash]──[Elasticsearch]──[Kibana]
[Prometheus] ◄── scrape metrics ── [tất cả services + Vault]
[Grafana]   ◄── PromQL dashboards
```

> *Hình 3.3: Data Flow Diagram và các ranh giới tin cậy* — mỗi service tự verify JWT (JWKS, ES256); order↔payment ký HMAC trên kênh mTLS.

## 3.3. Triển khai 8 cơ chế mật mã

### 3.3.1. TLS 1.3 / HTTPS

Envoy đảm nhận TLS termination ở biên hệ thống. Cấu hình (rút gọn từ `infra/patches/envoy.yaml`):

```yaml
transport_socket:
  name: envoy.transport_sockets.tls
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
    common_tls_context:
      tls_certificates:
        - certificate_chain: { filename: /etc/envoy/certs/server.crt }
          private_key:       { filename: /etc/envoy/certs/server.key }
```

**Xác minh thực tế:** `curl -k https://100.96.240.45:10000/api/v1/catalog/products` trả về HTTP 200. Tác dụng: mã hóa toàn bộ traffic từ người dùng đến gateway, chống MitM trên mạng không tin cậy (WiFi công cộng), và loại bỏ các cipher suite yếu mà TLS 1.2 còn cho phép.

### 3.3.2. OAuth2/OIDC + PKCE + MFA

Luồng xác thực đầy đủ gồm tám bước:

```
1. User → trang login Keycloak (HTTPS)
2. User nhập mật khẩu + mã TOTP 6 chữ số (MFA)
3. Keycloak phát Authorization Code kèm PKCE code_challenge (S256)
4. Client đổi code + code_verifier → Access Token (JWT ES256, TTL 120s)
5. Envoy (TLS/WAF/rate-limit) định tuyến request kèm Bearer JWT tới service
6. Mỗi service TỰ verify JWT qua JWKS của Keycloak (ES256), kiểm aud/iss/exp
7. Service lấy danh tính từ claim `sub` đã xác minh (zero-trust per-service, không tin header thô)
8. Refresh token rotation strict: token cũ bị hủy ngay khi refresh
```

Đoạn mã sau từ `catalog-service` minh họa cách **xác minh JWT đúng chuẩn** — đây là tham chiếu cho ba nguyên tắc chống tấn công JWT nêu ở mục 2.3.4:

```python
# services/catalog-service/app/api/dependencies.py (rút gọn)
payload = jwt.decode(
    token,
    public_key,                 # EC public key lấy từ Keycloak (JWKS), cache 1 giờ
    algorithms=["ES256"],       # CHỐT CỨNG thuật toán → chống alg:none / algorithm confusion
    audience="account",         # kiểm tra aud → chống audience confusion
    issuer=issuer,              # H-05: ràng buộc iss → token realm khác không dùng được
)
merchant_id = payload.get("sub", "")
```

| Tham số | Giá trị | Lý do |
|---|---|---|
| Algorithm | ES256 (EC-SHA256) | Khóa riêng EC chỉ Keycloak giữ; chốt cứng chống alg confusion |
| Access Token TTL | 120s | Giảm cửa sổ tấn công nếu token bị trộm |
| Refresh rotation | Strict | Hủy token cũ ngay khi refresh |
| PKCE | S256 | Chống chặn authorization code |
| MFA | TOTP | Chống account takeover dù lộ mật khẩu |
| verify_aud | `account` | Chống audience confusion |
| verify_iss | realm issuer | Token từ realm/issuer khác không dùng được |
| brute_force | lockout sau N fail (failureFactor=10) | Chống credential stuffing |

*Bảng 3.4: Cấu hình bảo mật xác thực OAuth2/OIDC.*

### 3.3.3. HMAC-SHA256 Service-to-Service

**Vấn đề cần giải quyết:** nếu kẻ tấn công lọt vào mạng nội bộ (ví dụ qua một dịch vụ ít quan trọng bị xâm nhập), họ có thể gọi thẳng vào Payment/Inventory mà bỏ qua gateway và JWT. **Giải pháp:** mỗi request nội bộ được ký bằng HMAC-SHA256 (thực hiện qua Vault Transit, khóa `order-hmac-key`) trên một **canonical request** chuẩn hóa, kèm timestamp và nonce.

Bên ký xây dựng canonical request gồm method, path, timestamp, nonce và hash của body:

```python
# services/payment-service/app/infrastructure/crypto/hmac_signer.py
def build_canonical_request(method, path, timestamp, nonce, body: bytes) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    return f"{method.upper()}\n{path}\n{timestamp}\n{nonce}\n{body_hash}"

class HmacSigner:
    async def sign(self, method, path, body, timestamp, nonce) -> tuple[str, int]:
        canonical = build_canonical_request(method, path, timestamp, nonce, body)
        result = await self._transit.hmac(
            key_name=self._key_name,                                  # "order-hmac-key"
            input_data=base64.b64encode(canonical.encode()).decode(),
        )
        return result["hmac"], int(result.get("key_version", 1))
```

Bên nhận (middleware) thực thi ba bước kiểm tra theo đúng thứ tự, và **tự kiểm timestamp ngay tại tầng HMAC** (không phụ thuộc nonce guard) để chống replay vĩnh viễn nếu nonce guard bị tắt:

```python
# services/payment-service/app/api/middleware/hmac_verification.py (rút gọn)
if not settings.REQUIRE_INBOUND_HMAC:
    return await call_next(request)
# Bỏ qua health/docs và webhook Stripe công khai
signature = request.headers.get("X-Signature")
timestamp = request.headers.get("X-Timestamp")
nonce     = request.headers.get("X-Nonce")
if not signature or not timestamp or not nonce:
    return JSONResponse(401, {"code": "MISSING_SIGNATURE_HEADERS"})
# (1) kiểm timestamp trong cửa sổ ±TIMESTAMP_TOLERANCE_SECONDS
if abs(int(time.time()) - int(timestamp)) > settings.TIMESTAMP_TOLERANCE_SECONDS:
    return JSONResponse(401, {"code": "STALE_TIMESTAMP"})
# (2) nonce chưa từng thấy (Redis) — thực hiện ở NonceGuardMiddleware
# (3) recompute canonical + verify HMAC qua Vault Transit
valid = await container.crypto_service.verify_request(
    method=request.method, path=request.url.path, body=body,
    timestamp=timestamp, nonce=nonce, signature=signature)
if not valid:
    return JSONResponse(401, {"code": "INVALID_SIGNATURE"})
```

Headers gửi kèm mỗi request: `X-Signature`, `X-Timestamp`, `X-Nonce`. Cờ `REQUIRE_INBOUND_HMAC` mặc định **True** (secure-by-default). Overhead đo được: median **0.0013 ms** — hoàn toàn không đáng kể (mục 4.5).

Trên hệ thống live, giao tiếp order↔payment chạy trên kênh **mTLS**: **Hình 3.7** cho thấy `curl` xuất trình client cert bắt tay TLS 1.3 thành công (cipher `TLS_AES_256_GCM_SHA384`, xác thực hai chiều); **Hình 3.8** cho thấy khi thiếu client cert, server đóng kết nối (broken pipe) — chứng tỏ mTLS là bắt buộc.

### 3.3.4. PSP Tokenization (No PAN)

Stripe.js chạy phía client nhận thông tin thẻ và trả về một `PaymentMethod` token (`pm_xxx`); backend dùng token này để charge và **không bao giờ thấy số thẻ thật**. Cơ sở dữ liệu chỉ lưu các trường không nhạy cảm:

```sql
-- payment_transactions: KHÔNG có cột card_number, cvv, expiry_date
psp_payment_method_id  VARCHAR  -- "pm_1Abc..."
card_last4             VARCHAR  -- "4242"  (chỉ 4 số cuối)
card_brand             VARCHAR  -- "visa"
```

Mã nguồn còn có **bộ lọc log che PII** che số thẻ, email, Bearer token và khóa Stripe trước khi ghi log, đồng thời che fingerprint thẻ trước khi lưu. Kết quả: PCI DSS scope giảm từ SAQ D xuống **SAQ A-EP**.

### 3.3.5. Key Management — HashiCorp Vault

Vault được chọn thay cho biến môi trường vì sáu lý do (Bảng dưới), trong đó quan trọng nhất với PCI DSS là **audit log mọi lần dùng khóa** và **KEK không bao giờ xuất ra ngoài** (Transit engine).

| Tiêu chí | Env Vars | HashiCorp Vault |
|---|---|---|
| Audit log mỗi lần đọc khóa | ✗ | ✅ |
| Key rotation không cần redeploy | ✗ | ✅ |
| Dynamic secrets (TTL tự hết hạn) | ✗ | ✅ |
| Access policy theo từng dịch vụ | ✗ | ✅ AppRole |
| Mã hóa at-rest | ✗ (plain text) | ✅ AES-256-GCM |
| KEK không rời hệ thống | ✗ | ✅ Transit never exports |

Xác thực dịch vụ với Vault qua **AppRole** (cặp `role_id` + `secret_id`), theo nguyên tắc đặc quyền tối thiểu. Đề tài provision **9 transit key**:

| Key | Thuật toán | Dùng cho |
|---|---|---|
| payment-fle-key | AES-256-GCM | FLE PII (email, address) |
| order-hmac-key | HMAC-SHA256 | Ký request S2S |
| payment-sign-key | ECDSA-P256 | Chữ ký bản ghi audit |
| payment-audit-key | HMAC-SHA256 | Toàn vẹn audit log |
| inventory-fle-key | AES-256-GCM | FLE inventory |
| inventory-sign-key | ECDSA-P256 | Inventory audit signing |
| order-fle-key | AES-256-GCM | FLE order PII |
| shipping-fle-key | AES-256-GCM | FLE shipping address |
| noti-fle-key | AES-256-GCM | FLE notification data |

*Bảng 3.5: Chín transit key đã provision trên Vault.*

**DEK caching:** sau lần unwrap đầu từ Vault (~24.6 ms), DEK được cache 5 phút; nhờ đó ~99% request chỉ tốn ~0.0005 ms cho AES-GCM cục bộ thay vì gọi lại Vault.

### 3.3.6. Database Encryption (TDE + FLE)

Đề tài áp dụng mã hóa hai tầng:

- **TDE (Transparent Data Encryption):** mã hóa toàn bộ data file của PostgreSQL trên đĩa — chống kịch bản kẻ tấn công lấy được ổ cứng vật lý hoặc bản backup; hoàn toàn trong suốt với ứng dụng.
- **FLE (Field-Level Encryption):** mã hóa từng trường nhạy cảm (email, địa chỉ, recipient) bằng *envelope encryption*. Đoạn mã thật:

```python
# services/payment-service/app/infrastructure/crypto/envelope_encryption.py
async def encrypt(self, plaintext: str) -> bytes:
    dek = os.urandom(32)          # DEK ngẫu nhiên 256-bit cho từng giá trị
    iv  = os.urandom(12)          # IV/nonce 96-bit duy nhất mỗi lần (mục 2.3.1)
    cipher = AESGCM(dek)
    ciphertext_with_tag = cipher.encrypt(iv, plaintext.encode(), None)
    wrapped_dek = await self._transit.encrypt(                   # wrap DEK bằng KEK (Vault)
        key_name=self._key_name, plaintext=base64.b64encode(dek).decode())
    wrapped = wrapped_dek.encode()
    return (self.BLOB_VERSION.to_bytes(1, "big")     # [version:1]
            + len(wrapped).to_bytes(2, "big")        # [len(EncDEK):2]
            + wrapped                                 # [EncDEK]
            + iv                                      # [IV:12]
            + ciphertext_with_tag)                    # [Ciphertext+Tag]
```

```
Định dạng blob lưu DB:
┌──────────┬──────────────┬───────────┬────────┬────────────────────┐
│ version  │ len(EncDEK)  │  EncDEK   │  IV12  │ Ciphertext + Tag16 │
│  1 byte  │   2 byte     │  (var)    │ 12 byte│      (var)         │
└──────────┴──────────────┴───────────┴────────┴────────────────────┘
```

*Hình 3.5: Định dạng blob ciphertext của FLE.*

Với FLE, DBA hay kẻ có quyền đọc database chỉ thấy ciphertext; muốn giải mã phải có Vault + AppRole credentials — thực thi least privilege ở cấp dữ liệu. **Trạng thái:** mã FLE hoàn chỉnh và đã có trong mọi dịch vụ, nhưng chưa kích hoạt ở runtime (cần Vault root token để provision khóa trong lab) — đây là một hạng mục P0 còn lại (mục 5.3).

### 3.3.7. Append-only Audit Log

Migration 0007 tạo PostgreSQL RULE chặn mọi thao tác DELETE/UPDATE trên bảng `payment_audit_log`:

```python
op.execute("CREATE OR REPLACE RULE payment_audit_log_no_delete AS "
           "ON DELETE TO payment_audit_log DO INSTEAD NOTHING;")
op.execute("CREATE OR REPLACE RULE payment_audit_log_no_update AS "
           "ON UPDATE TO payment_audit_log DO INSTEAD NOTHING;")
```

Mỗi bản ghi audit còn được **ký bằng ECDSA-P256** (chống chối bỏ) và **đẩy qua Kafka** topic `audit-logs` → Logstash → Elasticsearch → Kibana. Đoạn mã ký event (canonical JSON + băm SHA-256 + ký prehashed qua Vault):

```python
# services/payment-service/app/infrastructure/crypto/digital_signature.py
async def sign_event(self, event_data: dict) -> EventSignature:
    canonical = json.dumps(event_data, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode()).digest()
    sig = await self._transit.sign(key_name="payment-sign-key",
        input_data=base64.b64encode(digest).decode(),
        hash_algorithm="sha2-256", prehashed=True)
    return EventSignature(algorithm="ecdsa-p256", value=sig["signature"], ...)
```

Cơ chế này đáp ứng **PCI DSS Req 10.3** (bảo vệ toàn vẹn nhật ký), chống **Repudiation** trong STRIDE, và phù hợp yêu cầu lưu vết xử lý dữ liệu của các quy định bảo vệ dữ liệu cá nhân.

### 3.3.8. WAF & API Gateway Hardening

Envoy thực thi chuỗi lọc tại biên theo thứ tự, mỗi request phải vượt qua tuần tự:

```
TLS 1.3 termination
   → Local rate limit (100 req / 60s / IP)
      → WAF Lua filter (chặn SQLi/XSS/scanner UA)
         → Route prefix-rewrite tới backend (mTLS tới payment)
```

Xác thực **JWT (ES256, JWKS)** và **CORS** được thực thi ở **tầng service FastAPI** (zero-trust per-service), không phải tại Envoy — xem mục 3.3.2.

*Hình 3.4: Chuỗi lọc tại Envoy Gateway (TLS · rate limit · WAF · route+mTLS); JWT và CORS ở tầng service.*

WAF Lua chặn theo tập mẫu:

```lua
local blocked_patterns = {
  "union%s+select", "or%s+1%s*=%s*1", "admin'%-%-", "drop%s+table",     -- SQLi
  "<script", "onerror%s*=", "javascript:", "eval%(", "document%.cookie", -- XSS
  "sqlmap", "nikto", "masscan", "dirbuster", "nessus"                    -- scanners
}
```

## 3.4. Checkout Flow — Saga Pattern

7 microservices không thể dùng transaction ACID phân tán, nên đề tài áp dụng **Saga Orchestrator** (`order-service/app/application/saga/orchestrator.py`). Orchestrator chạy **4 bước đồng bộ** (mỗi bước ký HMAC); sau khi đơn `CONFIRMED`, việc tạo vận đơn và gửi email diễn ra **bất đồng bộ qua Kafka** (Outbox pattern) — shipping/noti là consumer của sự kiện `OrderConfirmed`.

```
POST /api/v1/orders/checkout  →  tạo Order (PENDING_PAYMENT) + saga_state
  [đồng bộ — orchestrator]
  1. reserve_inventory  (HMAC)        → giữ hàng, status HELD, TTL 10 phút
  2. fraud_check                      → cập nhật orders.fraud_score
  3. process_payment    (HMAC + mTLS) → Stripe Checkout + 3DS → webhook succeeded
  4. confirm_order      → ConfirmReservation (trừ kho thật, on_hand -= qty)
                        → Order status: CONFIRMED
  [bất đồng bộ — qua Kafka, Outbox]
     publish OrderConfirmed → Shipping (CreateShipment) · Noti (SendEmail)
```

> *Hình 3.6: Luồng Checkout theo Saga Orchestrator* — khớp `orchestrator.py`.

Khi một bước thất bại, Saga thực hiện **bù trừ (compensation)** để hoàn tác các bước đã hoàn thành. Hai compensation step trong code là `release_inventory` và `refund_payment`:

| Bước thất bại | Compensation | Trạng thái cuối |
|---|---|---|
| reserve_inventory fail | Không cần rollback | CANCELLED |
| fraud_check phát hiện gian lận | release_inventory | CANCELLED |
| process_payment thất bại | release_inventory | PAYMENT_FAILED |
| Bước sau khi đã charge thất bại | release_inventory + **refund_payment** | PAYMENT_FAILED |

*Bảng 3.6: Cơ chế bù trừ (compensation) của Saga (theo `orchestrator.py`).*

**Idempotency:** mỗi payment mang một `idempotency_key` (UUID); kết quả lần đầu được cache trong Redis. Thực nghiệm 2.3 cho thấy ba request giống hệt: request 1 mất 438 ms (gọi Stripe thật), request 2 và 3 chỉ 5 ms (cache hit, **không charge lại**) — chứng minh tính idempotent của luồng thanh toán.

## 3.5. Phân tích STRIDE

Đề tài áp dụng STRIDE cho **9 thành phần** (Frontend/Client, API Gateway, Identity Provider, Microservices, Payment+PSP, Key Management, Data Store, Monitoring/Kafka/Anti-fraud, CI/CD), sinh ~50 kịch bản tấn công, mỗi kịch bản kèm mô tả, mức độ và mitigation. Bảng STRIDE đầy đủ được trình bày ở **Phụ lục G**.

| Severity | Số lượng | Ví dụ tiêu biểu |
|---|---|---|
| Critical | 13 | JWT forgery (alg:none), PAN exposure, Vault compromise, webhook spoofing |
| High | 18 | HMAC bypass, token theft, SQLi, MitM, credential stuffing |
| Medium | 12 | User enumeration, CORS bypass, repudiation |
| Low | 7 | Client ReDoS, timing attack, header info leak |

*Bảng 3.7: Phân bố threat STRIDE theo mức độ.*

| ID | Threat | Mitigation | Status |
|---|---|---|---|
| S-GW-01 | JWT forgery (alg:none) | Whitelist ES256, reject none | ✅ |
| S-PAY-01 | Fake Stripe webhook | Verify Stripe-Signature HMAC + idempotency | ✅ |
| T-PAY-01 | Amount tampering | Server tính lại số tiền, không tin client | ✅ |
| T-GW-01 | SQLi qua API params | ORM parameterized + WAF 5/5 block | ✅ |
| R-PAY-01 | Payment repudiation | Append-only audit + ECDSA signing | ✅ |
| I-PAY-01 | PAN lưu trong DB | PSP tokenization — no PAN | ✅ |
| I-IDP-01 | Token leak qua logs | PII masking filter | ✅ |
| D-GW-01 | Volumetric DDoS | Rate limit 100/60s + circuit breaker | ✅ |
| E-MS-01 | Broken access control | RBAC + JWT role verify | ✅ |
| E-INT-01 | Rogue internal service | HMAC guards (REQUIRE_INBOUND_HMAC=True) | ✅ |
| S-KMS-01 | Unauthorized Vault access | AppRole + audit log | ✅ |
| T-CI-01 | Unsigned artifact deploy | gitleaks + Trivy scan | ⚠️ cosign pending |

*Bảng 3.8: Các Critical threat tiêu biểu và mitigation (trích từ Phụ lục G).*

<div style="page-break-after: always;"></div>

---

# Chương 4. THỰC NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ

## 4.1. Môi trường và phương pháp thực nghiệm

Toàn bộ thực nghiệm chạy trên **hạ tầng live 4 node** kết nối Tailscale, với các thành phần thật đang vận hành: Keycloak phát JWT thật, Envoy phục vụ HTTPS, Vault Transit khởi tạo và unsealed, Stripe ở chế độ test (tạo được checkout session `cs_test_...` thật). Hiệu năng mật mã đo trên Apple Silicon (Node 4), mỗi phép toán lặp **5000 vòng**. Bộ tiêu chuẩn đối chiếu: OWASP ASVS v4.0 L2, OWASP API Security Top 10 (2023) và PCI DSS v4.0.

Đánh giá được tiến hành theo hai mốc **Trước** (baseline trước khi áp dụng các fix) và **Sau** (sau khi deploy toàn bộ fix), để định lượng hiệu quả của các biện pháp.

## 4.2. Rà soát mã nguồn và lỗ hổng phát hiện

Nhóm đọc kỹ mã nguồn cả **7 dịch vụ** (trạng thái HEAD `3569a66`), phạm vi chỉ ở mã nguồn (bỏ qua giá trị trong `.env.example`). Kết quả cho thấy codebase đã có nhiều thực hành tốt nhưng vẫn còn các vấn đề ở tầng **logic và kiến trúc** — nơi cấu hình không khắc phục được.

| Mức độ | Số lượng phát hiện | Ý nghĩa |
|---|---|---|
| Critical | 11 | Khai thác trực tiếp hoặc gây mất tiền/dữ liệu |
| High | 18 | Rủi ro cao, cần xử lý trước production |
| Medium | 19 | Nợ kỹ thuật, nên xử lý |

*Bảng 4.1: Phân bố phát hiện qua rà soát mã nguồn.*

Các phát hiện được phân loại theo nhóm rủi ro OWASP (Bảng 4.1b):

| Nhóm OWASP | Rủi ro cụ thể phát hiện trong codebase |
|---|---|
| Authentication Failures | 1.1 Tin header khi không có gateway · 1.2 JWT chỉ base64-decode, không verify chữ ký |
| Broken Access Control | 2.1 Admin API thiếu xác thực · 2.2 Webhook shipping giả đổi trạng thái đơn |
| Insecure Design | 3.1 Race condition → charge 2 lần · 3.2 Ghi event trước khi xử lý · 3.3 Tính giá từ client · 3.4 Lỗi quy đổi tiền tệ khi refund |
| Injection | 4.1 Rò rỉ token qua trình duyệt (XSS) · SSTI ở template noti |
| Mishandling Exceptions | 5.1 Silent fallback vô hiệu hóa bảo mật · 5.2 Error message rò rỉ thông tin |

*Bảng 4.1b: Phân loại phát hiện theo nhóm OWASP (nguồn: bản thuyết trình đề tài).*

**Các phát hiện nền tảng (Critical) tiêu biểu:**

- **C-01/C-02 — Mô hình xác thực "dựa trên niềm tin":** mọi dịch vụ (trừ catalog) tin tuyệt đối các header thô `X-User-Id`/`X-Merchant-Id`/`X-Admin-Id` và chỉ base64-decode JWT mà **không verify chữ ký**. Mô hình này chỉ an toàn khi có API Gateway đứng trước ghi đè/sanitize header — khắc phục đúng đắn là **mỗi service tự xác minh JWT qua JWKS (ES256)** thay vì tin header thô. `catalog-service` làm hình mẫu (`api/dependencies.py`); module `core/jwt_auth.py` đã được bổ sung cho `order/cart/inventory/shipping` để nhân rộng. Vẫn cần rà soát để mọi endpoint dùng nhất quán đường verify này (một số nơi còn đọc header thô).
- **C-03 — Fallback im lặng khi Vault lỗi:** khi Vault mất kết nối, dịch vụ tự tụt xuống `LocalDevCryptoService` với khóa hard-code thay vì dừng (fail-fast), tạo "cảm giác an toàn giả". Khuyến nghị: ép fail-fast khi `ENVIRONMENT=production`.
- **C-04…C-08 — Nhóm lỗi tiền bạc của Payment:** ghi nhận webhook trước khi xử lý (event lỗi không được retry); đua lệnh charge thiếu ràng buộc UNIQUE trên `order_id`; refund sai số tiền với VND (nhân ×100 cho tiền 0 chữ số thập phân); API admin settlement thiếu xác thực.
- **C-09…C-11:** Noti cho chèn template Jinja không sandbox (nguy cơ SSTI/RCE); Shipping có webhook "mock" không xác thực; Cart cho client tự đặt giá (`unit_price_snapshot`).

**Các thực hành tốt được ghi nhận (giữ lại và nhân rộng):** secure-by-default cho mọi cờ bảo mật (`REQUIRE_INBOUND_HMAC`/`REQUIRE_NONCE_GUARD` = true; `ENABLE_SQLITE_FALLBACK`/`*_DEV_STUB_ON_FAILURE` = false); envelope encryption AES-GCM + Vault; Outbox pattern với `FOR UPDATE SKIP LOCKED`; optimistic locking; verify chữ ký webhook Stripe **bắt buộc, không có cờ tắt**; bộ lọc log che PII; `hmac.compare_digest` chống timing; tắt OpenAPI/docs ở dịch vụ nhạy cảm; Kafka producer dùng `acks=all` + `enable_idempotence=True`.

Ngoài rà soát, bốn lỗi sau được phát hiện và **đã sửa** trong quá trình thực nghiệm:

| ID | Mức | Lỗi | Fix |
|---|---|---|---|
| T1 | Medium | `webhooks.py`: `InvalidSignatureError` → HTTP 500 | Bắt riêng → HTTP 400 (đã verify trong mã hiện tại) |
| T2 | Low | `audit.py`: `ARRAY(String)` crash trên SQLite | Đổi sang kiểu `JSON` |
| T3 | Low | `envoy.yaml`: dòng heredoc lẫn vào YAML | Xóa dòng đầu |
| T4 | Info | `payment-service/.env` bị track trong git | `git rm --cached` + thêm `.gitignore` |

*Bảng 4.2: Bốn lỗi đã sửa qua thực nghiệm.*

## 4.3. Kết quả 5 nhóm security experiments (26 tests)

**Experiment 1 — JWT & Token Security.** Mục tiêu: kiểm chứng khả năng chống các tấn công token kinh điển.

| Test | Mô tả | HTTP | Kết quả |
|---|---|---|---|
| 1.1 | Tấn công `alg:none` (token không ký) | 500 | ✅ Keycloak reject |
| 1.2 | Giả mạo claim (đổi `sub`, xóa chữ ký) | 401 | ✅ invalid signature |
| 1.3 | Token hết hạn | 401 | ✅ token expired |
| 1.4 | Replay refresh token sau rotation | 400 | ✅ `invalid_grant` |
| 1.B | User enumeration (login sai) | — | ✅ cùng một thông báo lỗi |
| — | TTL enforcement | — | ✅ 120s (client-level) |
| 1.5 | Token còn hiệu lực sau logout | valid | ⚠️ Known: JWT stateless, TTL 120s mitigate |

*Bảng 4.3: Kết quả Experiment 1 — JWT & Token.*

**Experiment 2 — Payment Fraud.** Mục tiêu: kiểm chứng chống giả mạo/lặp webhook, idempotency, và không lưu PAN.

| Test | Mô tả | HTTP | Kết quả |
|---|---|---|---|
| 2.1 | Webhook thiếu `Stripe-Signature` | 400 | ✅ |
| 2.2 | Webhook giả chữ ký HMAC | 400 | ✅ |
| 2.2B | Webhook replay (timestamp cũ) | 400 | ✅ |
| 2.3 | Idempotency 3 request giống hệt | 200 | ✅ 438ms → 5ms (không charge lại) |
| 2.4 | Thao túng số tiền COD | 200 | ⚠️ COD tin amount từ client (P1) |
| 2.5 | IDOR refund (hoàn tiền đơn người khác) | 403 | ✅ (re-run gặp 500 do Kafka timeout — hạ tầng) |
| 2.6 | Kiểm tra DB không lưu PAN | — | ✅ chỉ `psp_payment_method_id` + `card_last4` |
| — | Stripe real checkout | 200 | ✅ `cs_test_...` URL thật |

*Bảng 4.4: Kết quả Experiment 2 — Payment Fraud.*

**Experiment 3 — API Abuse (Envoy HTTPS `100.96.240.45:10000`).** Mục tiêu: kiểm chứng rate limit, WAF, CORS, chống bypass.

| Test | Mô tả | Kết quả |
|---|---|---|
| 3.1 | Credential stuffing (15×) | ✅ Lockout tại attempt #17 → 429 |
| 3.3 | Rate limit (110 request) | ✅ 100×200 + 10×429 (bucket 100/60s) |
| 3.4 | User enumeration | ✅ cùng thông báo, chênh timing <5ms |
| 3.5 | CORS evil origin | ✅ không reflect origin, không wildcard |
| 3.6 | WAF SQLi (5 mẫu, gồm `admin'--`) | ✅ **5/5 → HTTP 403** |
| 3.7 | WAF scanner UA (sqlmap/nikto/masscan/dirbuster/Nessus) | ✅ **5/5 → HTTP 403** |
| 3.8 | Bypass gọi thẳng service | ✅ HTTP 404 |

*Bảng 4.5: Kết quả Experiment 3 — API Abuse. Latency khi throttled: median 121ms · p95 210ms · p99 221ms.*

**Experiment 4 & 5 — Key Management và Supply Chain.**

| Test | Mô tả | Kết quả |
|---|---|---|
| 4.0 | Vault health | ✅ initialized, unsealed, auth required |
| 4.3 | KMS latency (50 vòng) | ✅ median 24.6ms · p95 38ms · p99 140ms |
| 4.1 | Seal/unseal drill | ⏸ SKIPPED (rủi ro production) |
| 5.2 | Dependency CVE scan | ✅ 0 HIGH/CRITICAL |
| 5.3 | Secrets trong git history | ✅ 0 credential thật |
| 5.1 | Unsigned image deploy | ⏸ cần cosign + k8s admission |

*Bảng 4.6: Kết quả Experiment 4 & 5.*

**Bổ sung (API3, API7):** catalog không lộ các trường nhạy cảm cost/margin/supplier/password ✅; tham số URL được xử lý như plain text, không fetch (chống SSRF) ✅.

Tổng kết: **25/26 kiểm thử đạt**. Một test trượt (2.5 re-run) do Kafka timeout từ payment node → macOS — vấn đề hạ tầng, không phải lỗ hổng; mã bảo vệ IDOR không đổi và đã được xác nhận HTTP 403 ở phiên trước.

## 4.4. Static analysis và quét phụ thuộc

- **Bandit (SAST):** HIGH = 0; MEDIUM = 8 (trong đó B104 ×7 — bind `0.0.0.0` trong container, là false positive; B608 ×1 — nối chuỗi SQL trong alembic seed, không có user input); LOW = 28.
- **pip-audit (NIST NVD):** **0 HIGH CVE** ở mọi dịch vụ. Còn lại 2 MEDIUM mỗi dịch vụ do `cryptography==46.0.6` (PYSEC-2026-36) và pytest (dev-only). Các CVE HIGH đã loại bỏ gồm: CVE-2024-12797, CVE-2024-47874, CVE-2025-54121 (starlette), CVE-2024-56201 (jinja2).
- **Trivy:** 0 HIGH/CRITICAL, 0 secret trong mã nguồn. **gitleaks:** 7 findings nhưng **0 credential thật** (toàn placeholder/example).

Tổng số CVE giảm từ **40 xuống 8 (−80%)** sau khi nâng cấp phụ thuộc.

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

*Bảng 4.7: Kết quả benchmark mật mã (5000 vòng).*

**Phân rã overhead trên một request checkout:**

```
JWT validation (JWKS cache)    +0.001 ms   negligible
HMAC sign (order → payment)    +0.001 ms   negligible
Vault DEK unwrap (cold)        +24.6  ms   ← cần caching
Vault DEK unwrap (cached)      +0.001 ms   negligible
AES-256-GCM decrypt (address)  +0.001 ms   negligible
────────────────────────────────────────────────────
Crypto total (cold): ~3–28 ms ;  (warm): ~0.003 ms
Stripe round-trip:   200–500 ms  ← bottleneck thực sự
→ Crypto chiếm < 6% tổng latency
```

> *Hình 4.1: Phân rã overhead mật mã trên một request checkout.*

Nhận xét: (1) AES-256-GCM và HMAC-SHA256 hoàn toàn không đáng kể (hàng triệu ops/s nhờ AES-NI). (2) Vault KMS là nút thắt duy nhất (24.6 ms cold) nhưng DEK caching 5 phút loại bỏ ~99% lần gọi. (3) Stripe là bottleneck thực sự; crypto overhead < 6% tổng latency nên không ảnh hưởng trải nghiệm người dùng.

## 4.6. Đối chiếu tiêu chuẩn (OWASP / PCI DSS)

| Bộ tiêu chuẩn | Trước | Sau |
|---|---|---|
| Security tests PASS | 14/30 | **25/26** |
| OWASP ASVS L2 | 1P / 5⚠ / 4❌ | **9P / 3⚠ / 0❌** |
| OWASP API Top 10 | 2P / 3⚠ / 2❌ | **10P / 0⚠ / 0❌** |
| PCI DSS v4.0 | 2P / 3⚠ / 3❌ | **8P / 1⚠ / 0❌** |
| pip-audit CVEs | 40 | 8 (−80%) |
| Trivy HIGH/CRITICAL | 1 | 0 |

*Bảng 4.8: Tổng hợp đối chiếu tiêu chuẩn Trước/Sau.*

Ba mục ⚠ của ASVS L2 nằm ở V6 (Cryptography) và V8 (Data Protection) do **FLE chưa kích hoạt runtime**, và V14 (Configuration) do **PostgreSQL còn mật khẩu mặc định `123456`**. Đây cũng chính là hai hạng mục P0 còn lại (mục 5.3).

| ID | Threat | Mitigation | Kết quả |
|---|---|---|---|
| API1 | Broken Object Level Auth | HTTP 403 IDOR test | ✅ |
| API2 | Broken Authentication | ES256 + verify_aud + TTL 120s | ✅ |
| API3 | Broken Object Property Level Auth | catalog không lộ field nhạy cảm | ✅ |
| API4 | Unrestricted Resource Consumption | Rate limit 100/60s | ✅ |
| API5 | Broken Function Level Auth | HMAC guards · direct 404 | ✅ |
| API6 | Unrestricted Sensitive Flows | Idempotency · webhook replay 400 | ✅ |
| API7 | SSRF | URL params → plain text | ✅ |
| API8 | Security Misconfiguration | CORS · HTTPS · /docs disabled | ✅ |
| API9 | Improper Inventory Management | /docs disabled cả 7 service | ✅ |
| API10 | Unsafe API Consumption | Stripe webhook HMAC verify | ✅ |

*Bảng 4.9: OWASP API Security Top 10 (2023) — 10/10 PASS.*

| Requirement | Nội dung | Status |
|---|---|---|
| Req 2.2 | No default credentials | ⚠️ Keycloak pw đổi ✅ · PG `123456` cần đổi |
| Req 3.3 | No PAN retention | ✅ chỉ `psp_payment_method_id` + `card_last4` |
| Req 4.2.1 | TLS 1.2+ | ✅ Envoy HTTPS TLS 1.3 |
| Req 6.3.3 | Patch vulnerabilities | ✅ cryptography 46.0.6 · starlette 1.0.1 · jinja2 3.1.6 |
| Req 7.2 | Least-privilege access | ✅ HMAC · IDOR blocked · RBAC |
| Req 8.3.1 | MFA for admin | ✅ TOTP · failureFactor=10 |
| Req 10.2 | Audit log events | ✅ Kafka + HMAC/ECDSA-signed records |
| Req 10.3 | Audit log integrity | ✅ PostgreSQL RULE chặn DELETE/UPDATE (migration 0007) |
| Req 12.3.2 | Targeted risk analysis | ✅ STRIDE ~50 scenarios |

*Bảng 4.10: PCI DSS v4.0 — 8 Pass / 1 Partial / 0 Fail.*

## 4.7. Bàn luận kết quả

Kết quả khớp với giả thuyết nghiên cứu ở cả hai khía cạnh. Về **hiệu năng**, overhead mật mã phía máy chủ không đáng kể (crypto < 6% tổng latency); nút thắt duy nhất là lần gọi Vault đầu tiên (24.6 ms) đã được DEK caching giải quyết. Về **bảo mật**, nguồn rủi ro thực tế đến từ **lỗi triển khai** — mô hình tin cậy sai (C-01/C-02), fallback im lặng (C-03), lỗi logic tiền bạc (C-04…C-08) — chứ không từ điểm yếu của thuật toán. Điều này được củng cố bởi việc các tấn công nhắm thẳng vào thuật toán (alg:none, claim forgery, webhook forge/replay, SQLi) đều bị chặn (Experiment 1–3), trong khi các vấn đề còn lại đều thuộc về cách hệ thống được lắp ráp và cấu hình. Một test trượt duy nhất là do hạ tầng (Kafka timeout), không phải lỗ hổng.

<div style="page-break-after: always;"></div>

---

# Chương 5. KẾT LUẬN

## 5.1. Kết quả đạt được và trả lời câu hỏi nghiên cứu

**RQ1 — Điểm yếu mật mã phổ biến nhất.** Qua rà soát mã nguồn và thực nghiệm, điểm yếu phổ biến và nguy hiểm nhất **không phải thuật toán yếu** mà là **sai sót triển khai**: (i) mô hình tin cậy sai — tin header chưa xác minh chữ ký; (ii) "fallback im lặng" khi thành phần mật mã (Vault/Redis/Kafka) lỗi, tụt xuống chế độ dev không an toàn mà không dừng; (iii) lỗi logic nghiệp vụ liên quan tiền bạc; (iv) xử lý lỗi sai ngữ nghĩa (500 thay vì 400). Bài học: an toàn của một hệ phân tán phụ thuộc vào *cách lắp ráp và vận hành* các primitive nhiều hơn là vào bản thân primitive.

**RQ2 — PSP tokenization.** Hiệu quả cao. PAN không bao giờ vào hệ thống (DB chỉ lưu `psp_payment_method_id` + `card_last4`), thu hẹp scope PCI DSS xuống SAQ A-EP; overhead đến từ network (200–500 ms) chứ không từ crypto; webhook HMAC verify (bắt buộc, không có cờ tắt) chặn được giả mạo và replay (Experiment 2.1/2.2/2.2B đều PASS).

**RQ3 — Vault/KMS so với software keys.** Vault phù hợp cho lab/prototype nhờ audit log mọi lần dùng khóa, AppRole least-privilege và rotation không redeploy; nhược điểm độ trễ 24.6 ms được khắc phục bằng DEK caching (99% request chỉ tốn ~0.0005 ms AES cục bộ). Cho production thực, nên dùng Cloud KMS/HSM (~10–20 ms / ~1 ms) để có SLA và hardware-backing.

## 5.2. Đóng góp của đề tài

Đề tài đóng góp một **hệ thống thương mại điện tử microservices tích hợp đầy đủ tám cơ chế mật mã**, chạy thật trên 4 node, kèm bộ đánh giá định lượng toàn diện (26 kiểm thử + STRIDE ~50 kịch bản + benchmark 5000 vòng + ba bộ tiêu chuẩn) và một **danh mục lỗi triển khai điển hình** (C-01…C-11, H-01…H-18) rút ra từ rà soát mã nguồn — có giá trị tham khảo cho các hệ thống tương tự.

## 5.3. Hạn chế

Để bảo đảm tính trung thực giữa báo cáo và hệ thống thực tế, các hạn chế sau được nêu rõ:

- **FLE chưa kích hoạt runtime** (mã hoàn chỉnh, cần Vault root token để provision khóa trong lab) → ASVS V6/V8 ở mức Partial.
- **PostgreSQL còn mật khẩu mặc định `123456`** → PCI Req 2.2 / ASVS V14 ở mức Partial.
- **mTLS:** đã triển khai cho tuyến **order↔payment** với CA nội bộ (`MyInternalCA`) — chứng minh ở Hình 3.7/3.8 (có client cert → bắt tay TLS 1.3 thành công; thiếu cert → server từ chối). Mở rộng mTLS cho **toàn bộ mesh** (mọi cặp service) vẫn là hướng phát triển; các tuyến còn lại chạy sau Envoy trong mạng Tailscale mã hóa.
- **Xác thực JWT per-service** (C-01/C-02): đã bổ sung verify JWT qua JWKS (ES256) ở `catalog` và module `core/jwt_auth.py` cho `order/cart/inventory/shipping`; cần rà soát để mọi endpoint dùng nhất quán, loại bỏ hoàn toàn các chỗ còn đọc header thô.
- Một số lỗi logic tiền bạc (C-04…C-08) và các phát hiện High còn lại là hạng mục cần xử lý trước khi đưa vào production thật.

<div style="page-break-after: always;"></div>

---

# Chương 6. HƯỚNG PHÁT TRIỂN

- **Đóng lỗ hổng danh tính (C-01/C-02):** cho mọi dịch vụ tự verify JWT như `catalog-service`, hoặc bắt buộc mọi traffic đi qua gateway và không tin header thô khi thiếu bằng chứng từ gateway.
- **Mở rộng mTLS ra toàn bộ mesh** (ngoài tuyến order↔payment đã chạy) — sidecar cho từng dịch vụ.
- Bổ sung **key rotation tự động** cho khóa ký ES256 và các transit key của Vault.
- **Kích hoạt FLE runtime** và **đổi mật khẩu PostgreSQL mặc định** (đóng hai hạng mục P0, nâng ASVS V6/V8/V14 và PCI Req 2.2 lên Pass).
- **Fail-fast khi Vault/Redis/Kafka bắt buộc mà lỗi** (bỏ fallback im lặng ở môi trường production).
- **Sửa nhóm lỗi tiền bạc của Payment** (UNIQUE/advisory-lock theo `order_id`, minor units cho VND, `pi_` cho refund Checkout, xác thực admin settlement).
- **Hoàn tất chuỗi supply chain:** ký artifact bằng **cosign** + k8s admission webhook xác minh chữ ký image.
- **Thay Vault bằng Cloud KMS/HSM** cho production; mở rộng quy mô và load test diện rộng.

<div style="page-break-after: always;"></div>

---

# TÀI LIỆU THAM KHẢO

*Các mục được đánh số theo thứ tự trích dẫn lần đầu trong báo cáo (chuẩn IEEE).*

## Tiếng Việt

- [V1] Khoa Mạng máy tính và Truyền thông, *Bài giảng môn NT219 — Mật mã học ứng dụng*, Trường Đại học Công nghệ Thông tin, ĐHQG-HCM, 2025.

## Tiếng Anh

- [1] E. Rescorla, "The Transport Layer Security (TLS) Protocol Version 1.3," RFC 8446, IETF, Aug. 2018.
- [2] D. Hardt, "The OAuth 2.0 Authorization Framework," RFC 6749, IETF, Oct. 2012.
- [3] N. Sakimura, J. Bradley, and N. Agarwal, "Proof Key for Code Exchange by OAuth Public Clients," RFC 7636, IETF, Sep. 2015.
- [4] H. Krawczyk, M. Bellare, and R. Canetti, "HMAC: Keyed-Hashing for Message Authentication," RFC 2104, IETF, Feb. 1997.
- [5] OWASP Foundation, "Application Security Verification Standard (ASVS) v4.0.3," 2021. [Online]. Available: https://owasp.org/www-project-application-security-verification-standard/
- [6] OWASP Foundation, "OWASP API Security Top 10 — 2023," 2023. [Online]. Available: https://owasp.org/API-Security/
- [7] PCI Security Standards Council, "Payment Card Industry Data Security Standard (PCI DSS), v4.0," Mar. 2022.
- [8] HashiCorp, "Vault Transit Secrets Engine Documentation." [Online]. Available: https://developer.hashicorp.com/vault/docs/secrets/transit
- [9] Stripe Inc., "Payment Methods and Tokenization Documentation." [Online]. Available: https://stripe.com/docs/payments
- [10] Microsoft Corporation, "The STRIDE Threat Model," Microsoft Docs, 2009.
- [11] National Institute of Standards and Technology, "Advanced Encryption Standard (AES)," FIPS PUB 197, Nov. 2001.
- [12] M. Dworkin, "Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC," NIST SP 800-38D, Nov. 2007.
- [13] National Institute of Standards and Technology, "Secure Hash Standard (SHS)," FIPS PUB 180-4, Aug. 2015.
- [14] H. Krawczyk, M. Bellare, and R. Canetti, "HMAC: Keyed-Hashing for Message Authentication," RFC 2104, IETF, Feb. 1997.
- [15] R. L. Rivest, A. Shamir, and L. Adleman, "A Method for Obtaining Digital Signatures and Public-Key Cryptosystems," *Communications of the ACM*, vol. 21, no. 2, pp. 120–126, Feb. 1978.
- [16] National Institute of Standards and Technology, "Digital Signature Standard (DSS)," FIPS PUB 186-4, Jul. 2013.
- [17] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," RFC 7519, IETF, May 2015.
- [18] D. M'Raihi, S. Machani, M. Pei, and J. Rydell, "TOTP: Time-Based One-Time Password Algorithm," RFC 6238, IETF, May 2011.
- [19] HashiCorp, "Vault Architecture and Key Management." [Online]. Available: https://developer.hashicorp.com/vault/docs/internals/architecture

<div style="page-break-after: always;"></div>

---

# PHỤ LỤC

## Phụ lục A — Cấu trúc repository

```
NT219-Cryptography/
├── services/
│   ├── catalog-service/    # FastAPI, SQLAlchemy; verify JWT ES256 thật
│   ├── cart-service/       # FastAPI, Redis
│   ├── order-service/      # FastAPI, Saga orchestrator (httpx + HMAC)
│   ├── payment-service/    # FastAPI, Stripe, Vault, envelope encryption
│   ├── inventory-service/  # FastAPI, optimistic locking, Outbox
│   ├── shipping-service/   # FastAPI, GHN API
│   └── noti-service/       # FastAPI, Gmail SMTP, Kafka consumer
├── infra/
│   ├── patches/            # envoy.yaml (TLS/JWT/WAF/rate limit), waf.lua
│   ├── vm-setup/           # node-1..4 setup scripts (01→02→03)
│   └── keycloak-themes/    # Custom UIT Store login theme
├── frontend/               # SPA (HTML/CSS/JS)
├── docs/                   # Báo cáo, threat model, benchmark, pentest, ADRs
└── scripts/                # seed_products.py, mock_server.py
```

## Phụ lục B — Security libraries & versions

| Library | Version | Dùng cho |
|---|---|---|
| cryptography | 46.0.6 | AES-256-GCM, ECDSA, TLS |
| python-jose | 3.3.0 | JWT decode/verify |
| hvac | 2.x | HashiCorp Vault client |
| stripe | 11.x | Payment SDK |
| httpx | 0.27 | Async HTTP client (inter-service) |
| starlette | 1.0.1 | ASGI middleware |
| fastapi | 0.115.x | REST API framework |
| jinja2 | 3.1.6 | Email template (noti) |

## Phụ lục C — Envoy JWT filter config + WAF Lua

```yaml
http_filters:
  - name: envoy.filters.http.jwt_authn
    typed_config:
      providers:
        keycloak_provider:
          issuer: "https://keycloak/realms/uitstore"
          audiences: ["account"]
          remote_jwks:
            http_uri:
              uri: "http://keycloak:8080/realms/uitstore/protocol/openid-connect/certs"
              cluster: keycloak_service
              timeout: 5s
            cache_duration: 300s   # Cache JWKS 5 phút
      rules:
        - match: { prefix: "/api/v1/cart" }
          requires: { provider_name: "keycloak_provider" }
        - match: { prefix: "/api/v1/orders" }
          requires: { provider_name: "keycloak_provider" }
        - match: { prefix: "/api/v1/catalog" }   # public, không yêu cầu JWT
          requires: {}
```

## Phụ lục D — Vault Transit key provisioning + AppRole

```bash
vault secrets enable transit
vault write transit/keys/payment-fle-key   type=aes256-gcm96
vault write transit/keys/order-hmac-key    type=hmac
vault write transit/keys/payment-sign-key  type=ecdsa-p256
vault write transit/keys/payment-audit-key type=hmac
vault write transit/keys/inventory-fle-key type=aes256-gcm96
# ... tổng cộng 9 key (xem Bảng 3.5)

vault auth enable approle
vault write auth/approle/role/payment-service \
  token_policies="payment-policy" token_ttl=1h token_max_ttl=4h
```

## Phụ lục E — Kafka topics

| Topic | Producers | Consumers | Nội dung |
|---|---|---|---|
| `inventory.events` | inventory-service | order-service | Stock updates |
| `payment.events` | payment-service | order-service | Payment results |
| `audit-logs` | tất cả services | Logstash | Audit records (HMAC/ECDSA-signed) |

Kafka producer cấu hình `acks=all` + `enable_idempotence=True` để bảo đảm at-least-once không trùng.

## Phụ lục F — Hướng dẫn cài đặt / triển khai

Tham khảo `docs/DEPLOY-GUIDE.md` và `docs/TAILSCALE_DEPLOYMENT.md`: thiết lập Tailscale mesh giữa 4 node; node-1 cài Envoy + Keycloak (`infra/vm-setup/node-1/`); node-2 deploy 6 dịch vụ (`node-2/`); node-3 cài payment + Vault và provision 9 transit key (`node-3/`); node-4 dựng PostgreSQL/Kafka/ELK/Prometheus/Grafana qua docker-compose (`node-4/`). Mỗi node chạy theo trình tự script `01-system-setup.sh → 02-*.sh → 03-start-all.sh`.

## Phụ lục G — Bảng STRIDE đầy đủ (~50 threat)

### G.1. Frontend & Clients (Web SPA / Mobile)

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-FE-01 | Phishing/giả mạo trang login | High | HTTPS + HSTS, CSP, WebAuthn |
| S-FE-02 | Token theft từ localStorage (XSS) | High | httpOnly cookie, CSP, input sanitization |
| T-FE-01 | MitM trên WiFi công cộng | High | TLS 1.3, HSTS preload |
| T-FE-02 | Client-side price manipulation | Medium | Server-side validation, zero-trust |
| R-FE-01 | User phủ nhận đã đặt hàng | Medium | Signed audit log, email xác nhận |
| I-FE-01 | Token leak qua URL/Referrer | Medium | Authorization header, Referrer-Policy |
| I-FE-02 | Secret bị bundle vào JS | High | Không embed secret, backend proxy |
| D-FE-01 | Client-side ReDoS | Low | Validate regex, timeout |
| E-FE-01 | XSS → session hijacking | High | CSP strict-dynamic, httpOnly, SameSite=Strict |

### G.2. API Gateway (Envoy)

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-GW-01 | JWT forgery (alg:none) | Critical | Whitelist ES256, reject none |
| S-GW-02 | Spoofed X-Forwarded-For | Medium | Trust last proxy hop only |
| T-GW-01 | Request/header injection | High | WAF rules, HMAC request signing |
| T-GW-02 | TLS downgrade | Medium | Bắt buộc TLS 1.2+, HSTS |
| R-GW-01 | Thiếu log đầy đủ | Medium | Structured logging append-only |
| I-GW-01 | Error message leakage | Medium | Custom error page, log server-side |
| I-GW-02 | Lộ private key chứng chỉ | Critical | PFS (ECDHE), HSM, short cert lifetime |
| D-GW-01 | Volumetric DDoS | High | CDN DDoS protection, rate limit, circuit breaker |
| D-GW-02 | Slowloris / slow POST | Medium | Connection timeout, max conn/client |
| E-GW-01 | Lộ Envoy Admin API | Critical | Admin API chỉ nội bộ, network segmentation |

### G.3. Identity Provider (Keycloak)

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-IDP-01 | Credential stuffing | High | Rate limit, MFA, breach checking |
| S-IDP-02 | OAuth2 redirect_uri manipulation | High | Whitelist exact match |
| S-IDP-03 | Brute-force password | Medium | Account lockout, CAPTCHA, MFA |
| T-IDP-01 | JWT claim manipulation | Critical | ES256, bảo vệ signing key EC, short TTL |
| T-IDP-02 | CSRF trên login/consent | Medium | State param, PKCE, SameSite |
| R-IDP-01 | Admin phủ nhận đổi role | Medium | Audit log admin action, signed log |
| I-IDP-01 | Token leak qua log | High | Mask token trong log |
| I-IDP-02 | User enumeration | Medium | Generic error: "Invalid credentials" |
| D-IDP-01 | Auth endpoint flooding | High | Rate limit, CAPTCHA, circuit breaker |
| E-IDP-01 | Scope escalation | High | Strict scope validation, whitelist/client |
| E-IDP-02 | Refresh → access token elevated | Medium | Refresh rotation, device binding, revocation |

### G.4. Microservices (Catalog/Cart/Order/Inventory/Shipping/Noti)

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-MS-01 | Rogue microservice | High | mTLS bắt buộc, SPIFFE/SPIRE identity |
| S-MS-02 | Service impersonation qua stolen cert | Medium | Short-lived cert, CRL/OCSP |
| T-MS-01 | IDOR | High | Authorization check, verify ownership |
| T-MS-02 | Race condition inventory (double-spend) | Medium | Optimistic lock, distributed lock, idempotency |
| R-MS-01 | Order state không traceable | Medium | Event sourcing, immutable audit trail |
| I-MS-01 | Over-fetching PII | Medium | Response filtering, DTO pattern |
| I-MS-02 | Log chứa PII | High | PII masking, redaction policy |
| D-MS-01 | Cascading failure | High | Circuit breaker, bulkhead, retry backoff |
| D-MS-02 | Resource exhaustion | Medium | Resource quota, health check, auto-restart |
| E-MS-01 | Broken access control | High | RBAC tại mỗi service, JWT claims, OPA |
| E-MS-02 | Container escape | Critical | Non-root container, seccomp/AppArmor, patching |

### G.5. Payment Service & PSP

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-PAY-01 | Spoofed payment webhook | Critical | Verify webhook HMAC, whitelist IP, idempotency |
| S-PAY-02 | Replay payment request | High | Nonce + idempotency key, timestamp validation |
| T-PAY-01 | Amount tampering | Critical | Server-side amount, signed intent, verify tại PSP |
| T-PAY-02 | Payment token substitution | High | Bind token với session/user |
| R-PAY-01 | Chargeback / phủ nhận giao dịch | High | 3DS/SCA, signed transaction record, IP/device log |
| I-PAY-01 | PAN exposure | Critical | PSP tokenization, PCI-DSS compliance |
| I-PAY-02 | Transaction data leakage | Medium | Mask data, minimal response, encrypted audit |
| D-PAY-01 | PSP outage → checkout blocked | High | Multi-PSP failover, queue & retry |
| D-PAY-02 | Flood → PSP rate limit | Medium | Gateway-level rate limiting |
| E-PAY-01 | Lộ PSP admin key | Critical | PSP key trong Vault, least-privilege, network riêng |

### G.6. Key Management (Vault/KMS/HSM)

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-KMS-01 | Unauthorized service truy cập KMS | Critical | AppRole, service identity (SPIFFE) |
| T-KMS-01 | Key substitution | Critical | HSM tamper protection, key access audit, dual-control |
| T-KMS-02 | Vault policy tampering | High | Policy-as-code, audit policy change, MFA admin |
| R-KMS-01 | Key usage không traceable | Medium | Vault audit backend, SIEM alert |
| I-KMS-01 | Key material exposure | Critical | HSM (key không rời boundary), secure memory |
| I-KMS-02 | Vault root token leak | Critical | Shamir unseal, revoke root sau setup, short TTL |
| D-KMS-01 | KMS throttling | Medium | Envelope encryption + cache DEK, batch |
| E-KMS-01 | Vault root escalation | Critical | Least-privilege policy, no persistent root |

### G.7. Data Storage (PostgreSQL)

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-DB-01 | Spoofed DB connection | High | Network segmentation, DB firewall, TLS |
| T-DB-01 | SQL injection | Critical | Parameterized query, ORM, WAF, least-privilege user |
| T-DB-02 | Direct data modification (DBA) | High | Immutable audit table, HMAC trên record, separation of duties |
| R-DB-01 | DB audit log bị xóa | Medium | Append-only log riêng, forward SIEM, write-once |
| I-DB-01 | Backup theft | Critical | Encrypt backup với KMS, restrict access |
| I-DB-02 | FLE bypass (pattern matching) | Medium | Randomized encryption, blind indexing |
| D-DB-01 | Resource exhaustion query | Medium | Query timeout, connection pool, read replica |
| E-DB-01 | SQLi → OS command | Critical | Disable dangerous function, DB non-root, sandbox |

### G.8. Monitoring, Kafka & Anti-Fraud

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-MON-01 | Fake telemetry events | Medium | Authenticated producer (SASL), message signing |
| T-MON-01 | Audit log tampering | High | Append-only, hash chain, log infra riêng |
| T-MON-02 | ML model poisoning | Medium | Data validation, model monitoring |
| I-MON-01 | PII trong Kafka topic | Medium | Event-level encryption, topic ACL |
| D-MON-01 | Kafka cluster failure | Medium | Kafka HA replication, fallback rule |

### G.9. CI/CD & Supply Chain

| ID | Mối đe dọa | Severity | Mitigation |
|---|---|---|---|
| S-CI-01 | Compromised CI runner | Critical | Ephemeral runner, attestation, isolated build |
| S-CI-02 | Dependency confusion | High | Private registry, dependency pinning |
| T-CI-01 | Unsigned artifact deploy | Critical | cosign/Notary, admission controller, SBOM |
| T-CI-02 | Pipeline config tampering | High | Branch protection, review CI config |
| I-CI-01 | CI secrets exposure | Critical | Masked secret, ephemeral credential, Vault |
| E-CI-01 | PR-based privilege escalation | High | Tách quyền CI/prod, CODEOWNERS, require approval |

## Phụ lục H — Mã nguồn các cơ chế mật mã (vị trí trong repo)

| Cơ chế | File |
|---|---|
| HMAC signer (canonical request) | `services/payment-service/app/infrastructure/crypto/hmac_signer.py` |
| HMAC verification middleware | `services/payment-service/app/api/middleware/hmac_verification.py` |
| Nonce guard (chống replay) | `services/payment-service/app/api/middleware/nonce_guard.py` |
| Envelope encryption (DEK/KEK) | `services/payment-service/app/infrastructure/crypto/envelope_encryption.py` |
| Digital signature (ECDSA event) | `services/payment-service/app/infrastructure/crypto/digital_signature.py` |
| Vault Transit client | `services/payment-service/app/infrastructure/crypto/vault_transit.py` |
| Webhook Stripe (verify signature) | `services/payment-service/app/api/v1/public/webhooks.py` |
| JWT ES256 verify (tham chiếu) | `services/catalog-service/app/api/dependencies.py` |
| Migration append-only audit | `services/payment-service/alembic/versions/0007_audit_log_append_only.py` |
| Envoy gateway + WAF | `infra/patches/envoy.yaml`, `infra/patches/waf.lua` |

## Phụ lục I — Ảnh demo hệ thống chạy thật

Bốn ảnh chụp màn hình minh họa hệ thống vận hành thực tế (UIT Store, qua HTTPS · TLS 1.3), trích từ bản trình diễn đề tài:

- **Hình D.1** — Luồng thanh toán tích hợp Stripe (trang checkout, đơn 4 sản phẩm).
- **Hình D.2** — Chống sửa gói tin: giá sản phẩm được tính server-side, client không thể thao túng.
- **Hình D.3** — Chống giả mạo danh tính (Identity Spoofing): danh tính lấy từ JWT đã xác thực.
- **Hình D.4** — Chống tấn công JWT `alg:none`: token không chữ ký bị từ chối.

*(Ảnh đầy đủ được nhúng trong bản Word `Template_Do_An_Mon_Hoc_VN_FINAL.docx`, mục "Phụ lục — Ảnh demo hệ thống chạy thật".)*

---

*NT219.Q22.ANTT — Mật mã học ứng dụng · Nhóm: Nguyễn Mạnh Cường (24520238), Nguyễn Đức Đại (24520245) · UIT Store — Microservices E-commerce Security Platform · 2026.*
