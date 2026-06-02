#!/bin/bash
# =============================================================================
# NODE-3: PCI DSS ZONE - Bước 2: Cài payment-service + HashiCorp Vault
#
# CẤU HÌNH: Chỉnh IP trước khi chạy
# Usage: sudo bash 02-setup-payment.sh
# =============================================================================
set -euo pipefail

# ============================================================
VM2_IP="${VM2_IP:-192.168.122.12}"   # order-service sẽ gọi vào đây
VM4_IP="${VM4_IP:-192.168.122.14}"   # PostgreSQL, Kafka, Logstash

UITSTORE_PASS="UIT_NT219_SecurePass!"
PROJECT_DIR="/opt/uitstore"
# ============================================================

echo "============================================="
echo "  NODE-3: PCI DSS ZONE"
echo "  payment-service + HashiCorp Vault"
echo "  Nhận request từ VM2: ${VM2_IP}"
echo "  Kết nối DB/Kafka tại VM4: ${VM4_IP}"
echo "============================================="

if [ ! -d "${PROJECT_DIR}/services/payment-service" ]; then
    echo "[LỖI] Không tìm thấy source code tại ${PROJECT_DIR}"
    echo "Chạy lệnh sau từ máy host:"
    echo "  scp -r /Users/nergy/NT219-Cryptography/ user@<VM3_IP>:/opt/uitstore"
    exit 1
fi

# =============================================================================
# 1. HASHICORP VAULT (chạy local trên NODE-3, chỉ payment dùng)
# =============================================================================
echo ""
echo ">>> [1/3] Cài HashiCorp Vault..."

wget -O - https://apt.releases.hashicorp.com/gpg 2>/dev/null \
    | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg 2>/dev/null
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
    | tee /etc/apt/sources.list.d/hashicorp.list
apt update && apt install -y vault

mkdir -p /opt/vault/data /etc/vault.d

NODE3_IP=$(hostname -I | awk '{print $1}')

cat > /etc/vault.d/vault.hcl <<VAULTCFG
ui = true
storage "file" {
  path = "/opt/vault/data"
}
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}
api_addr = "http://${NODE3_IP}:8200"
VAULTCFG

cat > /etc/systemd/system/vault.service <<SVC
[Unit]
Description=HashiCorp Vault (PCI DSS Zone)
After=network.target
[Service]
Type=simple
User=root
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
Restart=on-failure
RestartSec=5
LimitMEMLOCK=infinity
Environment=VAULT_ADDR=http://127.0.0.1:8200
[Install]
WantedBy=multi-user.target
SVC

systemctl enable vault

# Vault policies (viết sẵn, áp dụng lúc init trong 03-start-all.sh)
mkdir -p /etc/vault.d/policies

cat > /etc/vault.d/policies/payment-svc.hcl <<'POLICY'
path "transit/verify/order-hmac-key"    { capabilities = ["update"] }
path "transit/sign/payment-sign-key"    { capabilities = ["update"] }
path "transit/verify/payment-sign-key"  { capabilities = ["update"] }
path "transit/encrypt/payment-fle-key"  { capabilities = ["update"] }
path "transit/decrypt/payment-fle-key"  { capabilities = ["update"] }
path "transit/rewrap/payment-fle-key"   { capabilities = ["update"] }
path "transit/hmac/payment-audit-key"   { capabilities = ["update"] }
path "transit/verify/payment-audit-key" { capabilities = ["update"] }
path "transit/keys/payment-sign-key"    { capabilities = ["read"] }
path "transit/keys/payment-fle-key"     { capabilities = ["read"] }
path "transit/keys/payment-audit-key"   { capabilities = ["read"] }
path "secret/data/payment/*"            { capabilities = ["read"] }
path "*"                                { capabilities = ["deny"] }
POLICY

cat > /etc/vault.d/policies/order-svc.hcl <<'POLICY'
path "transit/encrypt/order-fle-key"  { capabilities = ["update"] }
path "transit/decrypt/order-fle-key"  { capabilities = ["update"] }
path "transit/rewrap/order-fle-key"   { capabilities = ["update"] }
path "transit/sign/order-sign-key"    { capabilities = ["update"] }
path "transit/verify/order-sign-key"  { capabilities = ["update"] }
path "transit/hmac/order-hmac-key"    { capabilities = ["update"] }
path "transit/verify/order-hmac-key"  { capabilities = ["update"] }
path "secret/data/order/*"            { capabilities = ["read"] }
path "*"                              { capabilities = ["deny"] }
POLICY

