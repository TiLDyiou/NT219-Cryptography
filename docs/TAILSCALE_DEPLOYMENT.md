# Hướng dẫn kết nối đa máy chủ bằng Tailscale

Tài liệu này hướng dẫn dùng Tailscale (dịch vụ tạo mạng riêng giữa các máy qua Internet) để kết nối 4 VM (máy ảo chạy như một máy tính riêng) khi các VM không nằm trong cùng một mạng NAT (cơ chế router chia sẻ một IP Internet cho nhiều máy trong mạng nội bộ) `192.168.122.x`.

Giả định triển khai:

- NODE-1, NODE-2, NODE-3 chạy trên máy của bạn.
- NODE-4 chạy trên máy khác.
- Cả 4 VM dùng Ubuntu (hệ điều hành Linux phổ biến cho server) và có Internet.
- Source code (mã nguồn của dự án) phải nằm tại `/opt/uitstore` trên từng VM trước khi chạy các script `02-*` (file lệnh tự động cài và cấu hình hệ thống).
- Các giá trị `<NODE1_IP>`, `<NODE2_IP>`, `<NODE3_IP>`, `<NODE4_IP>` là Tailscale IP (địa chỉ mạng do Tailscale cấp cho từng VM), lấy bằng `tailscale ip -4`.

## 1. Tailscale giải quyết vấn đề gì?

Khi cả 4 VM nằm trên cùng một host libvirt (máy thật đang chạy các VM bằng công cụ ảo hóa libvirt), các node (máy trong cụm triển khai) có thể nói chuyện với nhau qua dải `192.168.122.x`.

Khi NODE-4 được đưa sang máy khác, IP `192.168.122.14` (địa chỉ mạng nội bộ cũ của NODE-4) chỉ còn ý nghĩa trong mạng NAT của máy đó. Vì vậy NODE-2 trên máy bạn sẽ không ping (gửi gói kiểm tra kết nối mạng) hoặc kết nối được đến `192.168.122.14`.

Tailscale tạo một mạng riêng ảo giữa các VM. Mỗi VM sẽ có một IP riêng trong dải `100.64.0.0/10` (vùng địa chỉ Tailscale dùng cho thiết bị trong mạng riêng). Các service (ứng dụng chạy nền như catalog-service, order-service, PostgreSQL) sẽ dùng Tailscale IP này thay cho IP `192.168.122.x`, vì Tailscale IP có thể đi xuyên qua 2 mạng nhà khác nhau.

Lưu ý: Tailscale ưu tiên kết nối trực tiếp peer-to-peer (hai máy nói chuyện trực tiếp với nhau). Nếu NAT không cho phép kết nối trực tiếp, Tailscale có thể dùng relay DERP (máy trung chuyển của Tailscale để chuyển tiếp lưu lượng). Đường truyền vẫn được mã hóa đầu-cuối bằng WireGuard (giao thức VPN dùng để mã hóa dữ liệu giữa hai máy), nhưng độ trễ có thể cao hơn.

## 2. Chuẩn bị Tailscale trên 4 VM

Trên từng VM, chạy:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Vì sao cần chạy:

- `curl ... | sh` tải và chạy bộ cài Tailscale. Nếu không cài Tailscale, VM không có Tailscale IP để các node khác kết nối.
- `sudo tailscale up` đăng nhập VM vào tailnet (mạng riêng của tài khoản Tailscale). Nếu chưa chạy lệnh này, máy đã cài Tailscale nhưng chưa tham gia mạng chung.

`sudo tailscale up` sẽ in ra một URL (đường link mở trong trình duyệt) để đăng nhập. Mở URL đó và đưa cả 4 VM vào cùng một tailnet.

Với demo, có thể dùng chung một tài khoản Tailscale. Cách sạch hơn là mỗi người dùng tài khoản riêng và cùng tham gia một tailnet.

Sau khi đăng nhập xong, lấy IP của từng node:

```bash
tailscale ip -4
```

