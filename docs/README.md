# 1. Tại sao không dùng Monolith mà lại chia Microservices?

---

## 1. Lý do cốt lõi: **Đề tài yêu cầu mật mã cho giao tiếp giữa các dịch vụ**

Đây là lý do **mạnh nhất** và **khó phản bác nhất**:

Đề tài môn Cryptography yêu cầu triển khai và đánh giá:

- **mTLS** (mutual TLS) cho giao tiếp service-to-service
- **HMAC signing** cho request giữa các dịch vụ
- **API Gateway** làm điểm kiểm soát trung tâm

**Nếu dùng monolith:** tất cả module nằm trong cùng một process → khi Cart gọi Payment, đó chỉ là một **function call trong bộ nhớ** → **không có đường truyền mạng nào** để áp dụng mTLS, HMAC, hay API Gateway cả.

```
MONOLITH (1 process):
┌──────────────────────────────────┐
│  Cart.checkout()                 │
│    → Payment.charge()  ← gọi     │  ← Chỉ là function call
│    → Order.create()      hàm     │  ← Không qua mạng
│    → Email.send()        nội bộ  │  ← Không có gì để mã hóa
└──────────────────────────────────┘

MICROSERVICES (nhiều process):
┌────────┐  ──mTLS──▶  ┌─────────┐
│  Cart  │             │ Payment │   ← Qua mạng, có thể
└────────┘  ◀──HMAC──  └─────────┘   ← bị nghe lén, giả mạo
     │                                ← → CẦN mTLS, HMAC
     │──mTLS──▶  ┌───────┐
     │           │ Order │
     └──────────▶└───────┘
```

> **Câu trả lời ngắn gọn:** "Nếu dùng monolith, sẽ không có giao tiếp mạng giữa các module → không thể triển khai và đánh giá mTLS, HMAC, API Gateway"

---

## 2. Lý do thứ hai: **Cách ly vùng bảo mật (Security boundary isolation)**

Trong thương mại điện tử thực tế, **Payment Service** xử lý dữ liệu thẻ — cực kỳ nhạy cảm. PCI-DSS (Payment Card Industry Data Security Standard) yêu cầu:

- Hệ thống xử lý dữ liệu thẻ phải được **cách ly** khỏi phần còn lại
- Chỉ những thành phần **cần thiết** mới được truy cập vào vùng này

| Kiến trúc         | Cách ly Payment                                                                                                                                  | Tuân thủ PCI-DSS                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Monolith**      | Không thể — tất cả module cùng process, cùng bộ nhớ. Nếu Catalog bị hack → attacker ở trong cùng process với Payment → truy cập được dữ liệu thẻ | **Toàn bộ ứng dụng** nằm trong phạm vi PCI-DSS → phải audit toàn bộ           |
| **Microservices** | Payment Service chạy riêng, mạng riêng, DB riêng. Catalog bị hack → attacker vẫn phải vượt qua mTLS + firewall mới tới Payment                   | **Chỉ Payment Service** nằm trong phạm vi PCI-DSS → audit ít hơn, an toàn hơn |

> **Câu trả lời:** "Microservices cho phép cách ly Payment Service vào vùng bảo mật riêng, thu hẹp phạm vi PCI-DSS. Với monolith, một lỗ hổng ở bất kỳ module nào cũng có thể ảnh hưởng đến dữ liệu thanh toán."

---

## 3. Lý do thứ ba: **Nguyên tắc Least Privilege**

Mỗi microservice chỉ có **quyền tối thiểu**:

```
Catalog Service:  chỉ READ database sản phẩm, không có quyền gì với DB thanh toán
Cart Service:     chỉ READ/WRITE session user, không truy cập KMS
Payment Service:  có quyền gọi KMS, gọi PSP, nhưng không truy cập catalog
```

Với monolith, tất cả module chạy dưới **cùng một identity / cùng quyền** → nếu một module bị khai thác, attacker có toàn bộ quyền của ứng dụng.

---

## 4. Lý do thứ tư: **Thí nghiệm bảo mật đòi hỏi ranh giới mạng**

5 thí nghiệm của đề tài hầu hết cần **nhiều thực thể riêng biệt giao tiếp qua mạng**:

| Thí nghiệm    | Cần microservices vì...                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| Token replay  | Cần API Gateway riêng để validate/reject token                                     |
| Payment fraud | Cần Payment Service riêng gọi PSP qua mạng → có thể intercept, test 3DS            |
| API abuse     | Cần rate limiting **tại API Gateway** — monolith không có gateway                  |
| Key rotation  | Cần nhiều service dùng chung KMS → test xem service nào bị ảnh hưởng khi xoay khóa |
| Supply chain  | Cần **nhiều container image** riêng biệt để test artifact signing                  |

---

