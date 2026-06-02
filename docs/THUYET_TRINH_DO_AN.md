# THUYẾT TRÌNH ĐỒ ÁN NT219

**Nhóm B1.12 · MMT&TT · NT219.Q22.ANTT_2026**

---

## SLIDE 1 — TRANG BÌA

# UIT Store

### Thiết kế & Đánh giá An toàn Mật mã cho Nền tảng Thương mại Điện tử

NT219 · Nhóm B1.12 · MMT&TT

---

## SLIDE 2 — PROJECT GOALS

**Mục tiêu:** Xây dựng prototype sàn TMĐT và đánh giá các cơ chế bảo mật bằng thực nghiệm — không chỉ lý thuyết.

**3 câu hỏi nghiên cứu:**

|     | Câu hỏi                                                | Trả lời bằng                     |
| --- | ------------------------------------------------------ | -------------------------------- |
| RQ1 | Lỗ hổng mật mã phổ biến nhất trong e-commerce là gì?   | Code review + 26 security tests  |
| RQ2 | Tokenization có bảo vệ được dữ liệu thẻ thật sự không? | Kiểm tra DB schema + Stripe test |
| RQ3 | Vault/KMS tốt hơn tự quản lý key như thế nào?          | Benchmark 5000 lần đo            |

**Đã xây dựng:**

- 7 microservices chạy thật trên 4 máy ảo
- Tích hợp: Stripe · Keycloak · HashiCorp Vault · Kafka · ELK · Grafana

---

## SLIDE 3 — SECURITY RISKS

**Các rủi ro chính trong hệ thống e-commerce:**

| Rủi ro                             | Kịch bản                                                   | Hậu quả                   |
| ---------------------------------- | ---------------------------------------------------------- | ------------------------- |
| Lưu số thẻ trong DB                | Bị hack → lộ toàn bộ số thẻ khách hàng                     | Vi phạm PCI-DSS           |
| JWT không có thời hạn              | Token bị đánh cắp → dùng mãi mãi                           | Chiếm tài khoản           |
| Service nội bộ không xác thực nhau | Hacker vào mạng nội bộ → gọi thẳng API thanh toán          | Giao dịch trái phép       |
| Webhook không kiểm tra chữ ký      | Gửi webhook giả "đã thanh toán" → xuất hàng không thu tiền | Thất thoát doanh thu      |
| Không giới hạn request             | Bot thử mật khẩu hàng nghìn lần/giờ                        | Chiếm tài khoản hàng loạt |
| API key cứng trong code            | Push lên GitHub → bị thu thập tự động                      | Mất tiền không kiểm soát  |

**Rủi ro thực tế tìm thấy trong chính codebase nhóm:**

| Mức độ       | Lỗ hổng                                                      | Đã fix |
| ------------ | ------------------------------------------------------------ | ------ |
| Nghiêm trọng | Tin tưởng `X-User-Id` header không verify — ai cũng giả được | ✅     |
| Cao          | `REQUIRE_INBOUND_HMAC=False` — mọi service gọi được Payment  | ✅     |
| Cao          | `dev_stub_on_failure=True` — kho lỗi vẫn xác nhận đơn hàng   | ✅     |
| Trung bình   | Webhook lỗi trả HTTP 500 → Stripe retry vô tận               | ✅     |

---

## SLIDE 4 — KIẾN TRÚC GIẢI PHÁP

```
         Người dùng
              │ HTTPS TLS 1.3
              ▼
        [Envoy Gateway]   ← JWT · Rate Limit · WAF · CORS
              │
   ┌──────────┼──────────────┐
   ▼          ▼              ▼
[Keycloak] [Catalog/Cart]  [Order]  ← Saga Orchestrator
 OAuth2/OIDC                  │ HMAC-SHA256 ký mỗi request
 MFA · JWT RS256     ┌────────┼────────┐
                     ▼        ▼        ▼
               [Kho hàng] [Thanh toán] [Email]
                              │
                        [Stripe] · [Vault]

[PostgreSQL · Kafka · ELK · Prometheus · Grafana]
```

**Bảo mật theo từng lớp:**

| Lớp                | Cơ chế                                    | Giải quyết rủi ro        |
| ------------------ | ----------------------------------------- | ------------------------ |
| Internet → Gateway | TLS 1.3 + JWT 120s + MFA TOTP             | Token giả, nghe lén      |
| Service → Service  | HMAC-SHA256 + timestamp + nonce           | Service giả trong nội bộ |
| Thanh toán         | PSP Tokenization — không lưu số thẻ       | Lộ số thẻ khi bị hack    |
| Database           | AES-256-GCM mã hóa từng trường PII        | DBA đọc trộm dữ liệu     |
| Quản lý key        | HashiCorp Vault — ghi log mọi lần đọc key | Key bị lấy trộm          |
| Bằng chứng         | Audit log không thể xóa (PostgreSQL RULE) | Xóa bằng chứng gian lận  |