Vì sao cần chạy: các script triển khai cần biết IP thật của từng node trong mạng Tailscale. Nếu truyền nhầm IP `192.168.122.x`, node ở máy khác sẽ không kết nối được.

Ghi lại:

```text
NODE1_IP=<Tailscale IP của NODE-1>
NODE2_IP=<Tailscale IP của NODE-2>
NODE3_IP=<Tailscale IP của NODE-3>
NODE4_IP=<Tailscale IP của NODE-4>
```

Kiểm tra kết nối:

```bash
tailscale ping <NODE4_IP>
ping <NODE4_IP>
```

Vì sao cần chạy:

- `tailscale ping` kiểm tra đường đi qua Tailscale. Nó giúp biết Tailscale có nối được hai máy không.
- `ping` kiểm tra kết nối IP bình thường. Nó giúp biết firewall (quy tắc chặn hoặc cho phép kết nối) có đang chặn gói mạng không.

Nếu `tailscale ping` thành công nhưng `ping` thất bại, hãy kiểm tra ACL (quy tắc quyền truy cập trong Tailscale) hoặc firewall trong VM.

## 3. Đưa source code vào từng VM

Đây là bước bắt buộc. Các script trong `infra/vm-setup` đang giả định repo (thư mục chứa mã nguồn dự án) nằm tại `/opt/uitstore`.

Nếu clone từ GitHub (tải mã nguồn từ kho lưu trữ GitHub) trên từng VM:

```bash
sudo mkdir -p /opt/uitstore
sudo chown -R "$USER:$USER" /opt/uitstore
git clone <GIT_REPO_URL> /opt/uitstore
```

Vì sao cần chạy:

- `mkdir -p /opt/uitstore` tạo thư mục đúng nơi script mong đợi.
- `chown` đổi quyền sở hữu thư mục cho user hiện tại để bạn có thể ghi file vào đó.
- `git clone` tải mã nguồn về VM. Nếu thiếu bước này, các lệnh `cd /opt/uitstore/...` sẽ lỗi vì chưa có source code.

Nếu copy từ máy host (máy thật đang chứa repo local):

```bash
rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'venv' \
  --exclude '.venv' \
  --exclude 'node_modules' \
  ./ user@<NODE_IP>:/opt/uitstore/
```

Vì sao cần chạy:

- `rsync` copy file từ máy hiện tại sang VM và chỉ gửi phần thay đổi, nên nhanh hơn copy lại toàn bộ.
- `--delete` xóa file trên VM nếu file đó không còn ở máy nguồn, giúp source code trên VM giống máy nguồn.
- `--exclude '.env'` giữ lại file `.env` (file cấu hình riêng của từng VM). Nếu không loại trừ `.env`, lệnh sync có thể xóa cấu hình đã được script tạo trên VM.
- `--exclude 'venv'`, `--exclude '.venv'`, `--exclude 'node_modules'` tránh copy thư mục phụ thuộc cục bộ, vì chúng thường nặng và nên được tạo lại trên đúng VM.

Lặp lại cho cả 4 VM, thay `<NODE_IP>` bằng IP Tailscale của từng VM.

Những thứ không có sẵn sau khi clone/pull code từ GitHub:

- File `.env` (file chứa cấu hình như database URL, Vault URL, secret): được script `02-*` tạo ra, sau đó có một số giá trị phải điền tiếp.
- Python virtualenv `venv` (môi trường Python riêng của service): được tạo trên VM khi chạy script setup.
- Systemd service trong `/etc/systemd/system` (dịch vụ Linux để start/restart app): được tạo bởi script setup.
- Vault data (dữ liệu của hệ thống quản lý secret), `/root/vault-init.txt`, `/root/vault-approle.txt`: chỉ có sau khi chạy NODE-3 lần đầu.
- Database (nơi lưu dữ liệu), Kafka topics (kênh tin nhắn trong Kafka), Elasticsearch/Grafana/Prometheus data (dữ liệu log và giám sát): chỉ có trên VM sau khi cài và start service.
- Secret thật (mật khẩu, API key, token dùng để truy cập hệ thống ngoài) như Stripe, GHN, Vault credentials: không nên có sẵn trong repo; cần thay placeholder (giá trị tạm để giữ chỗ) nếu demo yêu cầu.

