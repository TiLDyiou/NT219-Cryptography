# Hướng dẫn cập nhật server (từ plan cũ → plan mới)

> Áp dụng cho hệ thống đã deploy 4-VM theo infra/vm-setup/README.md.
> Thứ tự: NODE-3 → NODE-2 → NODE-1. NODE-4 không cần đụng.

---

## Tóm tắt thay đổi cần đẩy lên server

| Loại | Nội dung | Node |
|------|----------|------|
| Bug fix | Payment service: field name crash + thêm cột `client_secret` | NODE-3 |
| Security | Bật HMAC guard + Nonce guard + tắt dev stubs | NODE-2 + NODE-3 |
| Security | Đồng bộ `LOCAL_CRYPTO_SECRET` chung cho tất cả services | NODE-2 + NODE-3 |
| Frontend | CSP + Referrer-Policy meta tag | NODE-1 |

---

## Bước 0 — Trên máy local: push code lên GitHub

```bash
cd /Users/nergy/NT219-Cryptography
git add -A
git commit -m "fix: payment crash, enable security guards, sync HMAC secret, add CSP"
git push origin main
```

---

## NODE-3 — Payment Service (làm trước vì có DB migration)

```bash
ssh user@192.168.122.13
```

### 1. Pull code mới

```bash
cd ~/src/NT219-Cryptography
git pull origin main
```

### 2. Copy code payment-service

```bash
sudo cp -r ~/src/NT219-Cryptography/services/payment-service/* \
  /opt/uitstore/services/payment-service/
```

### 3. Migrate DB — thêm cột `client_secret` (chạy 1 lần duy nhất)

```bash
# Database nằm trên NODE-4, bạn cần chạy qua remote psql hoặc SSH vào NODE-4:
ssh -t user@192.168.122.14 "sudo -u postgres psql -d payment_db -c 'ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS client_secret VARCHAR(500);'"
echo "✅ Migration OK"
```

> **Tại sao phải chạy tay?** Payment-service dùng `create_all` — lệnh này chỉ tạo bảng mới, không thêm cột vào bảng đã tồn tại. Phải ALTER TABLE thủ công.

### 4. Cập nhật .env trên NODE-3

File `/opt/uitstore/services/payment-service/.env` cần có các dòng này:

```bash
sudo nano /opt/uitstore/services/payment-service/.env
```

Sửa/thêm các dòng:
```
REQUIRE_INBOUND_HMAC=true
REQUIRE_NONCE_GUARD=true
ENABLE_SQLITE_FALLBACK=false
LOCAL_CRYPTO_SECRET=nt219-shared-internal-hmac-secret-32b!
```

Hoặc dùng sed cho nhanh:

```bash
sudo sed -i 's/REQUIRE_INBOUND_HMAC=false/REQUIRE_INBOUND_HMAC=true/' /opt/uitstore/services/payment-service/.env
sudo sed -i 's/REQUIRE_NONCE_GUARD=false/REQUIRE_NONCE_GUARD=true/' /opt/uitstore/services/payment-service/.env
sudo sed -i 's/ENABLE_SQLITE_FALLBACK=true/ENABLE_SQLITE_FALLBACK=false/' /opt/uitstore/services/payment-service/.env
sudo sed -i 's|LOCAL_CRYPTO_SECRET=.*|LOCAL_CRYPTO_SECRET=nt219-shared-internal-hmac-secret-32b!|' /opt/uitstore/services/payment-service/.env
```

### 5. Restart và kiểm tra

```bash
sudo systemctl restart payment-service
sleep 3
journalctl -u payment-service -n 30 --no-pager
```

Kết quả bình thường:
```
INFO: Application startup complete.
```

Nếu thấy lỗi `column "client_secret" of relation "payment_transactions" does not exist` → quay lại Bước 3.

---

## NODE-2 — Các Service Nghiệp vụ

```bash
ssh user@192.168.122.12
cd ~/src/NT219-Cryptography
git pull origin main
```

### Copy code và cập nhật .env cho từng service

```bash
for svc in order-service inventory-service shipping-service noti-service; do
  sudo cp -r ~/src/NT219-Cryptography/services/$svc/* /opt/uitstore/services/$svc/

  sudo sed -i 's/REQUIRE_INBOUND_HMAC=false/REQUIRE_INBOUND_HMAC=true/' /opt/uitstore/services/$svc/.env
  sudo sed -i 's/REQUIRE_NONCE_GUARD=false/REQUIRE_NONCE_GUARD=true/' /opt/uitstore/services/$svc/.env
  sudo sed -i 's/ENABLE_SQLITE_FALLBACK=true/ENABLE_SQLITE_FALLBACK=false/' /opt/uitstore/services/$svc/.env
  sudo sed -i 's|LOCAL_CRYPTO_SECRET=.*|LOCAL_CRYPTO_SECRET=nt219-shared-internal-hmac-secret-32b!|' /opt/uitstore/services/$svc/.env

  echo "✅ Updated $svc"
done
```

