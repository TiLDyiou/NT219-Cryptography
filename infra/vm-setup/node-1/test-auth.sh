#!/usr/bin/env bash
set -euo pipefail

NODE1_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
KEYCLOAK_URL="${KEYCLOAK_URL:-http://${NODE1_IP:-127.0.0.1}/auth}"
REALM="nt219"
TOKEN_ENDPOINT="${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token"

decode_jwt_payload() {
  local token="$1"
  local payload; payload=$(echo "$token" | cut -d. -f2)
  local padded="${payload}$(printf '=%.0s' $(seq 1 $(( (4 - ${#payload} % 4) % 4 ))))"
  echo "$padded" | base64 --decode 2>/dev/null | python3 -m json.tool 2>/dev/null \
    || echo "$padded" | base64 --decode
}

get_token_password() {
  curl -sf -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password&client_id=test-cli&username=${1}&password=${2}&scope=openid"
}

get_token_client_credentials() {
  curl -sf -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=${1}&client_secret=${2}"
}

extract_field() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2','N/A'))" 2>/dev/null
}

for i in $(seq 1 20); do
  curl -sf "${KEYCLOAK_URL}/health/ready" > /dev/null 2>&1 && break
  [ "$i" -eq 20 ] && exit 1
  sleep 3
done

declare -A SERVICES=(
  ["catalog-service"]="${CATALOG_CLIENT_SECRET:-catalog-client-secret-changeme}"
  ["cart-service"]="${CART_CLIENT_SECRET:-cart-client-secret-changeme}"
  ["order-service"]="${ORDER_CLIENT_SECRET:-order-client-secret-changeme}"
  ["payment-service"]="${PAYMENT_CLIENT_SECRET:-payment-client-secret-changeme}"
)
for client_id in catalog-service cart-service order-service payment-service; do
  RESPONSE=$(get_token_client_credentials "$client_id" "${SERVICES[$client_id]}")
  TOKEN=$(extract_field "$RESPONSE" "access_token")
  [ -n "$TOKEN" ] && [ "$TOKEN" != "N/A" ]
done