## 4. Thứ tự triển khai

Thứ tự bắt buộc: NODE-4 -> NODE-3 -> NODE-2 -> NODE-1.

Lý do:

- NODE-4 chứa DB/Kafka (database và hệ thống nhắn tin giữa service), nên phải chạy trước để các node khác có nơi kết nối.
- NODE-3 chứa payment-service và Vault (service thanh toán và nơi giữ secret), nên cần NODE-4 trước để kết nối database và Kafka.
- NODE-2 chứa các service chính, nên cần NODE-3 và NODE-4 sẵn sàng trước.
- NODE-1 là ingress (điểm vào hệ thống từ trình duyệt hoặc client, tức chương trình gửi request đến server), nên chạy cuối để route (chuyển request đến đúng service) vào NODE-2.

Các script `01-system-setup.sh` hiện có cài Tailscale nếu thiếu, nhưng vẫn cần chạy `sudo tailscale up` để đăng nhập thiết bị vào tailnet. Nếu bạn đã làm bước Tailscale ở trên thì không cần đăng nhập lại.

### 4.1 NODE-4: Data + Observability

Data (dịch vụ lưu dữ liệu và luân chuyển dữ liệu) gồm PostgreSQL và Kafka. Observability (khả năng quan sát hệ thống khi đang chạy) gồm Elasticsearch, Kibana, Prometheus và Grafana để xem log (bản ghi sự kiện), metrics (số đo như số request hoặc CPU), và dashboard (màn hình tổng hợp số liệu).

Trên NODE-4:

```bash
ssh user@<NODE4_IP>
cd /opt/uitstore/infra/vm-setup/node-4

sudo bash 01-system-setup.sh

sudo VM1_IP=<NODE1_IP> VM2_IP=<NODE2_IP> VM3_IP=<NODE3_IP> \
  bash 02-install-data-obs.sh

sudo bash 03-start-all.sh
```

Vì sao cần chạy:

- `ssh` đăng nhập vào NODE-4 qua mạng.
- `cd` vào đúng thư mục chứa script của NODE-4.
- `01-system-setup.sh` cài các gói nền như Java, curl, ufw và Tailscale.
- `02-install-data-obs.sh` cài PostgreSQL, Kafka và các công cụ quan sát. Các biến `VM1_IP`, `VM2_IP`, `VM3_IP` là IP Tailscale của những node được phép kết nối.
- `03-start-all.sh` start các service đã cài và tạo Kafka topics.

Cần kiểm tra riêng Kafka:

```bash
grep '^advertised.listeners=' /opt/kafka/config/server.properties
```

`advertised.listeners` là địa chỉ Kafka tự thông báo cho client (service khác kết nối vào Kafka). Giá trị đúng phải là:

```text
advertised.listeners=PLAINTEXT://<NODE4_IP>:9092
```

Lý do phải kiểm tra: script hiện tại lấy IP của chính NODE-4 bằng `hostname -I | awk '{print $1}'`. Nếu IP đầu tiên là `192.168.122.x` thay vì Tailscale IP, Kafka sẽ đưa sai địa chỉ cho NODE-2/NODE-3, khiến các service không kết nối được dù port 9092 (cửa mạng mà Kafka lắng nghe) đang mở.

Nếu sai, sửa `advertised.listeners` thành `<NODE4_IP>` rồi restart:

```bash
sudo systemctl restart kafka
```

Vì sao cần restart: Kafka chỉ đọc file cấu hình khi khởi động. Nếu sửa file mà không restart, Kafka vẫn dùng địa chỉ cũ.

### 4.2 NODE-3: Payment + Vault

