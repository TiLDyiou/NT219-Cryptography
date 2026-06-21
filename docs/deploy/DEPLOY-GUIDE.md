# Hướng dẫn Deploy: VMs + Tunnel + Vercel

## Tổng quan

```
[Vercel Frontend] ──HTTPS──▶ [Ngrok / Cloudflare Tunnel] ──▶ [NODE-1 Envoy :10000]
                                                                       │
                                                             ┌──────────▼──────────┐
                                                             │   NODE-2 Services   │
                                                             │   :8001 catalog     │
                                                             │   :8002 cart        │
                                                             │   :8003 order       │
                                                             │   :8005 inventory   │
                                                             │   :8007 shipping    │
                                                             │   :8008 noti        │
                                                             └─────────────────────┘
```

### So sánh 2 cách tunnel

|                 | Ngrok Free                   | Cloudflare Quick Tunnel     |
| --------------- | ---------------------------- | --------------------------- |
| Cài đặt         | Dễ                           | Dễ                          |
| URL cố định     | Có (sau khi đăng ký account) | Không (đổi mỗi lần restart) |
| Tốc độ          | Tốt                          | Tốt                         |
| Cần tài khoản   | Có (free)                    | Không                       |
| Cần domain      | Không                        | Không                       |
| Chi phí         | Miễn phí                     | Miễn phí                    |
| **Khuyến nghị** | **Dùng cái này**             | Dùng khi không muốn đăng ký |

---

## Bước 1 — Lấy IP của từng VM

SSH vào **từng VM** và chạy:

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Ghi lại 4 IP:

| Node   | Role            | IP ghi lại        |
| ------ | --------------- | ----------------- |
| NODE-1 | Ingress (Envoy) | `___.___.___.___` |
| NODE-2 | Services        | `___.___.___.___` |
| NODE-3 | Payment + Vault | `___.___.___.___` |
| NODE-4 | DB + Kafka      | `___.___.___.___` |

---

## Bước 2 — Cập nhật `.env` cho các services trên NODE-2

Trên **NODE-2**, thay `<NODE4_IP>` / `<NODE3_IP>` bằng IP thật bằng 1 lệnh:

```bash
cd /opt/uitstore/services

# Ví dụ: NODE-4 là 192.168.64.14, NODE-3 là 192.168.64.13
find . -name ".env" -exec sed -i 's/<NODE4_IP>/192.168.64.14/g' {} \;
find . -name ".env" -exec sed -i 's/<NODE3_IP>/192.168.64.13/g' {} \;

# Kiểm tra — không còn placeholder nào là OK
grep -r "NODE" .
```

---

## Bước 3 — Chạy infra theo thứ tự

Thứ tự bắt buộc: **NODE-4 → NODE-3 → NODE-2 → NODE-1**

### NODE-4 (DB + Kafka + Observability)

```bash
ssh user@<NODE4_IP>
cd /opt/uitstore/infra/vm-setup/node-4
sudo bash 01-system-setup.sh
sudo bash 02-install-data-obs.sh
sudo bash 03-start-all.sh
```

### NODE-3 (Payment + Vault)

```bash
ssh user@<NODE3_IP>
cd /opt/uitstore/infra/vm-setup/node-3
sudo bash 01-system-setup.sh
VM2_IP=<NODE2_IP> VM4_IP=<NODE4_IP> sudo bash 02-setup-payment.sh
sudo bash 03-start-all.sh
```

### NODE-2 (Microservices)

```bash
ssh user@<NODE2_IP>
cd /opt/uitstore/infra/vm-setup/node-2
sudo bash 01-system-setup.sh
VM3_IP=<NODE3_IP> VM4_IP=<NODE4_IP> sudo bash 02-setup-services.sh
sudo bash 03-start-all.sh
```

### NODE-1 (Ingress: Nginx + Envoy)

```bash
ssh user@<NODE1_IP>
cd /opt/uitstore/infra/vm-setup/node-1
sudo bash 01-system-setup.sh
VM1_IP=<NODE1_IP> VM2_IP=<NODE2_IP> sudo bash 02-setup-ingress.sh
```

---

## Bước 4 — Kiểm tra services đang chạy

Trên **NODE-2**:

```bash
systemctl status catalog-service cart-service order-service \
  inventory-service shipping-service noti-service
```

Trên **NODE-1** — test Envoy routing:

```bash
systemctl status envoy nginx

curl http://localhost:10000/api/v1/catalog/public/products
# Trả về JSON là OK
```

---

## Bước 5 — Tạo Tunnel (chọn 1 trong 2 cách)

---

### Cách A — Ngrok (khuyến nghị, URL cố định)

#### A.1 Đăng ký tài khoản

