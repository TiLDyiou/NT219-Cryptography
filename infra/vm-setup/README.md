# UIT Store — Hướng dẫn triển khai VM

## Kiến trúc

```
MACHINE 1                                    MACHINE 2
┌────────────────────────────────┐           ┌────────────────────────────────────┐
│  NODE-1: INGRESS ZONE          │           │  NODE-3: PCI DSS ZONE              │
│  Nginx (CDN)    :80            │           │  payment-service    :8004          │
│  Envoy + WAF    :10000         │           │  HashiCorp Vault    :8200          │
│  Keycloak (IdP) :8080          │           │  RAM: 3 GB                         │
│  RAM: 4 GB                     │           └────────────────────────────────────┘
└────────────┬───────────────────┘
             │ JWT + WAF                     ┌────────────────────────────────────┐
             ▼                               │  NODE-4: DATA + OBS                │
┌────────────────────────────────┐           │  PostgreSQL     :5432              │
│  NODE-2: SERVICE MESH          │──────────►│  Kafka          :9092              │
│  catalog-service  :8001        │──────────►│  Logstash       :5044              │
│  cart-service     :8002        │           │  Elasticsearch  :9200              │
│  order-service    :8003 ───────┼──────────►│  Kibana         :5601              │
│  inventory-svc    :8005        │           │  Prometheus     :9090              │
│  shipping-svc     :8006        │           │  Grafana        :3000              │
│  noti-service     :8007        │           │  RAM: 8 GB                         │
│  RAM: 4 GB                     │           └────────────────────────────────────┘
└────────────────────────────────┘
  NODE-2 order → NODE-3 payment (mTLS + HMAC)
  NODE-3 payment → NODE-3 Vault (AppRole, local)
```

## Yêu cầu phần cứng

| Node | Zone | Máy | RAM | CPU | Disk |
|---|---|---|---|---|---|
| NODE-1 | Ingress | Máy 1 | 4 GB | 2 cores | 20 GB |
| NODE-4 | Data + Obs | Máy 1 | 8 GB | 4 cores | 60 GB |
| NODE-2 | Service Mesh | Máy 2 | 4 GB | 2 cores | 20 GB |
| NODE-3 | PCI DSS | Máy 2 | 3 GB | 2 cores | 20 GB |

> **Máy 1:** tối thiểu 14 GB RAM &nbsp;|&nbsp; **Máy 2:** tối thiểu 9 GB RAM

---

## Chuẩn bị

### 1. Tạo 4 VM và lấy IP

Tạo 2 VM trên mỗi máy (VirtualBox/VMware, Ubuntu 22.04). Lấy IP host-only của từng VM:

```bash
ip addr show   # chạy trên từng VM
```

Ghi lại 4 IP: `NODE1_IP`, `NODE2_IP`, `NODE3_IP`, `NODE4_IP`.

### 2. Kiểm tra kết nối mạng

```bash
# Từ NODE-2:
ping <NODE3_IP> && ping <NODE4_IP>

# Từ NODE-3:
ping <NODE4_IP>

# Từ NODE-1:
ping <NODE2_IP>
```

### 3. Copy source code lên các VM

Chạy từ máy host (macOS):

```bash
for VM_IP in <NODE1_IP> <NODE2_IP> <NODE3_IP> <NODE4_IP>; do
    scp -r /Users/nergy/NT219-Cryptography/ user@${VM_IP}:/opt/uitstore
done
```

---

## Triển khai (thứ tự bắt buộc: 4 → 3 → 2 → 1)

### Bước 1 — NODE-4: Data + Event Bus + Observability

> Chạy **đầu tiên** — NODE-2 và NODE-3 phụ thuộc vào DB và Kafka.

```bash
ssh user@<NODE4_IP>
cd /opt/uitstore/infra/vm-setup/node-4

sudo bash 01-system-setup.sh

sudo VM1_IP=<NODE1_IP> VM2_IP=<NODE2_IP> VM3_IP=<NODE3_IP> \
    bash 02-install-data-obs.sh

sudo bash 03-start-all.sh
```

Kiểm tra:
```bash
ss -tlnp | grep -E '5432|9092|9200|5601|9090|3000'
```

---

### Bước 2 — NODE-3: PCI DSS Zone

> Vault sẽ **tự động init + unseal + tạo AppRole** khi chạy `03-start-all.sh`.

```bash
ssh user@<NODE3_IP>
cd /opt/uitstore/infra/vm-setup/node-3

sudo bash 01-system-setup.sh

sudo VM2_IP=<NODE2_IP> VM4_IP=<NODE4_IP> bash 02-setup-payment.sh

sudo VM4_IP=<NODE4_IP> bash 03-start-all.sh
```

Sau khi chạy xong, lấy AppRole credentials để dùng cho NODE-2:

