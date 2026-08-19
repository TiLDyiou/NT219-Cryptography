#!/bin/bash
set -euo pipefail

VM2_IP="${VM2_IP:-192.168.122.12}"
VM4_IP="${VM4_IP:-192.168.122.14}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-${UITSTORE_PASS:-UIT_NT219_SecurePass!}}"
PROJECT_DIR="${PROJECT_DIR:-/opt/uitstore}"
STRIPE_API_KEY="${STRIPE_API_KEY:-sk_test_placeholder}"

if [ ! -d "${PROJECT_DIR}/services/payment-service" ]; then
    exit 1
fi

wget -O - https://apt.releases.hashicorp.com/gpg 2>/dev/null \
    | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg 2>/dev/null
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
    | tee /etc/apt/sources.list.d/hashicorp.list
apt update && apt install -y vault

mkdir -p /opt/vault/data /etc/vault.d

NODE3_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

cat > /etc/vault.d/vault.hcl <<VAULTCFG
ui = true
storage "file" {
  path = "/opt/vault/data"
}
listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}
api_addr = "http://127.0.0.1:8200"
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

SVC_DIR="${PROJECT_DIR}/services/payment-service"
cd "${SVC_DIR}"

python3.11 -m venv venv
"${SVC_DIR}/venv/bin/pip" install --quiet --upgrade pip
"${SVC_DIR}/venv/bin/pip" install --quiet -r requirements.txt
"${SVC_DIR}/venv/bin/pip" install --quiet asyncpg

cat > "${SVC_DIR}/.env" <<ENVFILE
PROJECT_NAME=payment-service
API_V1_STR=/api/v1
DATABASE_URL=postgresql+asyncpg://uitstore:${DATABASE_PASSWORD}@${VM4_IP}:5432/payment_db
ENABLE_SQLITE_FALLBACK=false
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=mock_token
KAFKA_BOOTSTRAP_SERVERS=${VM4_IP}:9092
KAFKA_ENABLED=true
REDIS_ENABLED=false
LOGSTASH_HOST=${VM4_IP}
LOGSTASH_PORT=5044
STRIPE_API_KEY=${STRIPE_API_KEY}
ENVFILE
chmod 600 "${SVC_DIR}/.env"

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

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow from "${VM2_IP}" to any port 8004 proto tcp

ufw reload
systemctl daemon-reload
