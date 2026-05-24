# UIT Store - VM Deployment Scripts

## Kiến trúc 4 node (2 máy × 2 VM)

Mỗi VM tương ứng 1 zone trong topology bảo mật. Giao tiếp giữa các node đi qua mạng thực (cross-VM).

```
MACHINE 1                                    MACHINE 2
┌────────────────────────────────┐           ┌────────────────────────────────────┐
│  NODE-1: INGRESS ZONE          │           │  NODE-3: PCI DSS ZONE              │
│  ──────────────────────────    │           │  ──────────────────────────────    │
│  Nginx          :80            │           │  payment-service    :8004          │
│  Envoy Proxy    :10000         │           │  HashiCorp Vault    :8200          │
│  Keycloak (IdP) :8080          │           │  RAM: 3 GB                         │
│  RAM: 4 GB                     │           └────────────────────────────────────┘
└────────────┬───────────────────┘
             │ mTLS + JWT                    ┌────────────────────────────────────┐
             ▼                               │  NODE-4: DATA + EVENT BUS + OBS    │
┌────────────────────────────────┐           │  ──────────────────────────────    │
│  NODE-2: SERVICE MESH          │──────────►│  PostgreSQL     :5432              │
│  ──────────────────────────    │──────────►│  Kafka          :9092              │
│  catalog-service  :8001        │──────────►│  Logstash       :5044              │
│  cart-service     :8002        │           │  Elasticsearch  :9200              │
│  order-service    :8003 ───────┼──────────►│  Kibana         :5601              │
│  inventory-svc    :8005        │           │  Prometheus     :9090 ─────────────┼──► scrape NODE-1,2,3
│  shipping-svc     :8006        │    ┌──────┤  Grafana        :3000              │
│  noti-service     :8007        │    │      │  RAM: 8 GB                         │
│  RAM: 4 GB                     │    │      └────────────────────────────────────┘
│          │                     │    │
│          │ mTLS + HMAC         │    │
│          │ (cross-zone)        │    │
│          ▼                     │    │
│      NODE-3:8004 ◄─────────────┘    │
└────────────────────────────────┘
     NODE-3 payment → NODE-3 Vault (AppRole, cùng node)
```

## Luồng giao tiếp giữa các node

| Từ | Đến | Giao thức | Mô tả |
|---|---|---|---|
| Browser | NODE-1 Nginx :80 | HTTPS | Người dùng truy cập frontend |
| NODE-1 Envoy | NODE-1 Keycloak :8080 | HTTP | JWT introspection |
| NODE-1 Envoy | NODE-2 services :8001-8003,8005-8007 | mTLS + JWT | Route API request |
| NODE-2 order-service | NODE-3 payment-service :8004 | mTLS + HMAC | Cross-zone payment call |
| NODE-3 payment-service | NODE-3 Vault :8200 | AppRole | Lấy encryption key (local) |
| NODE-2 services | NODE-4 PostgreSQL :5432 | TCP | Đọc/ghi database |
| NODE-3 payment-service | NODE-4 PostgreSQL :5432 | TCP | Đọc/ghi database |
| NODE-2, NODE-3 | NODE-4 Kafka :9092 | TCP | Publish/consume events |
| NODE-2, NODE-3 | NODE-4 Logstash :5044 | TCP | Gửi audit log |
| NODE-4 Prometheus | NODE-1,2,3 :metrics | HTTP | Scrape metrics ngược lại |

> NODE-1 **không** giao tiếp trực tiếp với NODE-3.
> Chỉ NODE-2 (order-service) mới gọi sang NODE-3 (payment-service) theo cross-zone.

## Thư mục scripts

```
infra/vm-setup/
├── README.md
├── node-1/                      ← INGRESS ZONE (Máy 1, VM thứ nhất)
│   ├── 01-system-setup.sh       Cài Java 17 (Keycloak)
│   ├── 02-setup-ingress.sh      Nginx + Envoy + Keycloak
│   └── 03-start-all.sh          Khởi động + test end-to-end
│
├── node-2/                      ← SERVICE MESH (Máy 2, VM thứ nhất)
│   ├── 01-system-setup.sh       Cài Python 3.11
│   ├── 02-setup-services.sh     6 microservices (catalog/cart/order/...)
│   └── 03-start-all.sh          Khởi động + health check
│
├── node-3/                      ← PCI DSS ZONE (Máy 2, VM thứ hai)
│   ├── 01-system-setup.sh       Cài Python 3.11
│   ├── 02-setup-payment.sh      payment-service + HashiCorp Vault
│   └── 03-start-all.sh          Khởi động + unseal Vault
│
└── node-4/                      ← DATA + EVENT BUS + OBS (Máy 1, VM thứ hai)
    ├── 01-system-setup.sh       Cài Java 17 (Kafka, Elasticsearch)
    ├── 02-install-data-obs.sh   PostgreSQL + Kafka + ELK + Prometheus + Grafana
    └── 03-start-all.sh          Khởi động + tạo Kafka topics
```

## Yêu cầu tài nguyên

| Node | Zone | Máy | RAM | CPU | Disk |
|---|---|---|---|---|---|
| NODE-1 | Ingress | Máy 1 | 4 GB | 2 cores | 20 GB |
| NODE-4 | Data + Obs | Máy 1 | 8 GB | 4 cores | 60 GB |
| NODE-2 | Service Mesh | Máy 2 | 4 GB | 2 cores | 20 GB |
| NODE-3 | PCI DSS | Máy 2 | 3 GB | 2 cores | 20 GB |

> Máy 1 cần tối thiểu **14 GB RAM** (NODE-1 + NODE-4).
> Máy 2 cần tối thiểu **9 GB RAM** (NODE-2 + NODE-3).

---

## Hướng dẫn triển khai

