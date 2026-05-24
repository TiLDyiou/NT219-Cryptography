# Plan Trien Khai Server Tren May Ao (Khong Docker)

> Do an NT219 Cryptography - UIT Store E-Commerce Platform
> Moi thu chay native tren Ubuntu Server 22.04 LTS (VMware / UTM)

---

## Muc luc

1. [Tong quan kien truc](#1-tong-quan-kien-truc)
2. [Chuan bi may ao](#2-chuan-bi-may-ao)
3. [Cai dat he dieu hanh](#3-cai-dat-he-dieu-hanh)
4. [Cai dat Infrastructure](#4-cai-dat-infrastructure)
5. [Cai dat Backend Services](#5-cai-dat-backend-services)
6. [Cai dat Frontend (Nginx)](#6-cai-dat-frontend-nginx)
7. [Cau hinh mang va bao mat](#7-cau-hinh-mang-va-bao-mat)
8. [Khoi dong va kiem tra](#8-khoi-dong-va-kiem-tra)
9. [Huong dan demo bao cao](#9-huong-dan-demo-bao-cao)

---

## 1. Tong quan kien truc

```
                        +---------------------------+
                        |   May host (macOS)        |
                        |   Truy cap: localhost:80   |
                        +-------------+-------------+
                                      |
                              NAT / Bridge
                                      |
            +-------------------------+-------------------------+
            |           Ubuntu Server 22.04 (VM)                |
            |                                                   |
            |   +-------------------------------------------+   |
            |   |  Nginx (port 80/443)                      |   |
            |   |  - Frontend static (/)                    |   |
            |   |  - Reverse proxy (/api/v1 -> services)    |   |
            |   +-------------------------------------------+   |
            |                                                   |
            |   +-------------------------------------------+   |
            |   |  Envoy Gateway (port 9901 admin)          |   |
            |   |  - JWT validation, rate limiting          |   |
            |   |  - mTLS enforcement                       |   |
            |   +-------------------------------------------+   |
            |                                                   |
            |   +-----------+ +-----------+ +-----------+       |
            |   | Catalog   | | Cart      | | Order     |       |
            |   | :8001     | | :8002     | | :8003     |       |
            |   +-----------+ +-----------+ +-----------+       |
            |   +-----------+ +-----------+ +-----------+       |
            |   | Payment   | | Inventory | | Shipping  |       |
            |   | :8004     | | :8005     | | :8006     |       |
            |   +-----------+ +-----------+ +-----------+       |
            |   +-----------+                                   |
            |   | Notif     |                                   |
            |   | :8007     |                                   |
            |   +-----------+                                   |
            |                                                   |
            |   +-------------------------------------------+   |
            |   |  Infrastructure                           |   |
            |   |  - PostgreSQL       :5432                 |   |
            |   |  - Keycloak         :8080                 |   |
            |   |  - HashiCorp Vault  :8200                 |   |
            |   |  - Kafka + Zookeeper :9092                |   |
            |   |  - Elasticsearch    :9200                 |   |
            |   |  - Kibana           :5601                 |   |
            |   |  - Prometheus       :9090                 |   |
            |   |  - Grafana          :3000                 |   |
            |   +-------------------------------------------+   |
            +---------------------------------------------------+
```

### Phan cong port

| Thanh phan           | Port  | Ghi chu                         |
| -------------------- | ----- | ------------------------------- |
| Nginx                | 80    | Frontend + reverse proxy        |
| Catalog Service      | 8001  | FastAPI                         |
| Cart Service         | 8002  | FastAPI                         |
| Order Service        | 8003  | FastAPI (Saga orchestrator)     |
| Payment Service      | 8004  | FastAPI                         |
| Inventory Service    | 8005  | FastAPI                         |
| Shipping Service     | 8006  | FastAPI                         |
| Notification Service | 8007  | FastAPI                         |
| Keycloak             | 8080  | Identity Provider               |
| HashiCorp Vault      | 8200  | KMS / Secrets                   |
| Kafka                | 9092  | Event streaming                 |
| Zookeeper            | 2181  | Kafka coordinator               |
| PostgreSQL           | 5432  | Database-per-service            |
| Elasticsearch        | 9200  | Audit logs                      |
| Kibana               | 5601  | Log dashboard                   |
| Prometheus           | 9090  | Metrics                         |
| Grafana              | 3000  | Metrics dashboard               |
| Envoy Admin          | 9901  | Gateway admin console           |

---

## 2. Chuan bi may ao

### 2.1. Yeu cau tai nguyen toi thieu

| Tai nguyen | Toi thieu  | Khuyen nghi |
| ---------- | ---------- | ----------- |
| RAM        | 8 GB       | 12-16 GB    |
| CPU        | 4 cores    | 6 cores     |
| Disk       | 40 GB      | 60 GB       |
| Network    | NAT + Host-only |           |

### 2.2. Tao may ao

**VMware Fusion (Intel Mac):**

```
1. File > New > Install from disc or image
2. Chon file ISO Ubuntu Server 22.04 LTS
3. Cau hinh:
   - RAM: 12288 MB (12 GB)
   - CPU: 4 cores
   - Disk: 60 GB (thin provisioning)
   - Network Adapter 1: NAT (truy cap internet)
   - Network Adapter 2: Host-only (truy cap tu may host)
```

**UTM (Apple Silicon M1/M2/M3/M4):**

```
1. Create a New Virtual Machine > Virtualize > Linux
2. Chon file ISO Ubuntu Server 22.04 LTS (ARM64 / aarch64)
   - Tai tu: https://cdimage.ubuntu.com/releases/22.04/release/
   - File: ubuntu-22.04.x-live-server-arm64.iso
3. Cau hinh:
   - RAM: 12288 MB
   - CPU: 4 cores
   - Disk: 60 GB
   - Network: Shared Network (tuong duong NAT)
   - Them 1 adapter: Host-only
```

> [!IMPORTANT]
> Neu may host la Apple Silicon (M-series), **bat buoc** phai tai ban **ARM64** cua Ubuntu Server.
> Ban amd64 se khong chay duoc tren UTM virtualize mode.

### 2.3. Cau hinh mang

Sau khi cai xong Ubuntu, kiem tra IP:

```bash
ip addr show
# Tim IP cua adapter host-only (vd: 192.168.64.x tren UTM)
```

Ghi nho IP nay de truy cap tu may host (macOS).

---

## 3. Cai dat he dieu hanh

### 3.1. Cap nhat he thong

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2. Cai cong cu co ban

```bash
sudo apt install -y \
    build-essential \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    net-tools \
    htop \
    tmux \
    jq
```

### 3.3. Cai Python 3.11+

```bash
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Dat Python 3.11 lam mac dinh
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

### 3.4. Cai Java 17 (cho Keycloak, Kafka, Elasticsearch)

```bash
sudo apt install -y openjdk-17-jdk
java -version
```

---

## 4. Cai dat Infrastructure

### 4.1. PostgreSQL 15

```bash
# Them repo chinh thuc
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15

# Khoi dong
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

**Tao database cho tung service (database-per-service pattern):**

```bash
sudo -u postgres psql <<EOF
-- Tao user chung (hoac tao rieng cho tung service de dam bao least privilege)
CREATE USER uitstore WITH PASSWORD 'UIT_NT219_SecurePass!';

-- Tao database rieng cho tung microservice
CREATE DATABASE catalog_db OWNER uitstore;
CREATE DATABASE cart_db OWNER uitstore;
CREATE DATABASE order_db OWNER uitstore;
CREATE DATABASE payment_db OWNER uitstore;
CREATE DATABASE inventory_db OWNER uitstore;
CREATE DATABASE shipping_db OWNER uitstore;
CREATE DATABASE notification_db OWNER uitstore;
CREATE DATABASE keycloak_db OWNER uitstore;

-- Cap quyen
GRANT ALL PRIVILEGES ON DATABASE catalog_db TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE cart_db TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE order_db TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE shipping_db TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO uitstore;
EOF
```

**Cho phep ket noi tu cac service (chinh pg_hba.conf):**

```bash
# Sua file pg_hba.conf de cho phep ket noi local bang password
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Them dong: local all uitstore md5

sudo systemctl restart postgresql
```

> [!TIP]
> Sau nay khi chuyen sang PostgreSQL thuc su, can thay doi `DATABASE_URL` trong config.py cua moi service
> tu `sqlite+aiosqlite:///./catalog.db` sang `postgresql+asyncpg://uitstore:UIT_NT219_SecurePass!@localhost:5432/catalog_db`
> va them thu vien `asyncpg` vao requirements.txt.

---

### 4.2. Keycloak 24 (Identity Provider)

```bash
# Tai Keycloak
cd /opt
sudo wget https://github.com/keycloak/keycloak/releases/download/24.0.5/keycloak-24.0.5.tar.gz
sudo tar -xzf keycloak-24.0.5.tar.gz
sudo mv keycloak-24.0.5 keycloak

# Cau hinh Keycloak dung PostgreSQL
sudo nano /opt/keycloak/conf/keycloak.conf
```

Noi dung file `keycloak.conf`:

```properties
# Database
db=postgres
db-url=jdbc:postgresql://localhost:5432/keycloak_db
db-username=uitstore
db-password=UIT_NT219_SecurePass!

# HTTP
http-port=8080
http-enabled=true
hostname-strict=false

# Admin
http-relative-path=/
```

**Khoi tao va chay:**

```bash
# Build Keycloak
cd /opt/keycloak
sudo bin/kc.sh build

# Tao admin user lan dau
sudo KEYCLOAK_ADMIN=admin KEYCLOAK_ADMIN_PASSWORD=admin123 \
    bin/kc.sh start-dev
```

**Tao systemd service:**

```bash
sudo tee /etc/systemd/system/keycloak.service > /dev/null <<EOF
[Unit]
Description=Keycloak Identity Provider
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/keycloak
Environment=KEYCLOAK_ADMIN=admin
Environment=KEYCLOAK_ADMIN_PASSWORD=admin123
ExecStart=/opt/keycloak/bin/kc.sh start-dev
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable keycloak
sudo systemctl start keycloak
```

---

### 4.3. HashiCorp Vault

```bash
# Them repo chinh thuc
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update
sudo apt install -y vault
```

**Cau hinh Vault (dev mode cho demo):**

```bash
sudo mkdir -p /opt/vault/data

sudo tee /etc/vault.d/vault.hcl > /dev/null <<EOF
ui = true

storage "file" {
  path = "/opt/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

api_addr = "http://127.0.0.1:8200"
EOF
```

**Tao systemd service:**

```bash
sudo tee /etc/systemd/system/vault.service > /dev/null <<EOF
[Unit]
Description=HashiCorp Vault
After=network.target

[Service]
Type=simple
User=vault
Group=vault
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=5
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vault
sudo systemctl start vault
```

**Khoi tao Vault (chay 1 lan duy nhat):**

```bash
export VAULT_ADDR='http://127.0.0.1:8200'

# Init voi 1 unseal key (cho demo, production dung 5 key voi threshold 3)
vault operator init -key-shares=1 -key-threshold=1

# Luu lai Unseal Key va Root Token
# Unseal Key 1: xxxxxxxxxxxxxxxxxxxx
# Initial Root Token: hvs.xxxxxxxxxxxx

# Unseal
vault operator unseal <UNSEAL_KEY>

# Login
vault login <ROOT_TOKEN>

# Bat Transit engine (dung cho envelope encryption)
vault secrets enable transit

# Tao encryption key cho Payment
vault write -f transit/keys/payment-key

# Luu secrets cho cac service
vault secrets enable -path=secret kv-v2
vault kv put secret/catalog db_url="postgresql+asyncpg://uitstore:UIT_NT219_SecurePass!@localhost:5432/catalog_db"
vault kv put secret/payment stripe_key="sk_test_xxxx" db_url="postgresql+asyncpg://uitstore:UIT_NT219_SecurePass!@localhost:5432/payment_db"
```

> [!WARNING]
> Sau moi lan restart VM, can chay lai lenh `vault operator unseal` de Vault hoat dong.
> Ghi lai Unseal Key o noi an toan.

---

### 4.4. Apache Kafka + Zookeeper

```bash
# Tai Kafka
cd /opt
sudo wget https://downloads.apache.org/kafka/3.7.1/kafka_2.13-3.7.1.tgz
sudo tar -xzf kafka_2.13-3.7.1.tgz
sudo mv kafka_2.13-3.7.1 kafka
```

**Tao systemd service cho Zookeeper:**

```bash
sudo tee /etc/systemd/system/zookeeper.service > /dev/null <<EOF
[Unit]
Description=Apache Zookeeper
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/kafka/bin/zookeeper-server-start.sh /opt/kafka/config/zookeeper.properties
ExecStop=/opt/kafka/bin/zookeeper-server-stop.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

**Tao systemd service cho Kafka:**

```bash
sudo tee /etc/systemd/system/kafka.service > /dev/null <<EOF
[Unit]
Description=Apache Kafka
After=zookeeper.service
Requires=zookeeper.service

[Service]
Type=simple
User=root
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable zookeeper kafka
sudo systemctl start zookeeper
sudo systemctl start kafka
```

**Tao cac topic can thiet:**

```bash
# Tao topic cho saga pattern
/opt/kafka/bin/kafka-topics.sh --create --topic order-commands --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
/opt/kafka/bin/kafka-topics.sh --create --topic order-events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
/opt/kafka/bin/kafka-topics.sh --create --topic inventory-commands --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
/opt/kafka/bin/kafka-topics.sh --create --topic payment-commands --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
/opt/kafka/bin/kafka-topics.sh --create --topic notification-events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

---

### 4.5. ELK Stack (Elasticsearch + Logstash + Kibana)

**Elasticsearch:**

```bash
# Them repo Elastic
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elastic.gpg
echo "deb [signed-by=/usr/share/keyrings/elastic.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update

# Cai Elasticsearch
sudo apt install -y elasticsearch

# Cau hinh cho single-node (demo)
sudo tee -a /etc/elasticsearch/elasticsearch.yml > /dev/null <<EOF
cluster.name: uitstore-audit
node.name: node-1
network.host: 0.0.0.0
discovery.type: single-node
xpack.security.enabled: false
EOF

sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch
```

**Kibana:**

```bash
sudo apt install -y kibana

sudo tee -a /etc/kibana/kibana.yml > /dev/null <<EOF
server.port: 5601
server.host: "0.0.0.0"
elasticsearch.hosts: ["http://localhost:9200"]
EOF

sudo systemctl enable kibana
sudo systemctl start kibana
```

**Logstash:**

```bash
sudo apt install -y logstash

# Tao pipeline cho audit logs
sudo tee /etc/logstash/conf.d/uitstore-audit.conf > /dev/null <<EOF
input {
  tcp {
    port => 5044
    codec => json_lines
  }
}

filter {
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }
}

output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "uitstore-audit-%{+YYYY.MM.dd}"
  }
}
EOF

sudo systemctl enable logstash
sudo systemctl start logstash
```

---

### 4.6. Prometheus + Grafana

**Prometheus:**

```bash
cd /opt
sudo wget https://github.com/prometheus/prometheus/releases/download/v2.53.0/prometheus-2.53.0.linux-amd64.tar.gz
# Luu y: Neu dung ARM64 (UTM), tai ban linux-arm64
sudo tar -xzf prometheus-*.tar.gz
sudo mv prometheus-* prometheus
```

**Cau hinh Prometheus (scrape cac service):**

```bash
sudo tee /opt/prometheus/prometheus.yml > /dev/null <<EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'catalog-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8001']

  - job_name: 'cart-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8002']

  - job_name: 'order-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8003']

  - job_name: 'payment-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8004']

  - job_name: 'keycloak'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8080']

  - job_name: 'vault'
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
    static_configs:
      - targets: ['localhost:8200']
EOF
```

**Tao systemd service:**

```bash
sudo tee /etc/systemd/system/prometheus.service > /dev/null <<EOF
[Unit]
Description=Prometheus
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/prometheus/prometheus --config.file=/opt/prometheus/prometheus.yml --storage.tsdb.path=/opt/prometheus/data
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
```

**Grafana:**

```bash
sudo apt install -y adduser libfontconfig1 musl
wget https://dl.grafana.com/oss/release/grafana_11.1.0_amd64.deb
# ARM64: grafana_11.1.0_arm64.deb
sudo dpkg -i grafana_*.deb

sudo systemctl enable grafana-server
sudo systemctl start grafana-server
# Truy cap: http://<VM_IP>:3000  (admin/admin)
```

---

### 4.7. Envoy Proxy (API Gateway)

```bash
# Cai Envoy tu getenvoy
curl -sL 'https://func-e.io/install.sh' | sudo bash -s -- -b /usr/local/bin
sudo func-e use 1.30.4
sudo cp ~/.func-e/versions/1.30.4/bin/envoy /usr/local/bin/envoy
```

**Cau hinh Envoy (file co ban):**

```bash
sudo mkdir -p /etc/envoy

sudo tee /etc/envoy/envoy.yaml > /dev/null <<'EOF'
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 10000
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/api/v1/catalog" }
                          route: { cluster: catalog_service }
                        - match: { prefix: "/api/v1/cart" }
                          route: { cluster: cart_service }
                        - match: { prefix: "/api/v1/orders" }
                          route: { cluster: order_service }
                        - match: { prefix: "/api/v1/payment" }
                          route: { cluster: payment_service }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: catalog_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: catalog_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8001

    - name: cart_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: cart_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8002

    - name: order_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: order_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8003

    - name: payment_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: payment_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8004
EOF
```

**Tao systemd service:**

```bash
sudo tee /etc/systemd/system/envoy.service > /dev/null <<EOF
[Unit]
Description=Envoy Proxy
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/envoy -c /etc/envoy/envoy.yaml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable envoy
sudo systemctl start envoy
```

---

## 5. Cai dat Backend Services

### 5.1. Clone repo va cau truc

```bash
cd /opt
sudo git clone <REPO_URL> uitstore
# Hoac copy tu may host qua VM bang scp
# scp -r /Users/nergy/NT219-Cryptography user@<VM_IP>:/opt/uitstore
```

### 5.2. Tao virtual environment cho tung service

Lap lai cho moi service (catalog, cart, order, payment, inventory, shipping, notification):

```bash
# Vi du: Catalog Service
cd /opt/uitstore/services/catalog-service
python3.11 -m venv venv
source venv/bin/activate

# Cap nhat requirements.txt (them asyncpg thay cho aiosqlite)
pip install -r requirements.txt
pip install asyncpg  # driver PostgreSQL async

deactivate
```

### 5.3. Cau hinh environment cho tung service

Tao file `.env` cho tung service. Vi du cho catalog-service:

```bash
sudo tee /opt/uitstore/services/catalog-service/.env > /dev/null <<EOF
PROJECT_NAME=Catalog Service
API_V1_STR=/api/v1
DATABASE_URL=postgresql+asyncpg://uitstore:UIT_NT219_SecurePass!@localhost:5432/catalog_db
AUTH_SECRET_KEY=super_secret_jwt_key_from_vault
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=hvs.xxxxxxxxxxxx
REDIS_URL=redis://localhost:6379/1
EOF
```

Lam tuong tu cho cac service khac, thay doi ten database tuong ung:
- cart-service: `cart_db`, port 8002
- order-service: `order_db`, port 8003
- payment-service: `payment_db`, port 8004
- inventory-service: `inventory_db`, port 8005
- shipping-service: `shipping_db`, port 8006
- notification-service: `notification_db`, port 8007

### 5.4. Tao systemd service cho tung microservice

**Script mau (lap lai cho tung service):**

```bash
# Catalog Service
sudo tee /etc/systemd/system/catalog-service.service > /dev/null <<EOF
[Unit]
Description=UIT Store - Catalog Service
After=network.target postgresql.service vault.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/uitstore/services/catalog-service
Environment=PATH=/opt/uitstore/services/catalog-service/venv/bin
ExecStart=/opt/uitstore/services/catalog-service/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Cart Service
sudo tee /etc/systemd/system/cart-service.service > /dev/null <<EOF
[Unit]
Description=UIT Store - Cart Service
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/uitstore/services/cart-service
Environment=PATH=/opt/uitstore/services/cart-service/venv/bin
ExecStart=/opt/uitstore/services/cart-service/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8002
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Lam tuong tu cho cac service con lai (order :8003, payment :8004, inventory :8005, shipping :8006, notification :8007).

**Kich hoat tat ca:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable catalog-service cart-service order-service payment-service inventory-service shipping-service notification-service
sudo systemctl start catalog-service cart-service order-service payment-service inventory-service shipping-service notification-service
```

---

## 6. Cai dat Frontend (Nginx)

### 6.1. Cai Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 6.2. Copy frontend vao thu muc web

```bash
sudo mkdir -p /var/www/uitstore
sudo cp -r /opt/uitstore/frontend/* /var/www/uitstore/
sudo chown -R www-data:www-data /var/www/uitstore
```

### 6.3. Cau hinh Nginx

```bash
sudo tee /etc/nginx/sites-available/uitstore > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    # Frontend static files
    root /var/www/uitstore;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Reverse proxy den API Gateway (Envoy)
    location /api/ {
        proxy_pass http://127.0.0.1:10000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Keycloak (Identity Provider)
    location /auth/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Kibana dashboard (cho demo audit log)
    location /kibana/ {
        proxy_pass http://127.0.0.1:5601/;
        proxy_set_header Host $host;
    }

    # Grafana dashboard (cho demo metrics)
    location /grafana/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
    }

    # Vault UI (cho demo KMS)
    location /vault/ {
        proxy_pass http://127.0.0.1:8200/;
        proxy_set_header Host $host;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Kich hoat site
sudo ln -sf /etc/nginx/sites-available/uitstore /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test va reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Cau hinh mang va bao mat

### 7.1. Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Cho phep SSH
sudo ufw allow 22/tcp

# Cho phep HTTP (Nginx)
sudo ufw allow 80/tcp

# Cho phep cac port can thiet cho demo (truy cap tu may host)
sudo ufw allow 3000/tcp   # Grafana
sudo ufw allow 5601/tcp   # Kibana
sudo ufw allow 8080/tcp   # Keycloak
sudo ufw allow 8200/tcp   # Vault UI
sudo ufw allow 9090/tcp   # Prometheus
sudo ufw allow 9901/tcp   # Envoy Admin

sudo ufw enable
sudo ufw status
```

### 7.2. Tao TLS certificates tu ky (self-signed) cho mTLS demo

```bash
sudo mkdir -p /opt/uitstore/certs

# Tao CA (Certificate Authority)
openssl req -x509 -newkey rsa:4096 -days 365 -nodes \
    -keyout /opt/uitstore/certs/ca-key.pem \
    -out /opt/uitstore/certs/ca-cert.pem \
    -subj "/CN=UIT Store Internal CA/O=UIT/C=VN"

# Tao cert cho tung service (vi du catalog-service)
openssl req -newkey rsa:2048 -nodes \
    -keyout /opt/uitstore/certs/catalog-key.pem \
    -out /opt/uitstore/certs/catalog-csr.pem \
    -subj "/CN=catalog-service/O=UIT Store"

openssl x509 -req -in /opt/uitstore/certs/catalog-csr.pem \
    -CA /opt/uitstore/certs/ca-cert.pem \
    -CAkey /opt/uitstore/certs/ca-key.pem \
    -CAcreateserial -days 365 \
    -out /opt/uitstore/certs/catalog-cert.pem

# Lap lai tuong tu cho: cart, order, payment, inventory, shipping, notification
```

---

## 8. Khoi dong va kiem tra

### 8.1. Thu tu khoi dong (quan trong!)

```bash
# Buoc 1: Database
sudo systemctl start postgresql

# Buoc 2: Infrastructure phu tro
sudo systemctl start elasticsearch
sudo systemctl start kibana
sudo systemctl start zookeeper
sleep 5
sudo systemctl start kafka

# Buoc 3: Security Infrastructure
sudo systemctl start vault
# !!! QUAN TRONG: Unseal Vault sau moi lan restart
export VAULT_ADDR='http://127.0.0.1:8200'
vault operator unseal <UNSEAL_KEY>

sudo systemctl start keycloak

# Buoc 4: Monitoring
sudo systemctl start prometheus
sudo systemctl start grafana-server

# Buoc 5: API Gateway
sudo systemctl start envoy

# Buoc 6: Backend Services
sudo systemctl start catalog-service
sudo systemctl start cart-service
sudo systemctl start order-service
sudo systemctl start payment-service
sudo systemctl start inventory-service
sudo systemctl start shipping-service
sudo systemctl start notification-service

# Buoc 7: Frontend
sudo systemctl start nginx
```

### 8.2. Script khoi dong tat ca (tien loi)

```bash
sudo tee /opt/uitstore/start-all.sh > /dev/null <<'SCRIPT'
#!/bin/bash
echo "=== UIT Store - Khoi dong toan bo he thong ==="

echo "[1/7] PostgreSQL..."
sudo systemctl start postgresql
sleep 2

echo "[2/7] Elasticsearch + Kibana + Kafka..."
sudo systemctl start elasticsearch
sudo systemctl start kibana
sudo systemctl start logstash
sudo systemctl start zookeeper
sleep 5
sudo systemctl start kafka
sleep 3

echo "[3/7] Vault + Keycloak..."
sudo systemctl start vault
sleep 2
export VAULT_ADDR='http://127.0.0.1:8200'
echo ">>> Can unseal Vault thu cong: vault operator unseal <KEY>"
sudo systemctl start keycloak
sleep 5

echo "[4/7] Prometheus + Grafana..."
sudo systemctl start prometheus
sudo systemctl start grafana-server

echo "[5/7] Envoy Gateway..."
sudo systemctl start envoy
sleep 2

echo "[6/7] Backend Services..."
for svc in catalog cart order payment inventory shipping notification; do
    sudo systemctl start ${svc}-service
    echo "  - ${svc}-service started"
done
sleep 3

echo "[7/7] Nginx..."
sudo systemctl start nginx

echo ""
echo "=== He thong da khoi dong! ==="
echo "Frontend:     http://$(hostname -I | awk '{print $1}')"
echo "Keycloak:     http://$(hostname -I | awk '{print $1}'):8080"
echo "Vault:        http://$(hostname -I | awk '{print $1}'):8200"
echo "Grafana:      http://$(hostname -I | awk '{print $1}'):3000"
echo "Kibana:       http://$(hostname -I | awk '{print $1}'):5601"
echo "Prometheus:   http://$(hostname -I | awk '{print $1}'):9090"
echo "Envoy Admin:  http://$(hostname -I | awk '{print $1}'):9901"
SCRIPT

sudo chmod +x /opt/uitstore/start-all.sh
```

### 8.3. Kiem tra trang thai

```bash
# Kiem tra tat ca services
sudo systemctl status postgresql keycloak vault zookeeper kafka elasticsearch kibana prometheus grafana-server envoy nginx catalog-service cart-service --no-pager

# Kiem tra health endpoint cua cac service
curl -s http://localhost:8001/health | jq
curl -s http://localhost:8002/health | jq

# Kiem tra Nginx phuc vu frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost/
```

---

## 9. Huong dan demo bao cao

### 9.1. Cac man hinh demo chinh

| STT | Man hinh                      | URL tu may host                            | Muc dich demo              |
| --- | ----------------------------- | ------------------------------------------ | -------------------------- |
| 1   | Frontend UIT Store            | `http://<VM_IP>/`                          | Giao dien nguoi dung       |
| 2   | Swagger API Docs              | `http://<VM_IP>:8001/docs`                 | API Catalog Service        |
| 3   | Keycloak Admin                | `http://<VM_IP>:8080`                      | OAuth2 / OIDC / JWT        |
| 4   | Vault UI                      | `http://<VM_IP>:8200`                      | KMS / Secrets / Transit    |
| 5   | Grafana Dashboard             | `http://<VM_IP>:3000`                      | Metrics & Performance      |
| 6   | Kibana                        | `http://<VM_IP>:5601`                      | Audit logs                 |
| 7   | Envoy Admin                   | `http://<VM_IP>:9901`                      | Gateway stats / clusters   |

### 9.2. Kich ban demo tieu bieu

```
1. Mo Frontend -> Duyet san pham -> Them vao gio hang
   -> Show API call qua Envoy Gateway -> Catalog Service -> PostgreSQL

2. Dang nhap -> Show Keycloak login -> JWT token -> MFA
   -> Show Vault luu tru JWT signing key

3. Thanh toan -> Show 3DS OTP flow
   -> Show HMAC signing trong audit log (Kibana)
   -> Show Payment transaction trong Grafana metrics

4. Mo Vault UI -> Show Transit engine encrypt/decrypt
   -> Demo key rotation

5. Mo terminal -> Show mTLS certificates
   -> curl --cert --key giua cac service
```

### 9.3. Troubleshooting pho bien

| Van de                                       | Nguyen nhan                            | Giai phap                                                 |
| -------------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| Service khong start                          | Port bi chiem                          | `sudo lsof -i :<PORT>` va kill process                    |
| Vault sealed sau restart                     | Vault mat unseal state khi restart     | Chay `vault operator unseal <KEY>`                        |
| Kafka khong connect                          | Zookeeper chua san sang               | Doi 5-10 giay sau khi start Zookeeper roi start Kafka     |
| Frontend khong goi duoc API                  | CORS hoac Nginx proxy sai             | Kiem tra Nginx config va CORS settings trong FastAPI       |
| PostgreSQL tu choi ket noi                   | pg_hba.conf chua cho phep             | Them dong `local all uitstore md5` vao pg_hba.conf        |
| Elasticsearch khong start (loi RAM)          | Heap size qua lon                     | `sudo nano /etc/elasticsearch/jvm.options` giam Xms/Xmx   |

---

## Tom tat tai nguyen va cong cu

| Thanh phan               | Phien ban      | Nguon cai dat          |
| ------------------------ | -------------- | ---------------------- |
| Ubuntu Server            | 22.04 LTS      | ISO                    |
| Python                   | 3.11+          | PPA deadsnakes         |
| Java                     | 17 (OpenJDK)   | apt                    |
| PostgreSQL               | 15             | Official repo          |
| Nginx                    | Latest         | apt                    |
| Keycloak                 | 24.0.5         | GitHub release         |
| HashiCorp Vault          | Latest         | HashiCorp repo         |
| Apache Kafka             | 3.7.1          | Apache download        |
| Elasticsearch            | 8.x            | Elastic repo           |
| Kibana                   | 8.x            | Elastic repo           |
| Logstash                 | 8.x            | Elastic repo           |
| Prometheus               | 2.53.0         | GitHub release         |
| Grafana                  | 11.1.0         | Grafana download       |
| Envoy                    | 1.30.4         | func-e                 |
| FastAPI                  | 0.111.0        | pip (requirements.txt) |
| Uvicorn                  | 0.30.1         | pip (requirements.txt) |