Riêng order-service — tắt dev stubs:

```bash
sudo sed -i 's/PAYMENT_DEV_STUB_ON_FAILURE=true/PAYMENT_DEV_STUB_ON_FAILURE=false/' /opt/uitstore/services/order-service/.env
sudo sed -i 's/INVENTORY_DEV_STUB_ON_FAILURE=true/INVENTORY_DEV_STUB_ON_FAILURE=false/' /opt/uitstore/services/order-service/.env
```

### Restart tất cả

```bash
for svc in order-service inventory-service shipping-service noti-service; do
  sudo systemctl restart $svc
  sleep 2
done
```

### Kiểm tra

```bash
systemctl status order-service inventory-service shipping-service noti-service --no-pager

# Test health endpoint
curl -s http://localhost:8003/health | python3 -m json.tool
curl -s http://localhost:8005/health | python3 -m json.tool
```

---

## NODE-1 — Frontend (Nginx)

```bash
ssh user@192.168.122.11
cd ~/src/NT219-Cryptography
git pull origin main

# Copy frontend
sudo cp ~/src/NT219-Cryptography/frontend/index.html /var/www/uitstore/
sudo cp -r ~/src/NT219-Cryptography/frontend/screens/ /var/www/uitstore/screens/

# Reload Nginx (không cần restart)
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Frontend updated"
```

> Không cần restart Envoy hay Keycloak — chỉ có static file thay đổi.

---

## Kiểm tra sau khi cập nhật

### 1. Verify HMAC guard đang hoạt động

Gọi thẳng vào inventory-service **không có** HMAC header — phải bị chặn:

```bash
# Từ NODE-2
curl -s -X POST http://localhost:8005/api/v1/inventory/reserve \
  -H "Content-Type: application/json" \
  -d '{"order_id":"test"}' | python3 -m json.tool
# Kết quả mong đợi: 401 MISSING_SIGNATURE_HEADERS
```

### 2. Verify dev stubs đã tắt

Kiểm tra log order-service — không còn dòng `dev_stub_on_failure`:

```bash
journalctl -u order-service -n 50 --no-pager | grep -i stub
# Kết quả mong đợi: không có output (stub đã tắt)
```

### 3. Verify payment crash đã fix

Tạo đơn thất bại (dùng thẻ từ chối `4000 0000 0000 0002`) — service không được sập:

```bash
journalctl -u payment-service -f
# Gọi API từ frontend và nhập thẻ bị từ chối
# Kết quả mong đợi: log ghi "status=failed", không có AttributeError
```

### 4. Verify CSP trên frontend

```bash
curl -s -I http://192.168.122.11/ | grep -i content-security
# Kết quả mong đợi: Content-Security-Policy header xuất hiện
```

> Nếu Nginx đã cấu hình thêm CSP header ở level server block, sẽ có 2 CSP headers — không vấn đề gì, browser dùng cái restrictive hơn.

---

## Rollback nếu có sự cố

Nếu service nào không start được sau khi cập nhật:

```bash
# 1. Xem log lỗi
journalctl -u <tên-service> -n 50 --no-pager

# 2. Rollback tạm thời: tắt guard để service start được
sudo sed -i 's/REQUIRE_INBOUND_HMAC=true/REQUIRE_INBOUND_HMAC=false/' /opt/uitstore/services/<tên-service>/.env
sudo sed -i 's/REQUIRE_NONCE_GUARD=true/REQUIRE_NONCE_GUARD=false/' /opt/uitstore/services/<tên-service>/.env
sudo systemctl restart <tên-service>

# 3. Debug xong rồi bật lại
```

Riêng payment-service nếu lỗi DB column:

```bash
# Kiểm tra cột đã có chưa (chạy trên NODE-4 hoặc qua SSH)
ssh -t user@192.168.122.14 "sudo -u postgres psql -d payment_db -c '\d payment_transactions' | grep client_secret"

# Nếu chưa có, chạy lại migration
ssh -t user@192.168.122.14 "sudo -u postgres psql -d payment_db -c 'ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS client_secret VARCHAR(500);'"
sudo systemctl restart payment-service
```

---

## Lưu ý quan trọng

- **`LOCAL_CRYPTO_SECRET` phải giống nhau trên tất cả services** — nếu Vault chưa bật, đây là key dùng để verify HMAC giữa các service. Khác nhau → 401 mọi request.
- **Vault vẫn đang `VAULT_ENABLED=false`** trong .env → hệ thống dùng LocalDevCryptoService làm fallback. HMAC hoạt động, nhưng key không được quản lý bởi Vault. Khi bật Vault, cần update `VAULT_ENABLED=true` và cấu hình AppRole.
- **Redis chưa bật** (`REDIS_ENABLED=false`) → Nonce guard dùng InMemory store. Đủ cho demo single-instance, nhưng nonce không được chia sẻ nếu scale nhiều process.
