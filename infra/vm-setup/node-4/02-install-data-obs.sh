#!/bin/bash
# =============================================================================
# NODE-4: DATA + EVENT BUS + OBSERVABILITY - Bước 2: Cài đặt
# PostgreSQL, Kafka, Elasticsearch, Kibana, Logstash, Prometheus, Grafana
#
# CẤU HÌNH: Chỉnh các IP bên dưới trước khi chạy
# Usage: sudo bash 02-install-data-obs.sh
# =============================================================================
set -euo pipefail

# ============================================================
VM2_IP="${VM2_IP:-192.168.122.12}" # Service Mesh
VM3_IP="${VM3_IP:-192.168.122.13}" # PCI DSS (payment)
VM1_IP="${VM1_IP:-192.168.122.11}" # Ingress (Keycloak metrics)
PROJECT_DIR="${PROJECT_DIR:-/opt/uitstore}"

UITSTORE_PASS="123456"
KAFKA_VERSION="3.7.1"
SCALA_VERSION="2.13"
PROMETHEUS_VERSION="2.53.0"
GRAFANA_VERSION="11.1.0"
# ============================================================

ARCH=$(dpkg --print-architecture)
echo "============================================="
echo "  NODE-4: Data + Event Bus + Observability"
echo "  Nhận kết nối từ VM2: ${VM2_IP}"
echo "  Nhận kết nối từ VM3: ${VM3_IP}"
echo "============================================="

# =============================================================================
# 1. POSTGRESQL 15
# =============================================================================
echo ""
echo ">>> [1/7] Cài PostgreSQL 15..."

sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor >/etc/apt/trusted.gpg.d/postgresql.gpg
apt update && apt install -y postgresql-15
systemctl enable postgresql && systemctl start postgresql
sudo -u postgres psql <<EOF
CREATE USER uitstore WITH PASSWORD '${UITSTORE_PASS}';
CREATE DATABASE catalog_db  OWNER uitstore;
CREATE DATABASE cart_db     OWNER uitstore;
CREATE DATABASE order_db    OWNER uitstore;
CREATE DATABASE payment_db  OWNER uitstore;
CREATE DATABASE inventory_db OWNER uitstore;
CREATE DATABASE shipping_db  OWNER uitstore;
CREATE DATABASE notification_db OWNER uitstore;
GRANT ALL PRIVILEGES ON DATABASE catalog_db     TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE cart_db        TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE order_db       TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE payment_db     TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE inventory_db   TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE shipping_db    TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO uitstore;
EOF

PG_HBA="/etc/postgresql/15/main/pg_hba.conf"
PG_CONF="/etc/postgresql/15/main/postgresql.conf"

# Lắng nghe tất cả interface
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"

# Cho phép VM-2 (services) và VM-3 (payment) kết nối
cat >>"$PG_HBA" <<PGEOF
# NODE-2: Service Mesh
host    all    uitstore    ${VM2_IP}/32    md5
# NODE-3: PCI DSS (payment-service)
host    all    uitstore    ${VM3_IP}/32    md5
PGEOF

systemctl restart postgresql
echo "  PostgreSQL 15 - OK (nhận từ VM2:${VM2_IP}, VM3:${VM3_IP})"

# =============================================================================
# 2. APACHE KAFKA + ZOOKEEPER
# =============================================================================
echo ""
echo ">>> [2/7] Cài Kafka ${KAFKA_VERSION}..."

NODE4_IP=$(hostname -I | awk '{print $1}')
cd /opt
if [ ! -d "/opt/kafka" ]; then
    wget -q "https://downloads.apache.org/kafka/${KAFKA_VERSION}/kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz"
    tar -xzf "kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz"
    mv "kafka_${SCALA_VERSION}-${KAFKA_VERSION}" kafka
    rm -f "kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz"
fi

