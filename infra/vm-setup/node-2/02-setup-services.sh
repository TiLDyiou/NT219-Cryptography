#!/bin/bash
set -euo pipefail

VM3_IP="${VM3_IP:-192.168.122.13}"
VM4_IP="${VM4_IP:-192.168.122.14}"
NODE1_IP="${NODE1_IP:-192.168.122.11}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-${UITSTORE_PASS:-123456}}"
PROJECT_DIR="${PROJECT_DIR:-/opt/uitstore}"
CART_INTERNAL_API_TOKEN="${CART_INTERNAL_API_TOKEN:-cart_internal_token}"
AUTH_SECRET_KEY="${AUTH_SECRET_KEY:-$(openssl rand -hex 32)}"

if [ ! -d "${PROJECT_DIR}/services" ]; then
    exit 1
fi

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
    IFS=':' read -r PORT DB_NAME <<<"${SERVICES[$SVC_NAME]}"
    SVC_DIR="${PROJECT_DIR}/services/${SVC_NAME}"

    [ ! -d "${SVC_DIR}" ] && continue
    [ ! -f "${SVC_DIR}/requirements.txt" ] && continue

    cd "${SVC_DIR}"
    python3.11 -m venv venv
    "${SVC_DIR}/venv/bin/pip" install --quiet --upgrade pip
    "${SVC_DIR}/venv/bin/pip" install --quiet -r requirements.txt
    "${SVC_DIR}/venv/bin/pip" install --quiet asyncpg

    EXTRA_ENV=""
    if [ "${SVC_NAME}" = "order-service" ]; then
        EXTRA_ENV="PAYMENT_SERVICE_URL=http://${VM3_IP}:8004
INVENTORY_SERVICE_URL=http://localhost:8005
CART_SERVICE_URL=http://localhost:8002
CART_INTERNAL_API_TOKEN=${CART_INTERNAL_API_TOKEN}
KAFKA_ENABLED=false"
    elif [ "${SVC_NAME}" = "noti-service" ]; then
        EXTRA_ENV="KAFKA_ENABLED=true
REDIS_ENABLED=true
REDIS_URL=redis://${VM4_IP}:6379/8"
    else
        EXTRA_ENV="KAFKA_ENABLED=false"
    fi

    cat >"${SVC_DIR}/.env" <<ENVFILE
PROJECT_NAME=${SVC_NAME}
API_V1_STR=/api/v1
DATABASE_URL=postgresql+asyncpg://uitstore:${DATABASE_PASSWORD}@${VM4_IP}:5432/${DB_NAME}
ENABLE_SQLITE_FALLBACK=false
KAFKA_BOOTSTRAP_SERVERS=${VM4_IP}:9092
LOGSTASH_HOST=${VM4_IP}
LOGSTASH_PORT=5044
AUTH_SECRET_KEY=${AUTH_SECRET_KEY}
VAULT_ENABLED=false
REDIS_ENABLED=false
${EXTRA_ENV}
ENVFILE
    chmod 600 "${SVC_DIR}/.env"

    cat >"/etc/systemd/system/${SVC_NAME}.service" <<SVC
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
done

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp

for PORT in 8001 8002 8003 8005 8007 8008; do
    ufw allow from "${NODE1_IP}" to any port "${PORT}" proto tcp
    ufw allow from "${VM4_IP}" to any port "${PORT}" proto tcp
done

ufw reload
systemctl daemon-reload