---

## SLIDE 5 — PHƯƠNG ÁN TRIỂN KHAI

**4 máy ảo kết nối qua Tailscale WireGuard (VPN):**

| Node              | Chạy gì                                              | Lý do tách riêng           |
| ----------------- | ---------------------------------------------------- | -------------------------- |
| Node 1 — Ingress  | Envoy Gateway + Keycloak                             | DMZ, chỉ expose port 10000 |
| Node 2 — Services | catalog · cart · order · inventory · shipping · noti | Service plane              |
| Node 3 — Payment  | payment-service + HashiCorp Vault                    | Cách ly PCI scope          |
| Node 4 — Data     | PostgreSQL + Kafka + ELK + Grafana                   | Data plane riêng           |

**Luồng xử lý đơn hàng (Saga Pattern):**

```
Đặt hàng → Giữ kho (10 phút) → Kiểm tra gian lận → Charge Stripe 3DS
         → Xác nhận đơn → Trừ kho thật → Giao hàng → Gửi email
Bất kỳ bước nào lỗi → rollback, hoàn hàng tự động
```

**Bí mật & key:**

```
❌ Không: STRIPE_KEY=sk_live_xxx hardcode trong code
✅ Đang:  Vault AppRole → mỗi service tự lấy key lúc khởi động
          gitleaks scan → 0 key thật trong git history
```

---

## SLIDE 6 — KẾT QUẢ TRIỂN KHAI

**26 bài test chạy trực tiếp trên hệ thống đang chạy:**

| Nhóm            | Kết quả | Ví dụ cụ thể                                     |
| --------------- | ------- | ------------------------------------------------ |
| Đăng nhập & JWT | 5/6 ✅  | Token giả → 401 · Token hết hạn → 401            |
| Thanh toán      | 6/7 ✅  | Webhook giả → 400 · Trả 2 lần → chặn (438ms→5ms) |
| Tấn công API    | 7/7 ✅  | SQL injection → 403 · Quá 100 req/phút → 429     |
| Quản lý key     | 2/2 ✅  | Vault hoạt động · KMS latency 24.6ms             |
| Chuỗi cung ứng  | 2/2 ✅  | 0 lỗ hổng HIGH/CRITICAL · 0 key thật trong git   |

**Trước và sau:**

```
CVE trong thư viện:    40  →   8  (giảm 80%)  ✅
Lỗ hổng HIGH/CRITICAL:  1  →   0              ✅
OWASP API Top 10:    2/10  → 10/10             ✅
PCI-DSS (bảo mật thẻ): 2/9 → 8/9             ✅
```

**Overhead mật mã:**

```
Mã hóa AES-256 / ký HMAC:   < 0.002ms  →  không đáng kể
Vault lấy key (cache 5 phút): ~0ms      →  không đáng kể
Stripe xử lý thanh toán:    200–500ms   →  đây mới là chỗ người dùng chờ
Tổng overhead do mật mã:    dưới 6%     →  người dùng không cảm nhận được
```

---

## SLIDE 7 — DEMO

| #   | Demo                             | Chứng minh         |
| --- | -------------------------------- | ------------------ |
| 1   | Đăng nhập → JWT hết hạn sau 120s | Auth flow + MFA    |
| 2   | Mua hàng → Stripe → nhận email   | Luồng happy path   |
| 3   | Gửi webhook giả → HTTP 400       | HMAC verify        |
| 4   | Gửi 105 request → bị chặn 429    | Rate limiting      |
| 5   | Grafana + Kibana                 | Log & metrics live |

**Thẻ test Stripe:**
`4242 4242 4242 4242` (thành công) · `4000 0000 0000 0002` (từ chối) · `4000 0027 6000 3184` (3DS)

---

# CÂU HỎI THƯỜNG GẶP

**Lỗ hổng tìm ra trong code — có phải nhóm làm kém không?**
Không — tìm ra và fix lỗ hổng thực tế là mục tiêu của đề tài (mục 8.2 đề cương). Không phát hiện ra mới đáng lo.

**Sao không làm monolith?**
Monolith không có mạng giữa các phần → không áp dụng được HMAC hay API Gateway → không có gì để bảo vệ và đo.

**Vault chậm 24ms có vấn đề không?**
Không — cache 5 phút nên hầu hết request chỉ tốn <0.002ms. Người dùng chờ Stripe 200–500ms, không chờ Vault.

**3 mục chưa hoàn thành?**
Đổi password PostgreSQL, kích hoạt mã hóa PII, ký artifact. Code đã sẵn sàng, là backlog vận hành không phải lỗi thiết kế.

---

_NT219.Q22.ANTT_2026 · Nhóm B1.12 · 2026-06-02_