### Bước 0 — Chuẩn bị

**Tạo 4 VM** (2 VM trên mỗi máy tính), sau đó lấy IP từng VM:

```bash
ip addr show   # chạy trên từng VM, ghi lại IP host-only
```

**Đảm bảo các VM ping được nhau** (cùng mạng host-only):

```bash
ping <NODE4_IP>   # từ NODE-2 và NODE-3
ping <NODE3_IP>   # từ NODE-2
ping <NODE2_IP>   # từ NODE-1
```

**Copy source code vào tất cả 4 VM** (từ máy host macOS):

```bash
for VM_IP in <NODE1_IP> <NODE2_IP> <NODE3_IP> <NODE4_IP>; do
    scp -r /Users/nergy/NT219-Cryptography/ user@${VM_IP}:/opt/uitstore
done
```

---

### Bước 1 — NODE-4: Data + Event Bus + Observability

> Phải chạy **đầu tiên** vì NODE-2 và NODE-3 phụ thuộc vào DB và Kafka.

```bash
ssh user@<NODE4_IP>
cd /opt/uitstore/infra/vm-setup/node-4

sudo bash 01-system-setup.sh

# Điền IP của NODE-1, NODE-2, NODE-3 vào biến môi trường
sudo VM1_IP=<NODE1_IP> VM2_IP=<NODE2_IP> VM3_IP=<NODE3_IP> \
    bash 02-install-data-obs.sh

sudo bash 03-start-all.sh
```

---

### Bước 2 — NODE-3: PCI DSS Zone

> Chạy sau NODE-4 (cần PostgreSQL và Kafka), trước NODE-2.

```bash
ssh user@<NODE3_IP>
cd /opt/uitstore/infra/vm-setup/node-3

sudo bash 01-system-setup.sh

sudo VM2_IP=<NODE2_IP> VM4_IP=<NODE4_IP> bash 02-setup-payment.sh

sudo VM4_IP=<NODE4_IP> bash 03-start-all.sh
```

**Khởi tạo Vault lần đầu** (chỉ làm 1 lần, ghi lại key):

```bash
export VAULT_ADDR='http://127.0.0.1:8200'
vault operator init -key-shares=1 -key-threshold=1
# → Ghi lại: Unseal Key và Root Token

vault operator unseal <UNSEAL_KEY>
vault login <ROOT_TOKEN>
vault secrets enable transit
vault write -f transit/keys/payment-key
```

> Mỗi lần restart NODE-3, cần unseal lại:
> ```bash
> vault operator unseal <UNSEAL_KEY>
> ```

---

### Bước 3 — NODE-2: Service Mesh

> Chạy sau NODE-3 và NODE-4.

```bash
ssh user@<NODE2_IP>
cd /opt/uitstore/infra/vm-setup/node-2

sudo bash 01-system-setup.sh

sudo VM3_IP=<NODE3_IP> VM4_IP=<NODE4_IP> NODE1_IP=<NODE1_IP> \
    bash 02-setup-services.sh

sudo VM3_IP=<NODE3_IP> VM4_IP=<NODE4_IP> bash 03-start-all.sh
```

---

### Bước 4 — NODE-1: Ingress Zone

> Chạy **cuối cùng** sau khi NODE-2 đã hoạt động.

```bash
ssh user@<NODE1_IP>
cd /opt/uitstore/infra/vm-setup/node-1

sudo bash 01-system-setup.sh

sudo VM1_IP=<NODE1_IP> VM2_IP=<NODE2_IP> bash 02-setup-ingress.sh

sudo VM2_IP=<NODE2_IP> bash 03-start-all.sh
```

---

## Kiểm tra sau khi triển khai

### Truy cập dịch vụ

| Dịch vụ | URL |
|---|---|
| **Frontend** | `http://<NODE1_IP>/` |
| **Keycloak Admin** | `http://<NODE1_IP>:8080` (admin / admin123) |
| **Envoy Admin** | `http://<NODE1_IP>:9901` |
| **Vault UI** | `http://<NODE3_IP>:8200` |
| **Grafana** | `http://<NODE4_IP>:3000` (admin / admin) |
| **Kibana** | `http://<NODE4_IP>:5601` |
| **Prometheus** | `http://<NODE4_IP>:9090` |
| API Catalog | `http://<NODE2_IP>:8001/docs` |
| API Order | `http://<NODE2_IP>:8003/docs` |
| API Payment | `http://<NODE3_IP>:8004/docs` |

### Demo giao tiếp giữa các node (live)

```bash
# Bắt packet trên NODE-4 đến từ NODE-2 và NODE-3
sudo tcpdump -i any 'src <NODE2_IP> or src <NODE3_IP>' -n

# Xem connection từ NODE-2 đến NODE-4
ss -tn | grep <NODE4_IP>   # chạy trên NODE-2

# Xem Envoy routing thực tế
curl http://<NODE1_IP>:9901/clusters | grep -A3 "order_service"

# Trace 1 request mua hàng qua các node
curl -v http://<NODE1_IP>/api/v1/orders   # → NODE-1 → NODE-2 → NODE-3 → NODE-4
```

### Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
|---|---|---|
| NODE-2 không kết nối DB | PostgreSQL chưa nhận IP NODE-2 | Kiểm tra `pg_hba.conf` trên NODE-4 |
| Kafka không nhận từ NODE-2 | `advertised.listeners` sai IP | Sửa `server.properties` trên NODE-4 |
| Vault sealed sau restart | Vault mất trạng thái unseal | `vault operator unseal <KEY>` trên NODE-3 |
| Envoy không route được | NODE-2 chưa chạy | Kiểm tra services trên NODE-2 trước |
| payment-service lỗi | Vault chưa unseal | Unseal Vault trên NODE-3 trước |