cat > /etc/vault.d/policies/catalog-svc.hcl <<'POLICY'
path "secret/data/catalog/*" { capabilities = ["read"] }
path "*"                     { capabilities = ["deny"] }
POLICY

cat > /etc/vault.d/policies/shipping-svc.hcl <<'POLICY'
path "transit/encrypt/shipping-fle-key"  { capabilities = ["update"] }
path "transit/decrypt/shipping-fle-key"  { capabilities = ["update"] }
path "transit/rewrap/shipping-fle-key"   { capabilities = ["update"] }
path "transit/sign/shipping-sign-key"    { capabilities = ["update"] }
path "transit/verify/shipping-sign-key"  { capabilities = ["update"] }
path "transit/hmac/order-hmac-key"       { capabilities = ["update"] }
path "transit/verify/order-hmac-key"     { capabilities = ["update"] }
path "transit/hmac/shipping-audit-key"   { capabilities = ["update"] }
path "transit/verify/shipping-audit-key" { capabilities = ["update"] }
path "secret/data/shipping/*"            { capabilities = ["read"] }
path "*"                                 { capabilities = ["deny"] }
POLICY

echo "  Vault - OK (local, chỉ payment-service dùng)"

# =============================================================================
# 2. PAYMENT-SERVICE
# =============================================================================
echo ""
echo ">>> [2/3] Setup payment-service..."

SVC_DIR="${PROJECT_DIR}/services/payment-service"
cd "${SVC_DIR}"

python3.11 -m venv venv
"${SVC_DIR}/venv/bin/pip" install --quiet --upgrade pip
"${SVC_DIR}/venv/bin/pip" install --quiet -r requirements.txt
"${SVC_DIR}/venv/bin/pip" install --quiet asyncpg

cat > "${SVC_DIR}/.env" <<ENVFILE
PROJECT_NAME=payment-service
API_V1_STR=/api/v1

# DB trên NODE-4
DATABASE_URL=postgresql+asyncpg://uitstore:${UITSTORE_PASS}@${VM4_IP}:5432/payment_db
ENABLE_SQLITE_FALLBACK=false

# Vault LOCAL (cùng node - PCI DSS isolation)
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=mock_token

# Kafka trên NODE-4 (publish payment.events cho noti-service)
KAFKA_BOOTSTRAP_SERVERS=${VM4_IP}:9092
KAFKA_ENABLED=true

# Redis không dùng trên NODE-3
REDIS_ENABLED=false

# Audit log → NODE-4 Logstash
LOGSTASH_HOST=${VM4_IP}
LOGSTASH_PORT=5044

# Stripe (test mode)
STRIPE_API_KEY=sk_test_placeholder
ENVFILE

cat > /etc/systemd/system/payment-service.service <<SVC
[Unit]
Description=UIT Store - Payment Service (PCI DSS Zone)
After=network.target vault.service

[Service]
Type=simple
User=root
WorkingDirectory=${SVC_DIR}
EnvironmentFile=${SVC_DIR}/.env
ExecStart=${SVC_DIR}/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8004
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SVC

systemctl enable payment-service
echo "  payment-service - OK (port 8004)"

# =============================================================================
# 3. FIREWALL - Chỉ cho phép VM-2 gọi vào payment
# =============================================================================
echo ""
echo ">>> [3/3] Cấu hình firewall (PCI DSS isolation)..."

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp

# payment-service: chỉ nhận từ VM-2 (order-service)
ufw allow from "${VM2_IP}" to any port 8004

# Vault UI: chỉ local + admin (demo)
ufw allow from "${VM2_IP}" to any port 8200

ufw reload
echo "  Firewall - OK (payment :8004 chỉ mở cho VM2: ${VM2_IP})"

systemctl daemon-reload

echo ""
echo "============================================="
echo "  NODE-3 Setup HOÀN TẤT!"
echo ""
echo "  QUAN TRỌNG - Sau khi start Vault (lần đầu):"
echo "    export VAULT_ADDR='http://127.0.0.1:8200'"
echo "    vault operator init -key-shares=1 -key-threshold=1"
echo "    vault operator unseal <UNSEAL_KEY>"
echo "    vault login <ROOT_TOKEN>"
echo "    vault secrets enable transit"
echo "    vault write -f transit/keys/payment-key"
echo ""
echo "  Tiếp theo: sudo bash 03-start-all.sh"
echo "============================================="
