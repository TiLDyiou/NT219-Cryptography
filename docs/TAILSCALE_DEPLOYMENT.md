# Hướng dẫn kết nối đa máy chủ bằng Tailscale

Tài liệu này hướng dẫn dùng Tailscale (dịch vụ tạo mạng riêng giữa các máy qua Internet) để kết nối các VM (máy ảo chạy như một máy tính riêng) khi NODE-4 nằm trên máy khác.

Trong mô hình này, NODE-1 không cần Tailscale nếu NODE-1 và NODE-2 nằm chung mạng `192.168.122.x`. Lý do: NODE-1 chỉ làm ingress (điểm vào hệ thống từ trình duyệt hoặc client) và chỉ cần chuyển request đến NODE-2 qua mạng nội bộ cùng máy.

Giả định triển khai:

- NODE-1, NODE-2, NODE-3 chạy trên máy của bạn.
- NODE-4 chạy trên máy khác.
- NODE-1 và NODE-2 nhìn thấy nhau qua mạng libvirt/NAT (mạng ảo nội bộ của VM) `192.168.122.x`.
- NODE-2, NODE-3, NODE-4 tham gia Tailscale để đi qua Internet.
- Cả 4 VM dùng Ubuntu (hệ điều hành Linux phổ biến cho server) và có Internet.
- Source code (mã nguồn của dự án) phải nằm tại `/opt/uitstore` trên từng VM trước khi chạy các script `02-*` (file lệnh tự động cài và cấu hình hệ thống).

Các biến IP dùng trong tài liệu:

```text
NODE1_LAN_IP=<IP nội bộ của NODE-1, ví dụ 192.168.122.11>
NODE2_LAN_IP=<IP nội bộ của NODE-2, ví dụ 192.168.122.12>
NODE2_TS_IP=<Tailscale IP của NODE-2>
NODE3_TS_IP=<Tailscale IP của NODE-3>
NODE4_TS_IP=<Tailscale IP của NODE-4>
```

`LAN IP` là IP nội bộ trong mạng VM cùng máy. `Tailscale IP` là địa chỉ mạng do Tailscale cấp, lấy bằng `tailscale ip -4`.

## 1. Tailscale giải quyết vấn đề gì?

Khi cả 4 VM nằm trên cùng một host libvirt (máy thật đang chạy các VM bằng công cụ ảo hóa libvirt), các node (máy trong cụm triển khai) có thể nói chuyện với nhau qua dải `192.168.122.x`.

Khi NODE-4 được đưa sang máy khác, IP `192.168.122.14` (địa chỉ mạng nội bộ cũ của NODE-4) chỉ còn ý nghĩa trong mạng NAT (cơ chế router chia sẻ một IP Internet cho nhiều máy trong mạng nội bộ) của máy đó. Vì vậy NODE-2 trên máy bạn sẽ không ping (gửi gói kiểm tra kết nối mạng) hoặc kết nối được đến `192.168.122.14`.

Tailscale tạo một mạng riêng ảo giữa NODE-2, NODE-3 và NODE-4. Các service (ứng dụng chạy nền như order-service, payment-service, PostgreSQL) sẽ dùng Tailscale IP khi cần gọi qua máy khác.

NODE-1 không cần Tailscale trong mô hình này vì:

- NODE-1 chỉ cần gọi NODE-2.
- NODE-1 và NODE-2 nằm chung mạng `192.168.122.x`.
- NODE-4 không bắt buộc phải gọi ngược lại NODE-1 để hệ thống chính chạy được.

Đánh đổi: nếu NODE-1 không dùng Tailscale, Prometheus trên NODE-4 (dịch vụ thu thập số đo hệ thống) sẽ không scrape (đọc số đo định kỳ) được Keycloak trên NODE-1 qua Tailscale. Đây chỉ ảnh hưởng phần giám sát Keycloak, không phải luồng chính frontend -> NODE-1 -> NODE-2 -> NODE-3/NODE-4.

Lưu ý: Tailscale ưu tiên kết nối trực tiếp peer-to-peer (hai máy nói chuyện trực tiếp với nhau). Nếu NAT không cho phép kết nối trực tiếp, Tailscale có thể dùng relay DERP (máy trung chuyển của Tailscale để chuyển tiếp lưu lượng). Đường truyền vẫn được mã hóa đầu-cuối bằng WireGuard (giao thức VPN dùng để mã hóa dữ liệu giữa hai máy), nhưng độ trễ có thể cao hơn.