Payment-service là service xử lý thanh toán. Vault là hệ thống giữ secret và khóa mã hóa, giúp secret không nằm trực tiếp trong source code.

Trên NODE-3:

```bash
ssh user@<NODE3_IP>
cd /opt/uitstore/infra/vm-setup/node-3

sudo bash 01-system-setup.sh

sudo VM2_IP=<NODE2_IP> VM4_IP=<NODE4_IP> bash 02-setup-payment.sh

sudo VM4_IP=<NODE4_IP> bash 03-start-all.sh
```

Vì sao cần chạy:

- `01-system-setup.sh` cài Python, Tailscale và công cụ hệ thống cần cho payment-service.
- `02-setup-payment.sh` tạo `.env`, cài dependency (thư viện mà code cần để chạy), tạo systemd service và cấu hình firewall.
- `VM2_IP=<NODE2_IP>` cho phép NODE-2 gọi vào payment-service.
- `VM4_IP=<NODE4_IP>` trỏ payment-service đến DB/Kafka trên NODE-4.
- `03-start-all.sh` init Vault (khởi tạo Vault lần đầu), unseal Vault (mở khóa Vault sau khi khởi động), tạo key/secret cần dùng và start payment-service.

Sau khi chạy xong, lấy credentials cho NODE-2:

```bash
sudo cat /root/vault-approle.txt
```

Credentials là thông tin đăng nhập để service xin token (chuỗi xác nhận quyền truy cập tạm thời) từ Vault. File này chỉ xuất hiện sau khi NODE-3 init Vault lần đầu, nên nó không có sẵn trong GitHub.

Kiểm tra `VAULT_ADDR` trong file trên. `VAULT_ADDR` là địa chỉ để service gọi đến Vault. Giá trị đúng nên là:

```text
VAULT_ADDR=http://<NODE3_IP>:8200
```

Nếu file in ra IP `192.168.122.x`, nghĩa là script đã lấy sai self IP (IP của chính node) bằng `hostname -I`. Khi đó, trên NODE-2 phải dùng `<NODE3_IP>` Tailscale cho `VAULT_ADDR`.

### 4.3 NODE-2: Service Mesh

Service Mesh ở đây là node chạy nhiều service nội bộ như catalog, cart, order, inventory, shipping và notification. Trong tài liệu này, cụm từ này chỉ cách gom các service chính trên NODE-2, không phải đang cài một service mesh riêng như Istio.

Trên NODE-2:

```bash
ssh user@<NODE2_IP>
cd /opt/uitstore/infra/vm-setup/node-2

sudo bash 01-system-setup.sh

sudo VM3_IP=<NODE3_IP> VM4_IP=<NODE4_IP> NODE1_IP=<NODE1_IP> \
  bash 02-setup-services.sh

sudo VM3_IP=<NODE3_IP> VM4_IP=<NODE4_IP> bash 03-start-all.sh
```

Vì sao cần chạy:

- `01-system-setup.sh` cài Python và công cụ hệ thống cho các service.
- `02-setup-services.sh` tạo `.env`, cài dependency và tạo systemd service cho từng service.
- `VM3_IP=<NODE3_IP>` cho order-service biết payment-service nằm ở đâu.
- `VM4_IP=<NODE4_IP>` cho các service biết DB/Kafka/Logstash nằm ở đâu. Logstash là dịch vụ nhận log rồi gửi vào Elasticsearch để tra cứu.
- `NODE1_IP=<NODE1_IP>` cho firewall biết chỉ NODE-1 được gọi vào các service cần mở ra ngoài của NODE-2.
- `03-start-all.sh` start toàn bộ service và kiểm tra health endpoint.

Health endpoint là URL kiểm tra sức khỏe service, thường trả về trạng thái đơn giản để biết app có chạy không.

Sau đó cập nhật Vault credentials cho `order-service` và `shipping-service`.

Lấy credentials từ NODE-3:

```bash
ssh user@<NODE3_IP> sudo cat /root/vault-approle.txt
```