```bash
cat /root/vault-approle.txt
# → In ra VAULT_ADDR, ORDER_VAULT_ROLE_ID, ORDER_VAULT_SECRET_ID,
#            SHIPPING_VAULT_ROLE_ID, SHIPPING_VAULT_SECRET_ID
```

> **Lưu ý:** Mỗi lần reboot NODE-3, Vault tự unseal từ `/root/vault-init.txt`.
> Nếu mất file này, phải `vault operator unseal` thủ công.

---

### Bước 3 — NODE-2: Service Mesh

```bash
ssh user@<NODE2_IP>
cd /opt/uitstore/infra/vm-setup/node-2

sudo bash 01-system-setup.sh

sudo VM3_IP=<NODE3_IP> VM4_IP=<NODE4_IP> NODE1_IP=<NODE1_IP> \
    bash 02-setup-services.sh

sudo VM3_IP=<NODE3_IP> VM4_IP=<NODE4_IP> bash 03-start-all.sh
```

Sau đó điền AppRole credentials vào `.env` của order-service và shipping-service:

```bash
# Lấy credentials từ NODE-3
ssh user@<NODE3_IP> cat /root/vault-approle.txt

# Cập nhật trên NODE-2
vi /opt/uitstore/services/order-service/.env
# Thêm: VAULT_ADDR, VAULT_ROLE_ID, VAULT_SECRET_ID

vi /opt/uitstore/services/shipping-service/.env
# Thêm: VAULT_ADDR, VAULT_ROLE_ID, VAULT_SECRET_ID

# Restart để áp dụng
sudo systemctl restart order-service shipping-service
```

---

### Bước 4 — NODE-1: Ingress Zone

> Chạy **cuối cùng**. Script tự động import Keycloak realm sau khi start.

```bash
ssh user@<NODE1_IP>
cd /opt/uitstore/infra/vm-setup/node-1

sudo bash 01-system-setup.sh

sudo VM1_IP=<NODE1_IP> VM2_IP=<NODE2_IP> bash 02-setup-ingress.sh

sudo VM2_IP=<NODE2_IP> bash 03-start-all.sh
```

Kiểm tra JWT/Keycloak:
```bash
bash test-auth.sh
```

---

## Kiểm tra sau khi triển khai

| Dịch vụ | URL | Credentials |
|---|---|---|
| **Frontend** | `http://<NODE1_IP>/` | — |
| **Keycloak Admin** | `http://<NODE1_IP>:8080` | admin / admin123 |
| **Envoy Admin** | `http://<NODE1_IP>:9901` | — |
| **Vault UI** | `http://<NODE3_IP>:8200` | root token từ `/root/vault-init.txt` |
| **Grafana** | `http://<NODE4_IP>:3000` | admin / admin |
| **Kibana** | `http://<NODE4_IP>:5601` | — |
| **Prometheus** | `http://<NODE4_IP>:9090` | — |
| API Catalog | `http://<NODE2_IP>:8001/docs` | — |
| API Order | `http://<NODE2_IP>:8003/docs` | — |
| API Payment | `http://<NODE3_IP>:8004/docs` | — |

### Trace 1 request xuyên suốt các node

```bash
# Browser → NODE-1 (Nginx) → Envoy (WAF) → NODE-2 → NODE-3 → NODE-4
curl -v http://<NODE1_IP>/api/v1/orders

# Xem WAF log
journalctl -u envoy -f | grep "\[WAF\]"

# Xem Envoy routing
curl http://<NODE1_IP>:9901/clusters | grep -A3 "order_service"

# Bắt packet trên NODE-4
sudo tcpdump -i any 'src <NODE2_IP> or src <NODE3_IP>' -n
```

---

## Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
|---|---|---|
| NODE-2 không kết nối DB | IP NODE-2 chưa có trong `pg_hba.conf` | Kiểm tra `pg_hba.conf` trên NODE-4, restart postgresql |
| Kafka từ chối NODE-2 | `advertised.listeners` lấy sai IP | Kiểm tra IP trong `/opt/kafka/config/server.properties` |
| Vault sealed sau restart | `/root/vault-init.txt` bị xoá | Lấy unseal key từ backup, chạy `vault operator unseal <KEY>` |
| Envoy không route | NODE-2 chưa chạy | `systemctl status catalog-service` trên NODE-2 |
| payment-service lỗi 500 | Vault sealed hoặc token hết hạn | Unseal Vault, cập nhật `VAULT_TOKEN` trong `.env` |
| Keycloak realm không import | Keycloak chưa sẵn sàng khi script chạy | Chạy thủ công: `bash test-auth.sh` để kiểm tra, re-run `03-start-all.sh` |
| WAF block nhầm request | Pattern quá rộng | Xem log: `journalctl -u envoy | grep WAF`, điều chỉnh `waf.lua` trong `02-setup-ingress.sh` |