## 2. Chuẩn bị Tailscale trên NODE-2, NODE-3, NODE-4

Không cần chạy `sudo tailscale up` trên NODE-1 nếu NODE-1 chỉ gọi NODE-2 qua `NODE2_LAN_IP`.

Trên NODE-2, NODE-3, NODE-4, chạy:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Vì sao cần chạy:

- `curl ... | sh` tải và chạy bộ cài Tailscale. Nếu không cài Tailscale, VM không có Tailscale IP để node ở máy khác kết nối.
- `sudo tailscale up` đăng nhập VM vào tailnet (mạng riêng của tài khoản Tailscale). Nếu chưa chạy lệnh này, máy đã cài Tailscale nhưng chưa tham gia mạng chung.

`sudo tailscale up` sẽ in ra một URL (đường link mở trong trình duyệt) để đăng nhập. Mở URL đó và đưa NODE-2, NODE-3, NODE-4 vào cùng một tailnet.

Sau khi đăng nhập xong, lấy IP Tailscale trên NODE-2, NODE-3, NODE-4:

```bash
tailscale ip -4
```

Vì sao cần chạy: các script triển khai cần biết IP thật của từng node trong mạng Tailscale. Nếu truyền nhầm IP `192.168.122.x` cho đường đi đến NODE-4, node ở máy khác sẽ không kết nối được.

Ghi lại:

```text
NODE2_TS_IP=<Tailscale IP của NODE-2>
NODE3_TS_IP=<Tailscale IP của NODE-3>
NODE4_TS_IP=<Tailscale IP của NODE-4>
```

Ghi lại IP nội bộ của NODE-1 và NODE-2:

```bash
hostname -I
```

Vì sao cần chạy: NODE-1 và NODE-2 vẫn nói chuyện bằng IP nội bộ `192.168.122.x`, nên NODE-1 cần biết `NODE2_LAN_IP`, còn NODE-2 firewall cần biết `NODE1_LAN_IP`.

Kiểm tra kết nối Tailscale từ NODE-2 hoặc NODE-3 đến NODE-4:

```bash
tailscale ping <NODE4_TS_IP>
ping <NODE4_TS_IP>
```

Kiểm tra kết nối nội bộ từ NODE-1 đến NODE-2:

```bash
ping <NODE2_LAN_IP>
```

Vì sao cần chạy:

- `tailscale ping` kiểm tra đường đi qua Tailscale. Nó giúp biết Tailscale có nối được hai máy không.
- `ping <NODE2_LAN_IP>` kiểm tra NODE-1 có gọi được NODE-2 qua mạng nội bộ không.

Nếu `tailscale ping` thành công nhưng `ping` thất bại, hãy kiểm tra ACL (quy tắc quyền truy cập trong Tailscale) hoặc firewall (quy tắc chặn hoặc cho phép kết nối) trong VM.

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
  ./ user@<IP_TRUY_CAP_DUOC_VM>:/opt/uitstore/
```

Vì sao cần chạy:

- `rsync` copy file từ máy hiện tại sang VM và chỉ gửi phần thay đổi, nên nhanh hơn copy lại toàn bộ.
- `--delete` xóa file trên VM nếu file đó không còn ở máy nguồn, giúp source code trên VM giống máy nguồn.
- `--exclude '.env'` giữ lại file `.env` (file cấu hình riêng của từng VM). Nếu không loại trừ `.env`, lệnh sync có thể xóa cấu hình đã được script tạo trên VM.
- `--exclude 'venv'`, `--exclude '.venv'`, `--exclude 'node_modules'` tránh copy thư mục phụ thuộc cục bộ, vì chúng thường nặng và nên được tạo lại trên đúng VM.

Với NODE-1, NODE-2, NODE-3 trên cùng máy, `<IP_TRUY_CAP_DUOC_VM>` thường là IP `192.168.122.x`. Với NODE-4 trên máy khác, dùng `NODE4_TS_IP`.

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

Các script `01-system-setup.sh` hiện có thể cài Tailscale nếu thiếu. Với NODE-1, cài Tailscale không gây hại, nhưng không cần chạy `sudo tailscale up` nếu NODE-1 không dùng Tailscale.

### 4.1 NODE-4: Data + Observability

Data (dịch vụ lưu dữ liệu và luân chuyển dữ liệu) gồm PostgreSQL và Kafka. Observability (khả năng quan sát hệ thống khi đang chạy) gồm Elasticsearch, Kibana, Prometheus và Grafana để xem log (bản ghi sự kiện), metrics (số đo như số request hoặc CPU), và dashboard (màn hình tổng hợp số liệu).

Trên NODE-4:

```bash
ssh user@<NODE4_TS_IP>
cd /opt/uitstore/infra/vm-setup/node-4

