#!/bin/bash
# =============================================================================
# NODE-2: SERVICE MESH - Bước 2: Setup 6 microservices
# catalog, cart, order, inventory, shipping, notification
# order-service gọi sang NODE-3 (payment), còn lại dùng NODE-4 (DB/Kafka)
#
# CẤU HÌNH: Chỉnh IP trước khi chạy
# Usage: sudo bash 02-setup-services.sh
# =============================================================================
set -euo pipefail

# ============================================================
VM3_IP="${VM3_IP:-192.168.64.13}"   # payment-service (PCI DSS)
VM4_IP="${VM4_IP:-192.168.64.14}"   # DB + Kafka + Logstash

UITSTORE_PASS="UIT_NT219_SecurePass!"
PROJECT_DIR="/opt/uitstore"
# ============================================================

echo "============================================="
echo "  NODE-2: SERVICE MESH"
echo "  payment (cross-zone) tại VM3: ${VM3_IP}"
echo "  DB/Kafka/Logstash tại VM4:    ${VM4_IP}"
echo "============================================="

if [ ! -d "${PROJECT_DIR}/services" ]; then
    echo "[LỖI] Không tìm thấy source code tại ${PROJECT_DIR}"
    echo "Chạy lệnh sau từ máy host:"
    echo "  scp -r /Users/nergy/NT219-Cryptography/ user@<VM2_IP>:/opt/uitstore"
    exit 1
fi

# Định nghĩa services: name -> port:db
declare -A SERVICES
SERVICES=(
    ["catalog-service"]="8001:catalog_db"
    ["cart-service"]="8002:cart_db"
    ["order-service"]="8003:order_db"
    ["inventory-service"]="8005:inventory_db"
    ["shipping-service"]="8007:shipping_db"
    ["noti-service"]="8008:notification_db"
)

for SVC_NAME in "${!SERVICES[@]}"; do
    IFS=':' read -r PORT DB_NAME <<< "${SERVICES[$SVC_NAME]}"
    SVC_DIR="${PROJECT_DIR}/services/${SVC_NAME}"

    echo ""
    echo ">>> Setup ${SVC_NAME} (:${PORT})..."

    [ ! -d "${SVC_DIR}" ] && echo "  [SKIP] không tìm thấy ${SVC_DIR}" && continue
    [ ! -f "${SVC_DIR}/requirements.txt" ] && echo "  [SKIP] không có requirements.txt" && continue

    cd "${SVC_DIR}"
    python3.11 -m venv venv
    "${SVC_DIR}/venv/bin/pip" install --quiet --upgrade pip
    "${SVC_DIR}/venv/bin/pip" install --quiet -r requirements.txt
    "${SVC_DIR}/venv/bin/pip" install --quiet asyncpg

    # Config đặc thù theo từng service
    EXTRA_ENV=""
    if [ "${SVC_NAME}" = "order-service" ]; then
        # order gọi sang payment (NODE-3) và inventory (cùng NODE-2)
        EXTRA_ENV="PAYMENT_SERVICE_URL=http://${VM3_IP}:8004
INVENTORY_SERVICE_URL=http://localhost:8005
KAFKA_ENABLED=false"
    elif [ "${SVC_NAME}" = "noti-service" ]; then
        # noti-service cần Kafka (nhận events) và Redis (rate-limit + idempotency)
        EXTRA_ENV="KAFKA_ENABLED=true
REDIS_ENABLED=true
REDIS_URL=redis://${VM4_IP}:6379/8"
    else
        EXTRA_ENV="KAFKA_ENABLED=false"
    fi

    cat > "${SVC_DIR}/.env" <<ENVFILE
PROJECT_NAME=${SVC_NAME}
API_V1_STR=/api/v1

# DB trên NODE-4
DATABASE_URL=postgresql+asyncpg://uitstore:${UITSTORE_PASS}@${VM4_IP}:5432/${DB_NAME}
ENABLE_SQLITE_FALLBACK=false

# Kafka trên NODE-4
KAFKA_BOOTSTRAP_SERVERS=${VM4_IP}:9092

# Audit log → NODE-4 Logstash
LOGSTASH_HOST=${VM4_IP}
LOGSTASH_PORT=5044

# JWT secret (lấy từ Keycloak trên NODE-1)
AUTH_SECRET_KEY=super_secret_jwt_key_from_vault

# Vault không có trên NODE-2
VAULT_ENABLED=false
# Redis mặc định tắt (noti-service tự bật lại qua EXTRA_ENV)
REDIS_ENABLED=false

${EXTRA_ENV}
ENVFILE

    cat > "/etc/systemd/system/${SVC_NAME}.service" <<SVC
[Unit]
Description=UIT Store - ${SVC_NAME} (Service Mesh)
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=${SVC_DIR}
EnvironmentFile=${SVC_DIR}/.env
ExecStart=${SVC_DIR}/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SVC

    systemctl enable "${SVC_NAME}"
    echo "  ${SVC_NAME} - OK"
done

# =============================================================================
# FIREWALL - Nhận request từ NODE-1 (Envoy), cho Prometheus NODE-4 scrape
# =============================================================================
echo ""
echo ">>> Cấu hình firewall..."

NODE1_IP="${NODE1_IP:-192.168.64.11}"

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp

# Services chỉ nhận từ NODE-1 (Envoy Gateway)
for PORT in 8001 8002 8003 8005 8007 8008; do
    ufw allow from "${NODE1_IP}" to any port ${PORT}
done

# Prometheus (NODE-4) scrape metrics
for PORT in 8001 8002 8003 8005 8007 8008; do
    ufw allow from "${VM4_IP}" to any port ${PORT}
done

ufw reload
echo "  Firewall - OK (services chỉ mở cho NODE-1: ${NODE1_IP})"

systemctl daemon-reload

echo ""
echo "============================================="
echo "  NODE-2 Setup HOÀN TẤT!"
echo ""
echo "  Services:"
for SVC_NAME in "${!SERVICES[@]}"; do
    IFS=':' read -r PORT DB_NAME <<< "${SERVICES[$SVC_NAME]}"
    echo "    ${SVC_NAME} :${PORT} → ${VM4_IP}:5432/${DB_NAME}"
done
echo ""
echo "  order-service gọi cross-zone → ${VM3_IP}:8004 (payment)"
echo ""
echo "  Tiếp theo: sudo bash 03-start-all.sh"
echo "============================================="