# Advertise IP thực để VM-2 và VM-3 kết nối được
sed -i "s|#advertised.listeners=PLAINTEXT://your.host.name:9092|advertised.listeners=PLAINTEXT://${NODE4_IP}:9092|" \
    /opt/kafka/config/server.properties
sed -i "s|#listeners=PLAINTEXT://:9092|listeners=PLAINTEXT://0.0.0.0:9092|" \
    /opt/kafka/config/server.properties

cat >/etc/systemd/system/zookeeper.service <<SVC
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
SVC

cat >/etc/systemd/system/kafka.service <<SVC
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
SVC

echo "  Kafka - OK (advertised: ${NODE4_IP}:9092)"

# =============================================================================
# 3. ELASTICSEARCH
# =============================================================================
echo ""
echo ">>> [3/7] Cài Elasticsearch..."

wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elastic.gpg
echo "deb [signed-by=/usr/share/keyrings/elastic.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" |
    tee /etc/apt/sources.list.d/elastic-8.x.list
apt update && apt install -y elasticsearch

cat >/etc/elasticsearch/elasticsearch.yml <<ESCFG
cluster.name: uitstore-audit
node.name: node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 0.0.0.0
discovery.type: single-node
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
ESCFG

mkdir -p /etc/elasticsearch/jvm.options.d
cat >/etc/elasticsearch/jvm.options.d/heap.options <<HEAP
-Xms512m
-Xmx512m
HEAP

systemctl enable elasticsearch
echo "  Elasticsearch - OK"

# =============================================================================
# 4. KIBANA + LOGSTASH
# =============================================================================
echo ""
echo ">>> [4/7] Cài Kibana + Logstash..."

apt install -y kibana logstash

cat >/etc/kibana/kibana.yml <<'KIBCFG'
server.name: kibana
server.host: "0.0.0.0"
server.port: 5601
elasticsearch.hosts: ["http://localhost:9200"]
monitoring.kibana.collection.enabled: false
telemetry.enabled: false
logging.root.level: warn
KIBCFG

cat >/etc/logstash/logstash.yml <<'LSMAINCFG'
http.host: "0.0.0.0"
xpack.monitoring.enabled: false
pipeline.ecs_compatibility: disabled
log.level: warn
LSMAINCFG

cat >/etc/logstash/conf.d/uitstore-audit.conf <<'LSPIPELINE'
input {
  beats { port => 5044 }
  tcp   { port => 5000; codec => json_lines }
}

filter {
  if [service] {
    mutate { add_field => { "[@metadata][index]" => "nt219-%{[service]}-%{+YYYY.MM.dd}" } }
  } else {
    mutate { add_field => { "[@metadata][index]" => "nt219-misc-%{+YYYY.MM.dd}" } }
  }

  if [type] == "vault-audit" {
    json { source => "message"; target => "vault" }
    mutate { add_tag => ["vault-audit"] }
  }
}

output {
  elasticsearch {
    hosts => ["http://localhost:9200"]
    index => "%{[@metadata][index]}"
  }
}
LSPIPELINE

systemctl enable kibana logstash
echo "  Kibana + Logstash - OK (nhận log từ VM2, VM3 trên :5044)"

# =============================================================================
# 5. PROMETHEUS - Scrape VM-1, VM-2, VM-3
# =============================================================================
echo ""
echo ">>> [5/7] Cài Prometheus..."

cd /opt
if [ ! -d "/opt/prometheus" ]; then
    PROM_ARCH="linux-amd64"
    [ "$ARCH" = "arm64" ] && PROM_ARCH="linux-arm64"
    wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.${PROM_ARCH}.tar.gz"
    tar -xzf "prometheus-${PROMETHEUS_VERSION}.${PROM_ARCH}.tar.gz"
    mv "prometheus-${PROMETHEUS_VERSION}.${PROM_ARCH}" prometheus
    rm -f "prometheus-${PROMETHEUS_VERSION}.${PROM_ARCH}.tar.gz"
fi