sudo bash 01-system-setup.sh

sudo VM1_IP=<NODE1_LAN_IP> VM2_IP=<NODE2_TS_IP> VM3_IP=<NODE3_TS_IP> \
  bash 02-install-data-obs.sh

sudo bash 03-start-all.sh
```

Vì sao cần chạy:

- `ssh` đăng nhập vào NODE-4 qua mạng.
- `cd` vào đúng thư mục chứa script của NODE-4.
- `01-system-setup.sh` cài các gói nền như Java, curl, ufw và Tailscale.
- `02-install-data-obs.sh` cài PostgreSQL, Kafka và các công cụ quan sát. `VM2_IP` và `VM3_IP` phải là Tailscale IP để NODE-2/NODE-3 truy cập được NODE-4 từ máy khác.
- `VM1_IP=<NODE1_LAN_IP>` chỉ dùng cho Prometheus scrape Keycloak trên NODE-1. Nếu NODE-1 không dùng Tailscale và NODE-4 không đi được đến `NODE1_LAN_IP`, target này sẽ down trong Prometheus nhưng không làm hỏng luồng chính.
- `03-start-all.sh` start các service đã cài và tạo Kafka topics.

Cần kiểm tra riêng Kafka:

```bash
grep '^advertised.listeners=' /opt/kafka/config/server.properties
```

`advertised.listeners` là địa chỉ Kafka tự thông báo cho client (service khác kết nối vào Kafka). Giá trị đúng phải là:

```text
advertised.listeners=PLAINTEXT://<NODE4_TS_IP>:9092
```

Lý do phải kiểm tra: script hiện tại lấy IP của chính NODE-4 bằng `hostname -I | awk '{print $1}'`. Nếu IP đầu tiên là `192.168.122.x` thay vì Tailscale IP, Kafka sẽ đưa sai địa chỉ cho NODE-2/NODE-3, khiến các service không kết nối được dù port 9092 (cửa mạng mà Kafka lắng nghe) đang mở.

Nếu sai, sửa `advertised.listeners` thành `<NODE4_TS_IP>` rồi restart:

```bash
sudo systemctl restart kafka
```

Vì sao cần restart: Kafka chỉ đọc file cấu hình khi khởi động. Nếu sửa file mà không restart, Kafka vẫn dùng địa chỉ cũ.

### 4.2 NODE-3: Payment + Vault

Payment-service là service xử lý thanh toán. Vault là hệ thống giữ secret và khóa mã hóa, giúp secret không nằm trực tiếp trong source code.

Trên NODE-3:

```bash
ssh user@<NODE3_TS_IP>
cd /opt/uitstore/infra/vm-setup/node-3

sudo bash 01-system-setup.sh

sudo VM2_IP=<NODE2_TS_IP> VM4_IP=<NODE4_TS_IP> bash 02-setup-payment.sh

sudo VM4_IP=<NODE4_TS_IP> bash 03-start-all.sh
```

Vì sao cần chạy:

- `01-system-setup.sh` cài Python, Tailscale và công cụ hệ thống cần cho payment-service.
- `02-setup-payment.sh` tạo `.env`, cài dependency (thư viện mà code cần để chạy), tạo systemd service và cấu hình firewall.
- `VM2_IP=<NODE2_TS_IP>` cho phép NODE-2 gọi vào payment-service qua Tailscale.
- `VM4_IP=<NODE4_TS_IP>` trỏ payment-service đến DB/Kafka trên NODE-4 qua Tailscale.
- `03-start-all.sh` init Vault (khởi tạo Vault lần đầu), unseal Vault (mở khóa Vault sau khi khởi động), tạo key/secret cần dùng và start payment-service.

Sau khi chạy xong, lấy credentials cho NODE-2:

```bash
sudo cat /root/vault-approle.txt
```

Credentials là thông tin đăng nhập để service xin token (chuỗi xác nhận quyền truy cập tạm thời) từ Vault. File này chỉ xuất hiện sau khi NODE-3 init Vault lần đầu, nên nó không có sẵn trong GitHub.

Kiểm tra `VAULT_ADDR` trong file trên. `VAULT_ADDR` là địa chỉ để service gọi đến Vault. Giá trị đúng nên là:

```text
VAULT_ADDR=http://<NODE3_TS_IP>:8200
```

Nếu file in ra IP `192.168.122.x`, nghĩa là script đã lấy sai self IP (IP của chính node) bằng `hostname -I`. Khi đó, trên NODE-2 phải dùng `<NODE3_TS_IP>` cho `VAULT_ADDR`.

### 4.3 NODE-2: Service Mesh

Service Mesh ở đây là node chạy nhiều service nội bộ như catalog, cart, order, inventory, shipping và notification. Trong tài liệu này, cụm từ này chỉ cách gom các service chính trên NODE-2, không phải đang cài một service mesh riêng như Istio.

Trên NODE-2:

```bash
ssh user@<NODE2_LAN_IP>
cd /opt/uitstore/infra/vm-setup/node-2

