#!/usr/bin/env bash
# =============================================================================
# NODE-1: Kiểm tra Keycloak realm, clients, users sau khi triển khai
#
# Usage:
#   bash test-auth.sh
#   KEYCLOAK_URL=http://<NODE1_IP>:8080 bash test-auth.sh
# =============================================================================

set -euo pipefail

NODE1_IP=$(hostname -I | awk '{print $1}')
KEYCLOAK_URL="${KEYCLOAK_URL:-http://${NODE1_IP}:8080}"
REALM="nt219"
TOKEN_ENDPOINT="${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token"

GREEN='\033[0;32m'; RED='\033[0;31m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}  ✓ $*${NC}"; }
fail() { echo -e "${RED}  ✗ $*${NC}"; exit 1; }
info() { echo -e "${BLUE}==> $*${NC}"; }
warn() { echo -e "${YELLOW}  ! $*${NC}"; }

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

# ---------------------------------------------------------------------------
info "Chờ Keycloak tại ${KEYCLOAK_URL}..."
for i in $(seq 1 20); do
  curl -sf "${KEYCLOAK_URL}/health/ready" > /dev/null 2>&1 && { pass "Keycloak sẵn sàng."; break; }
  [ "$i" -eq 20 ] && fail "Keycloak chưa sẵn sàng. Kiểm tra: systemctl status keycloak"
  echo "    Thử ${i}/20 — chờ 5s..."
  sleep 5
done
echo ""

# ---------------------------------------------------------------------------
info "Test 1: Password grant — test users"
echo ""

declare -A USERS=(["testuser"]="testpass123" ["admin_store"]="adminpass123" ["fraud_analyst"]="analystpass123")
for username in testuser admin_store fraud_analyst; do
  echo "  User: ${username}"
  RESPONSE=$(get_token_password "$username" "${USERS[$username]}") || fail "Lỗi lấy token cho ${username}"
  TOKEN=$(extract_field "$RESPONSE" "access_token")
  EXPIRES=$(extract_field "$RESPONSE" "expires_in")
  pass "Token OK (hết hạn sau ${EXPIRES}s) — ${TOKEN:0:40}..."

  PAYLOAD=$(decode_jwt_payload "$TOKEN")
  ROLES=$(echo "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('realm_access',{}).get('roles',[]))" 2>/dev/null)
  pass "JWT roles: ${ROLES}"
  echo ""
done

# ---------------------------------------------------------------------------
info "Test 2: Client credentials — service accounts"
echo ""

declare -A SERVICES=(
  ["catalog-service"]="catalog-client-secret-changeme"
  ["cart-service"]="cart-client-secret-changeme"
  ["order-service"]="order-client-secret-changeme"
  ["payment-service"]="payment-client-secret-changeme"
)
for client_id in catalog-service cart-service order-service payment-service; do
  echo "  Service: ${client_id}"
  RESPONSE=$(get_token_client_credentials "$client_id" "${SERVICES[$client_id]}") \
    || fail "Lỗi lấy token cho ${client_id}"
  EXPIRES=$(extract_field "$RESPONSE" "expires_in")
  pass "Service token OK (hết hạn sau ${EXPIRES}s)"
  echo ""
done

# ---------------------------------------------------------------------------
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Tất cả tests Keycloak PASSED!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Realm:    ${REALM}"
echo "  Endpoint: ${TOKEN_ENDPOINT}"
echo ""
warn "test-cli dùng password grant — chỉ dùng cho dev/test, không dùng trên prod."
echo ""