Vào [ngrok.com](https://ngrok.com) → Sign up free → vào **Dashboard** → copy **Authtoken**.

#### A.2 Cài ngrok trên NODE-1

```bash
ssh user@<NODE1_IP>

curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null

echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list

sudo apt update && sudo apt install ngrok -y
```

#### A.3 Xác thực

```bash
ngrok config add-authtoken <AUTHTOKEN_CỦA_BẠN>
```

#### A.4 Chạy tunnel

```bash
# Chạy nền
nohup ngrok http 10000 > /tmp/ngrok.log 2>&1 &

# Lấy URL (chờ 3 giây)
sleep 3 && curl -s http://localhost:4040/api/tunnels \
  | grep -o '"public_url":"[^"]*"' | head -1
```

Kết quả dạng:

```
"public_url":"https://abc123.ngrok-free.app"
```

> URL này **cố định** theo account, không đổi dù restart ngrok.

#### A.5 Chạy tự động khi VM boot (tùy chọn)

```bash
sudo tee /etc/systemd/system/ngrok.service <<EOF
[Unit]
Description=Ngrok Tunnel
After=network.target

[Service]
ExecStart=/usr/local/bin/ngrok http 10000 --log=stdout
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable ngrok
sudo systemctl start ngrok
```

---

### Cách B — Cloudflare Quick Tunnel (không cần đăng ký)

#### B.1 Cài `cloudflared` trên NODE-1

```bash
ssh user@<NODE1_IP>

curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

#### B.2 Chạy tunnel

```bash
# Chạy nền
nohup cloudflared tunnel --url http://localhost:10000 \
  > /tmp/cloudflared.log 2>&1 &

# Lấy URL (chờ 5 giây)
sleep 5 && grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

Kết quả dạng:

```
https://random-name-here.trycloudflare.com
```

> **Lưu ý:** URL này **thay đổi** mỗi lần restart → phải cập nhật `api.js` lại.

#### B.3 Chạy tự động khi VM boot (tùy chọn)

```bash
sudo tee /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:10000
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Bước 6 — Cập nhật `api.js`

Trên **máy local**, mở [frontend/api.js](../frontend/api.js) và đổi dòng đầu tiên:

```javascript
// Dán URL lấy được từ Bước 5 vào đây
const BACKEND_URL = "https://abc123.ngrok-free.app";
//                   hoặc 'https://random-name-here.trycloudflare.com'
```

Sau đó commit:

```bash
git add frontend/api.js
git commit -m "config: set backend URL to tunnel"
```

---

## Bước 7 — Deploy Frontend lên Vercel

### 7.1 Cài Vercel CLI

```bash
npm install -g vercel
```

### 7.2 Login và deploy lần đầu

```bash
cd /Users/nergy/NT219-Cryptography/frontend

vercel login        # đăng nhập bằng GitHub/email
vercel deploy       # deploy preview
```

Khi được hỏi:

- **Set up and deploy?** → `Y`
- **Which scope?** → chọn account của bạn
- **Project name** → `uit-store` (hoặc tên khác)
- **In which directory is your code located?** → `./`
- **Want to modify settings?** → `N`

### 7.3 Deploy production

```bash
vercel --prod
```

Vercel trả về URL dạng: `https://uit-store.vercel.app`

---

## Checklist cuối cùng

- [ ] Bước 1: Ghi đủ 4 IP của các VM
- [ ] Bước 2: Thay `<NODE4_IP>` và `<NODE3_IP>` trong tất cả `.env`, không còn placeholder
- [ ] Bước 3: Chạy infra scripts đúng thứ tự NODE-4 → NODE-3 → NODE-2 → NODE-1
- [ ] Bước 4: `curl localhost:10000/api/v1/catalog/public/products` trả về JSON
- [ ] Bước 5: Tunnel đang chạy, đã có URL public
- [ ] Bước 6: `BACKEND_URL` trong `api.js` đã là URL tunnel, đã commit
- [ ] Bước 7: `vercel --prod` thành công, có URL `*.vercel.app`

---

## Troubleshooting

| Vấn đề                      | Nguyên nhân                              | Kiểm tra                                    |
| --------------------------- | ---------------------------------------- | ------------------------------------------- | --- |
| `curl` NODE-1 trả về 404    | Envoy chưa start hoặc prefix_rewrite lỗi | `systemctl status envoy`                    |
| Service không start         | `.env` sai hoặc DB chưa sẵn sàng         | `journalctl -u catalog-service -n 50`       |
| DB connection refused       | `.env` có IP sai của NODE-4              | `grep DATABASE_URL services/*/.env`         |
| Ngrok tunnel disconnect     | Mạng không ổn định                       | `systemctl restart ngrok`                   |
| Cloudflare URL đổi          | VM restart                               | Chạy lại B.2, cập nhật `api.js`             |
| Vercel gọi API lỗi CORS     | —                                        | CORS đang `["*"]` → không phải lỗi CORS     |
| Vercel 502 / 503            | Tunnel chết hoặc Envoy chết              | Kiểm tra tunnel và `systemctl status envoy` |
| Ngrok 429 Too Many Requests | Free tier giới hạn request               | Dùng Cloudflare thay thế                    | u   |
