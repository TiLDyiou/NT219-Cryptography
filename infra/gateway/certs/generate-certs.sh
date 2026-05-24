#!/usr/bin/env bash
# =============================================================================
# NT219 Crypto Capstone — Self-Signed TLS Certificate Generator
# Week 2: Generates CA + server cert for Envoy TLS termination
#
# Usage:
#   bash infra/gateway/certs/generate-certs.sh
#
# Output files (in infra/gateway/certs/):
#   ca.key, ca.crt          — Root CA (self-signed)
#   server.key, server.crt  — Server cert signed by CA
#
# Week 3+: Replace with Vault PKI-issued certs (auto-rotation)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DAYS_CA=3650
DAYS_SERVER=365
COUNTRY="VN"
STATE="Ho Chi Minh"
ORG="NT219 Capstone"
CN_CA="NT219 Root CA"
CN_SERVER="localhost"

echo "==> [1/4] Generating Root CA private key..."
openssl genrsa -out ca.key 4096
echo "    Created: ca.key (4096-bit RSA)"

echo ""
echo "==> [2/4] Generating Root CA certificate (self-signed, ${DAYS_CA} days)..."
openssl req -new -x509 -days "$DAYS_CA" -key ca.key -out ca.crt \
  -subj "/C=${COUNTRY}/ST=${STATE}/O=${ORG}/CN=${CN_CA}"
echo "    Created: ca.crt"

echo ""
echo "==> [3/4] Generating server private key + CSR..."
openssl genrsa -out server.key 2048
echo "    Created: server.key (2048-bit RSA)"

# Create SAN config for multi-domain cert
cat > server-san.cnf <<EOF
[req]
default_bits = 2048
prompt = no
distinguished_name = dn
req_extensions = v3_req

[dn]
C = ${COUNTRY}
ST = ${STATE}
O = ${ORG}
CN = ${CN_SERVER}

[v3_req]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = localhost
DNS.2 = *.nt219.local
DNS.3 = envoy
DNS.4 = nt219-envoy
DNS.5 = nginx-cdn
DNS.6 = nt219-nginx-cdn
IP.1 = 127.0.0.1
IP.2 = 0.0.0.0
EOF

openssl req -new -key server.key -out server.csr -config server-san.cnf
echo "    Created: server.csr"

echo ""
echo "==> [4/4] Signing server certificate with CA (${DAYS_SERVER} days)..."
openssl x509 -req -days "$DAYS_SERVER" \
  -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt \
  -extensions v3_req -extfile server-san.cnf
echo "    Created: server.crt"

# Cleanup temp files
rm -f server.csr server-san.cnf ca.srl

echo ""
echo "============================================================"
echo "  TLS certificates generated successfully!"
echo "============================================================"
echo ""
echo "  CA cert:     ${SCRIPT_DIR}/ca.crt"
echo "  Server cert: ${SCRIPT_DIR}/server.crt"
echo "  Server key:  ${SCRIPT_DIR}/server.key"
echo ""
echo "  To verify:"
echo "    openssl x509 -in server.crt -text -noout | head -20"
echo "    openssl verify -CAfile ca.crt server.crt"
echo ""
echo "  NOTE: These are DEV-ONLY self-signed certs."
echo "  Week 3+: Replace with Vault PKI Engine certs."
echo ""