## 5. Nhưng cũng phải thành thật: **Trade-off**

Nếu giáo viên hỏi tiếp _"Microservices có nhược điểm gì không?"_:

| Nhược điểm của Microservices                                        | Cách đề tài xử lý                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Phức tạp hơn** monolith rất nhiều (deploy, debug, monitor)        | Dùng Kubernetes + Helm để quản lý tự động                                                               |
| **Latency cao hơn** vì giao tiếp qua mạng thay vì function call     | Đề tài đo latency này như một phần thí nghiệm hiệu năng (mục 8.3) — đây chính là trade-off cần đánh giá |
| **Quản lý dữ liệu** phân tán, khó đảm bảo consistency               | Dùng saga pattern / idempotency key cho payment flow                                                    |
| **Tốn tài nguyên** hơn (nhiều container, mỗi cái có overhead riêng) | Chấp nhận được trong phạm vi lab (k3s đủ nhẹ)                                                           |

> **Câu trả lời mẫu:** "Em nhận thức được microservices phức tạp hơn monolith về vận hành. Tuy nhiên trong ngữ cảnh đề tài Cryptography, sự phức tạp này chính là **đối tượng nghiên cứu** — em cần đánh giá trade-off giữa bảo mật tăng thêm và chi phí hiệu năng/vận hành. Nếu dùng monolith, em sẽ không thể thực hiện được các thí nghiệm này."

---

## Tóm tắt

> _"Lý do chính là đề tài yêu cầu triển khai và đánh giá mTLS, HMAC, API Gateway cho giao tiếp giữa các thành phần — những cơ chế mật mã này chỉ có ý nghĩa khi các thành phần giao tiếp qua mạng, tức microservices. Ngoài ra, microservices cho phép cách ly vùng bảo mật (đặc biệt Payment Service theo yêu cầu PCI-DSS) và áp dụng nguyên tắc least privilege cho từng service. Em cũng nhận thức rằng microservices tạo thêm phức tạp và latency, nhưng đây chính là trade-off mà đề tài yêu cầu em đo lường và đánh giá."_

# 2. Tech-stack

|        Thành phần        |                    Chọn                     | Lý do chọn cái này                                                                                                                                           |
| :----------------------: | :-----------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|    **Orchestration**     |                   **k3s**                   | Nhẹ hơn minikube, chạy multi-node được, gần production hơn                                                                                                   |
|     **API Gateway**      |                  **Envoy**                  | Tài liệu nhắc Envoy trong mục 8.1, phổ biến trong hệ sinh thái K8s hơn, là core của Istio service mesh (hỗ trợ mTLS tự động)                                 |
|  **Identity Provider**   |                **Keycloak**                 | Mã nguồn mở, self-hosted (chạy trong lab được), tài liệu nhắc Keycloak 3 lần trong đề bài (mục 8.1, 11, 16)                                                  |
|   **Payment Sandbox**    |            **Stripe test mode**             | Docs tốt nhất ngành, SDK đa ngôn ngữ, 3DS test cards có sẵn.                                                                                                 |
|    **Key Management**    |             **HashiCorp Vault**             | Dùng cho lab (Tài liệu ghi rõ mục 6.1: "local KMS emulator - HashiCorp Vault"). Vault vừa làm KMS emulator, vừa quản lý secrets, vừa Transit engine thay HSM |
|       **Database**       |               **PostgreSQL**                | Tài liệu chỉ định rõ                                                                                                                                         |
|   **Event Streaming**    |                  **Kafka**                  | Tài liệu chỉ định rõ trong mục 5.8                                                                                                                           |
| **Monitoring (metrics)** |          **Prometheus + Grafana**           | Tài liệu.                                                                                                                                                    |
|  **Monitoring (logs)**   | **ELK** (Elasticsearch + Logstash + Kibana) | Tài liệu chỉ định rõ trong mục 6.2 và 15                                                                                                                     |
|     **Load Testing**     |                 **JMeter**                  | Có UI, dễ demo kết quả                                                                                                                                       |
|   **Security Testing**   |                **OWASP ZAP**                | Miễn phí hoàn toàn (Burp bản đầy đủ trả phí)                                                                                                                 |
| **Dependency Scanning**  |                 Dependabot                  | Dependabot tích hợp sẵn GitHub (miễn phí).                                                                                                                   |
|  **Ngôn ngữ services**   |          **Tùy (Python/FastAPI)**           | Tài liệu để mở                                                                                                                                               |
|       **Frontend**       |          **cái này thì vibe code**          | Chỉ cần đủ demo là được                                                                                                                                      |

# 3. Timeline

https://docs.google.com/spreadsheets/d/12WVoKp0I9Uedm6IfrUanZMRU9E2irAEoN4HYKG37a90/edit?usp=sharing