sudo bash 01-system-setup.sh

sudo VM3_IP=<NODE3_TS_IP> VM4_IP=<NODE4_TS_IP> NODE1_IP=<NODE1_LAN_IP> \
  bash 02-setup-services.sh

sudo VM3_IP=<NODE3_TS_IP> VM4_IP=<NODE4_TS_IP> bash 03-start-all.sh
```

Vì sao cần chạy:

- `01-system-setup.sh` cài Python và công cụ hệ thống cho các service.
- `02-setup-services.sh` tạo `.env`, cài dependency và tạo systemd service cho từng service.
- `VM3_IP=<NODE3_TS_IP>` cho order-service biết payment-service nằm ở đâu trên Tailscale.
- `VM4_IP=<NODE4_TS_IP>` cho các service biết DB/Kafka/Logstash nằm ở đâu trên Tailscale. Logstash là dịch vụ nhận log rồi gửi vào Elasticsearch để tra cứu.
- `NODE1_IP=<NODE1_LAN_IP>` cho firewall biết chỉ NODE-1 được gọi vào các service cần mở ra ngoài của NODE-2 qua mạng nội bộ.
- `03-start-all.sh` start toàn bộ service và kiểm tra health endpoint.

Health endpoint là URL kiểm tra sức khỏe service, thường trả về trạng thái đơn giản để biết app có chạy không.

Sau đó cập nhật Vault credentials cho `order-service` và `shipping-service`.

Lấy credentials từ NODE-3:

```bash
ssh user@<NODE3_TS_IP> sudo cat /root/vault-approle.txt
```

Mở các file sau trên NODE-2:

```bash
sudo vi /opt/uitstore/services/order-service/.env
sudo vi /opt/uitstore/services/shipping-service/.env
```

Thêm/cập nhật các biến mà code thật đang đọc:

```env
VAULT_ENABLED=true
VAULT_ADDR=http://<NODE3_TS_IP>:8200
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
ssh user@<NODE1_LAN_IP>
cd /opt/uitstore/infra/vm-setup/node-1

sudo bash 01-system-setup.sh

sudo VM1_IP=<NODE1_LAN_IP> VM2_IP=<NODE2_LAN_IP> bash 02-setup-ingress.sh

sudo VM2_IP=<NODE2_LAN_IP> bash 03-start-all.sh
```

Vì sao cần chạy:

- `01-system-setup.sh` cài Java, Tailscale và công cụ nền. Script có thể cài Tailscale, nhưng NODE-1 không cần chạy `sudo tailscale up` trong mô hình này.
- `02-setup-ingress.sh` cài Nginx, Envoy và Keycloak. Nginx là web server phục vụ frontend (giao diện người dùng), Envoy là gateway chuyển API request (lời gọi HTTP vào backend) đến service đúng, Keycloak là hệ thống xử lý đăng nhập.
- `VM1_IP=<NODE1_LAN_IP>` giúp Keycloak tạo redirect URI đúng IP. Redirect URI là địa chỉ được phép quay lại sau khi đăng nhập.
- `VM2_IP=<NODE2_LAN_IP>` giúp Envoy chuyển API request đến NODE-2 qua mạng nội bộ, không qua Tailscale.
- `03-start-all.sh` start Keycloak, Envoy, Nginx và test routing.

Kiểm tra:

```bash
bash test-auth.sh
curl -I http://<NODE1_LAN_IP>/
curl -I http://<NODE1_LAN_IP>/api/v1/catalog/health
```

Vì sao cần kiểm tra:

- `test-auth.sh` kiểm tra luồng đăng nhập Keycloak.
- `curl -I http://<NODE1_LAN_IP>/` kiểm tra frontend có trả response (phản hồi HTTP từ server) không.
- `curl -I http://<NODE1_LAN_IP>/api/v1/catalog/health` kiểm tra đường đi NODE-1 -> NODE-2 có hoạt động không.

