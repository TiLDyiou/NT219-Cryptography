# QUY TRÌNH KHỞI ĐỘNG LẠI TOÀN BỘ HỆ THỐNG
Tài liệu này hướng dẫn cách khởi động lại toàn bộ cụm 4 máy ảo (NODE-1 đến NODE-4) một cách an toàn và đúng thứ tự nhất sau khi bạn tắt hoặc khởi động lại máy tính thật (Host).

## Nguyên lý cốt lõi: "Móng nhà lên trước, mái nhà lên sau"
Hệ thống kiến trúc Microservices có sự phụ thuộc lẫn nhau rất chặt chẽ. Nếu một service gọi đến Database mà Database chưa bật, service đó sẽ bị sập (crash) ngay lập tức. Do đó, bạn bắt buộc phải tuân thủ thứ tự:
**NODE-4 ➔ NODE-3 ➔ NODE-2 ➔ NODE-1**

---

## Các bước khởi động chi tiết

### Bước 1: Khởi động NODE-4 (Trái tim dữ liệu)
- Bật máy ảo NODE-4 lên.
- **Tại sao phải bật đầu tiên?** Vì NODE-4 chứa toàn bộ PostgreSQL (Database), Kafka (Trục thông điệp), Zookeeper, Elasticsearch. Đây là "móng nhà", bắt buộc phải sống thì các node khác mới có chỗ để lưu trữ.
- **Thao tác:** Đăng nhập vào NODE-4 và chạy lệnh khởi động:
  ```bash
  sudo bash 03-start-all.sh
  ```
- ⚠️ **Lưu ý cực kỳ quan trọng:** Sau khi chạy lệnh xong, hãy **chờ khoảng 30 - 45 giây**. Các dịch vụ như Kafka và Elasticsearch rất nặng, chúng cần thời gian để "tỉnh ngủ" hoàn toàn.

### Bước 2: Khởi động NODE-3 (Két sắt bảo mật & Payment)
- Bật máy ảo NODE-3 lên.
- **Tại sao phải bật thứ hai?** Vì NODE-3 chứa HashiCorp Vault. Két sắt này quản lý toàn bộ mật khẩu. Các service ở NODE-2 cần phải kết nối đến đây để xin cấp phép trước khi hoạt động.
- **Thao tác:** Đăng nhập vào NODE-3 và chạy lệnh khởi động:
  ```bash
  sudo bash 03-start-all.sh
  ```
- *Mẹo:* Đoạn script này đã được lập trình thông minh để tự động dùng file `/root/vault-init.txt` để mở khóa (unseal) Vault cho bạn. Bạn không cần làm thủ công.

### Bước 3: Khởi động NODE-2 (Các Service Nghiệp vụ)
- Bật máy ảo NODE-2 lên.
- **Tại sao phải bật thứ ba?** Chứa các vi dịch vụ cốt lõi (Catalog, Cart, Order, Shipping, Inventory). Lúc này Database ở NODE-4 đã sẵn sàng, Két sắt ở NODE-3 đã mở cửa, nên các service này khi chạy lên sẽ kết nối thành công 100%.
- **Thao tác:** Đăng nhập vào NODE-2 và chạy lệnh:
  ```bash
  sudo bash 03-start-all.sh
  ```

### Bước 4: Khởi động NODE-1 (Cổng giao tiếp & Giao diện)
- Bật máy ảo NODE-1 lên.
- **Tại sao phải bật cuối cùng?** Chứa Envoy Gateway (Cổng tiếp tân) và Giao diện Web (Frontend). Đây là nơi đón khách từ bên ngoài vào. Chỉ nên mở cửa đón khách khi mâm cỗ (các service ở NODE-2) đã được dọn sẵn sàng.
- **Thao tác:** Đăng nhập vào NODE-1 và chạy lệnh:
  ```bash
  sudo bash 03-start-all.sh
  ```

---
## 💡 Tóm tắt mẹo vặt để không bao giờ bị lỗi
1. Luôn nhớ thuộc lòng thứ tự: **4 ➔ 3 ➔ 2 ➔ 1**.
2. **Sự kiên nhẫn là chìa khóa:** Mỗi khi bật 1 Node lên, hãy đếm thầm 30 giây để Hệ điều hành nạp xong RAM rồi hẵng gõ lệnh `sudo bash 03-start-all.sh`.
3. Trong trường hợp lỡ tay chạy sai thứ tự làm một service bị crash, không cần phải khởi động lại máy ảo. Chỉ cần qua đúng NODE đó gõ lệnh Restart tiến trình là được (ví dụ: `sudo systemctl restart order-service`).