Mở các file sau trên NODE-2:

```bash
sudo vi /opt/uitstore/services/order-service/.env
sudo vi /opt/uitstore/services/shipping-service/.env
```

Thêm/cập nhật các biến mà code thật đang đọc:

```env
VAULT_ENABLED=true
VAULT_ADDR=http://<NODE3_IP>:8200
VAULT_ROLE_ID=<ROLE_ID>
VAULT_SECRET_ID=<SECRET_ID>
```

Vì sao cần sửa `.env`: script NODE-2 đang tạo `.env` với `VAULT_ENABLED=false`, nghĩa là tắt Vault. Nếu muốn order-service và shipping-service dùng Vault thật trên NODE-3, phải bật lại và điền đúng credentials.

Với `order-service`, lấy `<ROLE_ID>` từ `ORDER_VAULT_ROLE_ID` và `<SECRET_ID>` từ `ORDER_VAULT_SECRET_ID`.

Với `shipping-service`, lấy `<ROLE_ID>` từ `SHIPPING_VAULT_ROLE_ID` và `<SECRET_ID>` từ `SHIPPING_VAULT_SECRET_ID`.

Restart service sau khi sửa `.env`:

```bash
sudo systemctl restart order-service shipping-service
```

Vì sao cần restart: process service (chương trình đang chạy trong hệ điều hành) chỉ đọc `.env` khi khởi động. Nếu không restart, service vẫn dùng cấu hình cũ.

Lưu ý: script `02-setup-services.sh` tạo `.env` mới cho các service. Nếu chạy lại script này, những giá trị bạn sửa thủ công trong `.env` có thể bị ghi đè và cần điền lại.

### 4.4 NODE-1: Ingress

Ingress là điểm vào của hệ thống: browser (trình duyệt) hoặc client (chương trình gửi request) gọi NODE-1, rồi NODE-1 chuyển request vào NODE-2.

Trên NODE-1:

```bash
ssh user@<NODE1_IP>
cd /opt/uitstore/infra/vm-setup/node-1

sudo bash 01-system-setup.sh

sudo VM1_IP=<NODE1_IP> VM2_IP=<NODE2_IP> bash 02-setup-ingress.sh

sudo VM2_IP=<NODE2_IP> bash 03-start-all.sh
```

Vì sao cần chạy:

- `01-system-setup.sh` cài Java, Tailscale và công cụ nền.
- `02-setup-ingress.sh` cài Nginx, Envoy và Keycloak. Nginx là web server phục vụ frontend (giao diện người dùng), Envoy là gateway chuyển API request (lời gọi HTTP vào backend) đến service đúng, Keycloak là hệ thống xử lý đăng nhập.
- `VM1_IP=<NODE1_IP>` giúp Keycloak tạo redirect URI đúng IP. Redirect URI là địa chỉ được phép quay lại sau khi đăng nhập.
- `VM2_IP=<NODE2_IP>` giúp Envoy biết phải chuyển API request (lời gọi từ frontend hoặc client vào backend) đến NODE-2.
- `03-start-all.sh` start Keycloak, Envoy, Nginx và test routing.

Kiểm tra:

```bash
bash test-auth.sh
curl -I http://<NODE1_IP>/
curl -I http://<NODE1_IP>/api/v1/catalog/health
```

Vì sao cần kiểm tra:

- `test-auth.sh` kiểm tra luồng đăng nhập Keycloak.
- `curl -I http://<NODE1_IP>/` kiểm tra frontend có trả response (phản hồi HTTP từ server) không.
- `curl -I http://<NODE1_IP>/api/v1/catalog/health` kiểm tra đường đi NODE-1 -> NODE-2 có hoạt động không.

## 5. Kiểm tra sau triển khai

Từ máy host hoặc từ các VM có Tailscale:

```bash
curl http://<NODE1_IP>/
curl http://<NODE2_IP>:8001/health
curl http://<NODE2_IP>:8003/health
curl http://<NODE3_IP>:8004/health
```