cat >/opt/prometheus/prometheus.yml <<PROMCFG
global:
  scrape_interval: 15s

scrape_configs:
  # NODE-1: Ingress (Keycloak)
  - job_name: 'keycloak'
    static_configs:
      - targets: ['${VM1_IP}:8080']

  # NODE-2: Service Mesh
  - job_name: 'catalog-service'
    static_configs:
      - targets: ['${VM2_IP}:8001']
  - job_name: 'cart-service'
    static_configs:
      - targets: ['${VM2_IP}:8002']
  - job_name: 'order-service'
    static_configs:
      - targets: ['${VM2_IP}:8003']
  - job_name: 'inventory-service'
    static_configs:
      - targets: ['${VM2_IP}:8005']
  - job_name: 'shipping-service'
    static_configs:
      - targets: ['${VM2_IP}:8007']
  - job_name: 'notification-service'
    static_configs:
      - targets: ['${VM2_IP}:8008']

  # NODE-3: PCI DSS
  - job_name: 'payment-service'
    static_configs:
      - targets: ['${VM3_IP}:8004']
PROMCFG

cat >/etc/systemd/system/prometheus.service <<SVC
[Unit]
Description=Prometheus
After=network.target
[Service]
Type=simple
User=root
ExecStart=/opt/prometheus/prometheus \
    --config.file=/opt/prometheus/prometheus.yml \
    --storage.tsdb.path=/opt/prometheus/data
Restart=on-failure
[Install]
WantedBy=multi-user.target
SVC

systemctl enable prometheus
echo "  Prometheus - OK (scrape VM1, VM2, VM3)"

# =============================================================================
# 6. GRAFANA
# =============================================================================
echo ""
echo ">>> [6/7] Cài Grafana..."

apt install -y adduser libfontconfig1 musl
GRAF_PKG="grafana_${GRAFANA_VERSION}_amd64.deb"
[ "$ARCH" = "arm64" ] && GRAF_PKG="grafana_${GRAFANA_VERSION}_arm64.deb"
wget -q "https://dl.grafana.com/oss/release/${GRAF_PKG}"
dpkg -i "${GRAF_PKG}" || apt install -f -y
rm -f "${GRAF_PKG}"

mkdir -p /etc/grafana/provisioning/datasources /etc/grafana/provisioning/dashboards

cat >/etc/grafana/provisioning/datasources/prometheus.yaml <<'GRAFDS'
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: "15s"
GRAFDS

cat >/etc/grafana/provisioning/dashboards/provider.yaml <<'GRAFDB'
apiVersion: 1
providers:
  - name: NT219
    orgId: 1
    folder: NT219 Crypto
    type: file
    disableDeletion: true
    editable: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
GRAFDB

systemctl enable grafana-server
echo "  Grafana - OK"

# =============================================================================
# 7. FIREWALL
# =============================================================================
echo ""
echo ">>> [7/7] Cấu hình firewall..."

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp

# Observability - mở cho tất cả (demo access từ máy host)
ufw allow 3000/tcp # Grafana
ufw allow 5601/tcp # Kibana
ufw allow 9090/tcp # Prometheus
ufw allow 9200/tcp # Elasticsearch (admin)

# Infrastructure - chỉ mở cho VM-2 và VM-3
ufw allow from "${VM2_IP}" to any port 5432 # PostgreSQL
ufw allow from "${VM3_IP}" to any port 5432
ufw allow from "${VM2_IP}" to any port 9092 # Kafka
ufw allow from "${VM3_IP}" to any port 9092
ufw allow from "${VM2_IP}" to any port 5044 # Logstash
ufw allow from "${VM3_IP}" to any port 5044

ufw reload
echo "  Firewall - OK"

systemctl daemon-reload

echo ""
echo "============================================="
echo "  NODE-4 Setup HOÀN TẤT!"
echo "  Tiếp theo: sudo bash 03-start-all.sh"
echo "============================================="
