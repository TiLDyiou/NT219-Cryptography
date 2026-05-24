# Lí do tại sao order-service gọi payment-service dùng HTTPS (sync) thay vì Kafka (async)

1. Tính nhất quán tuyệt đối về Tiền bạc

- Giao dịch tài chính là nghiệp vụ nhạy cảm, không thể chấp nhận trạng thái "lơ lửng" hay "sẽ cập nhật sau".
- Hệ thống bắt buộc phải biết chắc chắn 100% tài khoản khách đã bị trừ tiền trước khi tự tin ra lệnh xuất kho và gọi shipper. HTTPS giúp chốt chặn việc này ngay tại chỗ.

1. Phản hồi tức thì cho Khách hàng (Tăng UX)

- Người mua hàng online rất thiếu kiên nhẫn ở khâu trả tiền. Họ cần nhìn thấy kết quả ngay lập tức trên màn hình.
- HTTPS mở một đường ống trực tiếp, đứng đợi hệ thống ngân hàng xử lý trong 1-3 giây và trả thẳng kết quả về app để khách hàng an tâm.

1. Tăng tỷ lệ chốt đơn (Giảm Drop-rate)

- Nếu dùng HTTPS: Tài khoản hết tiền hoặc lỗi mạng → Báo lỗi ngay trên màn hình → Khách sẽ tìm cách xử lý tại thời điểm lỗi → Cứu được đơn hàng.
- Nếu dùng Kafka: Hệ thống cho qua, 10 phút sau Payment rảnh rỗi mới xử lý tới và phát hiện lỗi → Gửi email/thông báo cho khách. Lúc này khách đã đi ngủ hoặc đổi ý mua chỗ khác → Mất trắng đơn hàng.

