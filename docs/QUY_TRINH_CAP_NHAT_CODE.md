# QUY TRÌNH CẬP NHẬT MÃ NGUỒN (SOURCE CODE)

Tài liệu này hướng dẫn các bước tiêu chuẩn để thay đổi mã nguồn và áp dụng (deploy) những thay đổi đó lên bất kỳ service nào đang chạy trên các máy ảo (NODE-1, NODE-2, NODE-3, NODE-4).

## Nguyên lý cơ bản

Các service trong hệ thống được quản lý bởi **Systemd** (một trình quản lý tiến trình ngầm của Linux). Khi ứng dụng đang chạy, toàn bộ code cũ đã được nạp vào RAM. Do đó, sau khi sửa file code trên ổ cứng, bạn **bắt buộc phải khởi động lại (restart) service** để nó nạp lại đoạn code mới vào RAM.

---

## Các bước thực hiện

### Bước 1: Áp dụng code mới vào máy ảo

Vì hệ thống đang chạy code từ thư mục `/opt/uitstore/services/`, nhưng mã nguồn gốc lại được quản lý ở thư mục `~/src/NT219-Cryptography/`, bạn cần thực hiện 2 thao tác: kéo code mới nhất từ Github về, sau đó copy đè sang thư mục của service.

**Các bước thực hiện:**

1. **Kéo code mới nhất từ Github:**
   ```bash
   cd ~/src/NT219-Cryptography/
   git pull origin main
   ```
2. **Copy code đè lên thư mục chạy thực tế:**
   ```bash
   sudo cp -r ~/src/NT219-Cryptography/services/<tên-service>/* /opt/uitstore/services/<tên-service>/
   ```
   _(Lưu ý: Nếu chỉ muốn fix nhanh 1 dòng lỗi nhỏ, bạn vẫn có thể gõ lệnh `sudo nano /opt/uitstore/services/<tên-service>/tên_file.py` để sửa trực tiếp, nhưng hãy nhớ cập nhật lại trên Github để không bị mất code ở lần pull sau)._

### Bước 2: Cập nhật thư viện (Chỉ làm nếu cài thêm thư viện)

Nếu thay đổi của bạn có bao gồm việc thêm thư viện mới (ví dụ như thêm vào `requirements.txt`), bạn phải chui vào môi trường ảo của đúng service đó để cài đặt. Nếu không, Python sẽ báo lỗi `ModuleNotFoundError`.

```bash
# 1. Đi tới thư mục chứa code
cd /opt/uitstore/services/<tên-service>

# 2. Kích hoạt môi trường ảo
source venv/bin/activate

# 3. Cài đặt các gói mới
pip install -r requirements.txt

# 4. Thoát khỏi môi trường ảo
deactivate
```

_(Nếu bạn chỉ sửa logic code thông thường, hãy bỏ qua Bước 2 này)._

### Bước 3: Khởi động lại Service (Bắt buộc)

Lệnh này sẽ dập tắt tiến trình cũ và khởi động lại tiến trình mới để nhận diện code vừa sửa:

```bash
sudo systemctl restart <tên-service>
```

_Ví dụ:_ `sudo systemctl restart cart-service`

### Bước 4: Kiểm tra trực tiếp quá trình chạy (Live Logs)

Sau khi restart, việc quan trọng nhất của lập trình viên là xem code mới chạy có sinh ra lỗi (bug) hay không. Bạn hãy dùng lệnh xem log thời gian thực:

```bash
journalctl -u <tên-service> -f
```

_Ghi chú:_

- Cờ `-f` (follow) giúp màn hình liên tục cập nhật các dòng log mới nhất. Mỗi khi ứng dụng in ra màn hình hoặc bị crash, nó sẽ hiện lên ngay lập tức.
- Bấm tổ hợp phím `Ctrl + C` để thoát khỏi màn hình xem log.

---

**Ví dụ thực tế toàn tập (Cập nhật code cho order-service):**

```bash
# 1. Kéo code mới về thư mục mã nguồn
cd ~/src/NT219-Cryptography/
git pull origin main

# 2. Copy code sang thư mục thực thi của service
sudo cp -r ~/src/NT219-Cryptography/services/order-service/* /opt/uitstore/services/order-service/

# 3. Restart dịch vụ
sudo systemctl restart order-service

# 4. Theo dõi log xem có lỗi không
journalctl -u order-service -f
```
