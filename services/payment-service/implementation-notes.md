# Ghi chú Triển khai Dịch vụ Thanh toán (Payment-Service Implementation Notes)

Tài liệu này ghi lại các quyết định thiết kế, thay đổi ngoài đặc tả ban đầu, các đánh đổi kỹ thuật (tradeoffs) và những thông tin quan trọng trong quá trình lập trình `payment-service`.

---

## 1. Các Quyết định Thiết kế & Đánh đổi kỹ thuật (Tradeoffs)

### Quyết định 1: Giữ nguyên luồng Saga của `order-service` (Đồng bộ tương thích ngược 100%)
*   **Chi tiết:** Người dùng yêu cầu **không** thay đổi Saga của `order-service` thành Event-Sourcing (chờ đợi bất đồng bộ qua Kafka). Do đó, luồng Saga cũ của `order-service` sẽ phụ thuộc trực tiếp vào kết quả phản hồi đồng bộ tức thời từ API `/api/v1/payments/charge` của `payment-service`.
*   **Giải pháp:** 
    *   API `/charge` đồng bộ trong `payment-service` được thiết kế để trả về các trạng thái nghiệp vụ cụ thể: `succeeded`, `processing`, hoặc `failed`.
    *   Khi giao dịch thẻ thành công ngay (Frictionless): Phản hồi ngay `succeeded`. Saga của `order-service` sẽ chuyển trạng thái đơn hàng thành `confirmed` và tiếp tục trơn tru.
    *   Khi giao dịch thẻ bị từ chối (Decline): Phản hồi `failed`. Saga của `order-service` lập tức rollback/compensate.
*   **Xử lý 3D Secure (3DS Challenge) & Đánh đổi:**
    *   Khi giao dịch thẻ yêu cầu xác thực bảo mật 3DS từ phía người dùng (`requires_action` trên Stripe), nếu trả về `requires_action` trực tiếp cho `order-service`, Saga sẽ coi đây là lỗi thanh toán và tiến hành hủy/rollback đơn hàng.
    *   **Giải pháp đánh đổi:** Chúng tôi gán trạng thái trong Database là `processing` và phản hồi đồng bộ là `processing` kèm theo payload `next_action.redirect_to_url`. Đối với `order-service`, trạng thái `processing` nằm trong tập chấp nhận được (`{"succeeded", "processing", "authorized"}`), do đó Saga vẫn coi là thành công tạm thời và đi tiếp.
    *   Sau đó, khi người dùng hoàn thành 3DS challenge ở trình duyệt, Stripe Webhook gửi sự kiện `payment_intent.succeeded` về `payment-service`. Lúc này, trạng thái giao dịch sẽ được cập nhật chuẩn xác thành `succeeded` ở database của `payment-service` và đẩy sự kiện qua Outbox. Ngược lại, nếu xác thực thất bại hoặc user hủy bỏ, webhook gửi về sẽ cập nhật trạng thái là `failed`.

### Quyết định 2: Tích hợp Redis vào tệp docker-compose hiện có
*   **Chi tiết:** Thêm dịch vụ Redis (`image: redis:7.4-alpine`) vào tệp [docker-compose.yml](file:///home/tildy/Documents/NT219-Cryptography/infra/docker-compose.yml) ở cổng `6379`.
*   **Vai trò:** Dùng làm cache phân tán cho việc chống trùng lặp yêu cầu nonce (`RedisNonceStore`) và khóa lock thanh toán đồng thời (`RedisIdempotencyStore`) nhằm giải quyết Race Condition **R5** (Concurrent same idempotency_key).

---

## 2. Các giải pháp phòng chống Race Conditions (R1 -> R6)

Chúng tôi đã cài đặt đầy đủ các cơ chế ngăn ngừa race conditions chuẩn production:
*   **R1 (Tránh ghi đè khi webhook đến trước API đồng bộ commit):** Sử dụng mệnh đề khóa hàng database `with_for_update()` khi webhook handler tìm kiếm transaction để cập nhật trạng thái, ép luồng webhook phải đợi cho đến khi transaction của API đồng bộ kết thúc hoàn toàn.
*   **R2 (Webhook gửi trùng từ Stripe):** Cài đặt `PgWebhookLogRepository.insert_if_new()` sử dụng `ON CONFLICT DO NOTHING RETURNING` nguyên tử ở tầng PostgreSQL. SQLite fallback có cơ chế kiểm tra check tồn tại trước khi ghi.
*   **R3 (Webhook lệch thứ tự - Out-of-order):** Bảo vệ bằng State Machine ở tầng Value Object `PaymentStatus.can_transition(current, target)`. Các chuyển đổi trạng thái quay lui (ví dụ: `succeeded` -> `processing`) sẽ bị loại bỏ lặng lẽ (silent NO-OP), không gây lỗi cho hệ thống.
*   **R4 (Tránh trùng lặp phát sự kiện):** Áp dụng mô hình **Transactional Outbox Pattern** với `OutboxWorker` sử dụng `SELECT FOR UPDATE SKIP LOCKED` để quét các sự kiện chưa phát song song. Chỉ có webhook handler mới có quyền đưa sự kiện thành công/thất bại vào outbox để phát đi, đảm bảo tính nguyên tử tuyệt đối.
*   **R5 (Nhiều request cùng idempotency key gọi song song):** Giải quyết bằng `RedisIdempotencyStore.claim_or_wait()`. Tiến trình đầu tiên sẽ giữ khóa lock Redis. Các tiến trình đến sau sẽ polling Redis mỗi `0.2s` trong tối đa `30s` để lấy kết quả cached của tiến trình đầu thay vì gọi Stripe lần thứ hai.
*   **R6 (Webhook đọc trạng thái cũ):** Webhook handler luôn gọi Stripe API `retrieve_payment_intent` trực tiếp để lấy trạng thái chuẩn nhất thời điểm hiện tại từ Stripe thay vì tin cậy vào payload đính kèm trong webhook event.

---

## 3. Các điểm lưu ý khi vận hành và kiểm thử

*   **Khởi tạo Vault:** Cần chạy script `VAULT_ADDR=http://localhost:8200 bash infra/vault/scripts/init-vault.sh` để sinh đầy đủ AppRole và các transit keys cần thiết cho `payment-service` trước khi khởi chạy ở chế độ production.
*   **SQLite Fallback:** Khi chạy ở chế độ local development không có Postgres/Vault/Kafka, chỉ cần cấu hình `ENABLE_SQLITE_FALLBACK=true` và `VAULT_ENABLED=false` trong file `.env`, hệ thống sẽ tự động chuyển sang lưu database SQLite cục bộ (`payment_service.db`) và giả lập mã hóa local cực kỳ mượt mà.