Vì sao cần chạy: các lệnh này kiểm tra trực tiếp từng tầng. Nếu NODE-1 lỗi nhưng NODE-2 vẫn trả health, lỗi nằm ở ingress hoặc routing. Nếu NODE-2 cũng lỗi, cần kiểm tra service trên NODE-2 trước.

Các UI (giao diện web để xem hoặc quản trị service):

```text
Frontend:    http://<NODE1_IP>/
Keycloak:    http://<NODE1_IP>:8080
Envoy Admin: http://<NODE1_IP>:9901
Vault UI:    http://<NODE3_IP>:8200
Grafana:     http://<NODE4_IP>:3000
Kibana:      http://<NODE4_IP>:5601
Prometheus:  http://<NODE4_IP>:9090
```

## 6. Lỗi thường gặp

### NODE-2 không kết nối được PostgreSQL trên NODE-4

PostgreSQL là database chính. Nếu NODE-2 không vào được PostgreSQL, các service cần database sẽ lỗi.

Kiểm tra firewall và `pg_hba.conf`. `pg_hba.conf` là file PostgreSQL dùng để quyết định IP nào được phép đăng nhập database.

```bash
sudo grep -n '<NODE2_IP>' /etc/postgresql/15/main/pg_hba.conf
sudo ufw status numbered
```

Vì sao cần chạy:

- `grep` kiểm tra NODE-2 đã được thêm vào danh sách IP được phép vào database chưa.
- `ufw status` kiểm tra firewall của Ubuntu có đang chặn port PostgreSQL không.

### NODE-2/NODE-3 không kết nối được Kafka

Kafka là hệ thống nhắn tin giữa service. Nếu Kafka quảng bá sai IP, service có thể nhìn thấy Kafka ban đầu nhưng vẫn lỗi khi gửi/nhận message.

Kiểm tra `advertised.listeners` trên NODE-4:

```bash
grep '^advertised.listeners=' /opt/kafka/config/server.properties
```

Nó phải trỏ đến `<NODE4_IP>:9092`, không phải `192.168.122.14:9092`.

### Vault credentials không đúng trên NODE-2

Vault credentials là thông tin để service đăng nhập Vault. Nếu sai, service không lấy được secret hoặc khóa mã hóa.

Kiểm tra lại `/root/vault-approle.txt` trên NODE-3 và `.env` trên NODE-2. Nếu `VAULT_ADDR` là IP NAT `192.168.122.x`, thay bằng Tailscale IP `<NODE3_IP>`.

### Vừa pull code mới từ GitHub xong và service không đổi

`git pull` chỉ cập nhật source code. Nó không tự cập nhật:

- `.env` đã sinh trên VM.
- Python dependencies trong `venv` (các thư viện Python mà service cần để chạy).
- Systemd unit files (file khai báo service cho Linux biết cách start/restart app).
- Database migration (bước cập nhật cấu trúc database).
- Vault policies/secrets (quy tắc quyền truy cập và dữ liệu bí mật trong Vault).

Nếu thay đổi liên quan đến các mục trên, cần chạy lại bước setup tương ứng hoặc cập nhật thủ công theo hướng dẫn của service đó.

### Chạy lại script setup làm mất cấu hình `.env`

Một số script `02-*` tạo lại file `.env`. Trước khi chạy lại, nên backup `.env` hiện tại. Backup là bản sao dự phòng để khôi phục nếu script ghi đè cấu hình.

```bash
sudo cp /opt/uitstore/services/order-service/.env /opt/uitstore/services/order-service/.env.bak
sudo cp /opt/uitstore/services/shipping-service/.env /opt/uitstore/services/shipping-service/.env.bak
```

Vì sao cần backup: `.env` có thể chứa IP Tailscale, Vault credentials và secret riêng của VM. Nếu mất file này, service có thể start được nhưng kết nối sai nơi hoặc không đăng nhập được Vault.