## 5. Kiểm tra sau triển khai

Từ máy host hoặc từ các VM có đường mạng tương ứng:

```bash
curl http://<NODE1_LAN_IP>/
curl http://<NODE2_LAN_IP>:8001/health
curl http://<NODE2_LAN_IP>:8003/health
curl http://<NODE3_TS_IP>:8004/health
```

Vì sao cần chạy: các lệnh này kiểm tra trực tiếp từng tầng. Nếu NODE-1 lỗi nhưng NODE-2 vẫn trả health, lỗi nằm ở ingress hoặc routing. Nếu NODE-2 cũng lỗi, cần kiểm tra service trên NODE-2 trước.

Các UI (giao diện web để xem hoặc quản trị service):

```text
Frontend:    http://<NODE1_LAN_IP>/
Keycloak:    http://<NODE1_LAN_IP>:8080
Envoy Admin: http://<NODE1_LAN_IP>:9901
Vault UI:    http://<NODE3_TS_IP>:8200
Grafana:     http://<NODE4_TS_IP>:3000
Kibana:      http://<NODE4_TS_IP>:5601
Prometheus:  http://<NODE4_TS_IP>:9090
```

## 6. Lỗi thường gặp

### NODE-1 không route được đến NODE-2

Route là việc chuyển request từ NODE-1 sang service đúng trên NODE-2.

Kiểm tra `VM2_IP` đã dùng khi chạy `02-setup-ingress.sh`. Trong mô hình NODE-1 không dùng Tailscale, `VM2_IP` phải là `NODE2_LAN_IP`, không phải `NODE2_TS_IP`.

```bash
ping <NODE2_LAN_IP>
curl -I http://<NODE2_LAN_IP>:8001/health
```

Vì sao cần chạy: nếu NODE-1 không nhìn thấy `NODE2_LAN_IP`, Envoy trên NODE-1 cũng không thể route API sang NODE-2.

### NODE-2 không kết nối được PostgreSQL trên NODE-4

PostgreSQL là database chính. Nếu NODE-2 không vào được PostgreSQL, các service cần database sẽ lỗi.

Kiểm tra firewall và `pg_hba.conf`. `pg_hba.conf` là file PostgreSQL dùng để quyết định IP nào được phép đăng nhập database.

```bash
sudo grep -n '<NODE2_TS_IP>' /etc/postgresql/15/main/pg_hba.conf
sudo ufw status numbered
```

Vì sao cần chạy:

- `grep` kiểm tra NODE-2 Tailscale IP đã được thêm vào danh sách IP được phép vào database chưa.
- `ufw status` kiểm tra firewall của Ubuntu có đang chặn port PostgreSQL không.

### NODE-2/NODE-3 không kết nối được Kafka

Kafka là hệ thống nhắn tin giữa service. Nếu Kafka quảng bá sai IP, service có thể nhìn thấy Kafka ban đầu nhưng vẫn lỗi khi gửi/nhận message.

Kiểm tra `advertised.listeners` trên NODE-4:

```bash
grep '^advertised.listeners=' /opt/kafka/config/server.properties
```

Nó phải trỏ đến `<NODE4_TS_IP>:9092`, không phải `192.168.122.14:9092`.

### Vault credentials không đúng trên NODE-2

Vault credentials là thông tin để service đăng nhập Vault. Nếu sai, service không lấy được secret hoặc khóa mã hóa.

Kiểm tra lại `/root/vault-approle.txt` trên NODE-3 và `.env` trên NODE-2. Nếu `VAULT_ADDR` là IP NAT `192.168.122.x`, thay bằng Tailscale IP `<NODE3_TS_IP>`.

### Prometheus trên NODE-4 báo Keycloak target down

Target down nghĩa là Prometheus không đọc được số đo từ service đó.

Nếu NODE-1 không dùng Tailscale, NODE-4 không có đường mạng đến `NODE1_LAN_IP`, nên Keycloak target có thể down. Đây là hành vi chấp nhận được trong mô hình này, vì NODE-1 không cần Tailscale cho luồng chính.

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
