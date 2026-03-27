#!/usr/bin/env bash
# =============================================================================
# NT219 Crypto Capstone — Keycloak Token Test Script
#
# Verifies that the realm, clients, and users are correctly configured by:
#   1. Getting an access token for each test user via password grant (test-cli)
#   2. Getting a service account token for each microservice client
#   3. Decoding and printing JWT claims (header + payload, no signature)
#
# Usage (from project root):
#   bash infra/idp/test-token.sh
#
# Prerequisites:
#   - docker compose up -d && wait for Keycloak to be healthy
#   - curl and python3 (or jq) must be installed
# =============================================================================

set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="nt219"
TOKEN_ENDPOINT="${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}  ✓ $*${NC}"; }
fail() { echo -e "${RED}  ✗ $*${NC}"; exit 1; }
info() { echo -e "${BLUE}==> $*${NC}"; }
warn() { echo -e "${YELLOW}  ! $*${NC}"; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

decode_jwt_payload() {
  local token="$1"
  local payload
  payload=$(echo "$token" | cut -d. -f2)
  # Add padding for base64
  local padded="${payload}$(printf '=%.0s' $(seq 1 $(( (4 - ${#payload} % 4) % 4 ))))"
  echo "$padded" | base64 --decode 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "$padded" | base64 --decode
}

get_token_password_grant() {
  local username="$1"
  local password="$2"
  curl -sf \
    -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password" \
    -d "client_id=test-cli" \
    -d "username=${username}" \
    -d "password=${password}" \
    -d "scope=openid"
}

get_token_client_credentials() {
  local client_id="$1"
  local client_secret="$2"
  curl -sf \
    -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials" \
    -d "client_id=${client_id}" \
    -d "client_secret=${client_secret}"
}

extract_field() {
  local json="$1"
  local field="$2"
  echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field','N/A'))" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Wait for Keycloak
# ---------------------------------------------------------------------------

info "Waiting for Keycloak at ${KEYCLOAK_URL}..."
for i in $(seq 1 30); do
  if curl -sf "${KEYCLOAK_URL}/health/ready" > /dev/null 2>&1; then
    pass "Keycloak is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    fail "Keycloak did not become ready in time. Is 'docker compose up -d' running?"
  fi
  echo "    Attempt ${i}/30 — retrying in 5s..."
  sleep 5
done

echo ""

# ---------------------------------------------------------------------------
# Test 1: Password grant — test users
# ---------------------------------------------------------------------------

info "Test 1: Password grant (test-cli) — test users"
echo ""

declare -A USERS=(
  ["testuser"]="testpass123"
  ["admin_store"]="adminpass123"
  ["fraud_analyst"]="analystpass123"
)

for username in testuser admin_store fraud_analyst; do
  password="${USERS[$username]}"
  echo "  User: ${username}"

  RESPONSE=$(get_token_password_grant "$username" "$password") || fail "Token request failed for ${username}"

  ACCESS_TOKEN=$(extract_field "$RESPONSE" "access_token")
  EXPIRES_IN=$(extract_field "$RESPONSE" "expires_in")
  TOKEN_TYPE=$(extract_field "$RESPONSE" "token_type")

  pass "Got ${TOKEN_TYPE} token (expires in ${EXPIRES_IN}s)"
  echo "      Token preview: ${ACCESS_TOKEN:0:60}..."

  # Decode payload
  PAYLOAD=$(decode_jwt_payload "$ACCESS_TOKEN")
  SUB=$(echo "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sub','?'))" 2>/dev/null)
  ROLES=$(echo "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('realm_access',{}).get('roles',[]))" 2>/dev/null)
  EXP=$(echo "$PAYLOAD" | python3 -c "import sys,json,datetime; d=json.load(sys.stdin); print(datetime.datetime.fromtimestamp(d['exp']).strftime('%H:%M:%S'))" 2>/dev/null)

  pass "JWT decoded — sub=${SUB} | roles=${ROLES} | expires=${EXP}"
  echo ""
done

# ---------------------------------------------------------------------------
# Test 2: Client credentials — service accounts
# ---------------------------------------------------------------------------

info "Test 2: Client credentials — microservice accounts"
echo ""

declare -A SERVICES=(
  ["catalog-service"]="catalog-client-secret-changeme"
  ["cart-service"]="cart-client-secret-changeme"
  ["order-service"]="order-client-secret-changeme"
  ["payment-service"]="payment-client-secret-changeme"
)

for client_id in catalog-service cart-service order-service payment-service; do
  secret="${SERVICES[$client_id]}"
  echo "  Service: ${client_id}"

  RESPONSE=$(get_token_client_credentials "$client_id" "$secret") || fail "Token request failed for ${client_id}"

  ACCESS_TOKEN=$(extract_field "$RESPONSE" "access_token")
  EXPIRES_IN=$(extract_field "$RESPONSE" "expires_in")

  pass "Got service token (expires in ${EXPIRES_IN}s)"
  echo "      Token preview: ${ACCESS_TOKEN:0:60}..."
  echo ""
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  All Keycloak token tests passed!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Realm:       ${REALM}"
echo "  Endpoint:    ${TOKEN_ENDPOINT}"
echo "  Users OK:    testuser, admin_store, fraud_analyst"
echo "  Services OK: catalog, cart, order, payment"
echo ""
warn "test-cli client uses password grant — dev only, never enable in prod."
echo ""
