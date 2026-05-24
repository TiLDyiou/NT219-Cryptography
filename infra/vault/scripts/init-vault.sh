#!/usr/bin/env bash
# =============================================================================
# NT219 Crypto Capstone — Vault Initialization Script
#
# Run ONCE after `docker compose up -d` to set up secrets engines,
# transit encryption keys, and apply least-privilege policies.
# =============================================================================

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_DEV_ROOT_TOKEN:-dev-root-token}"

export VAULT_ADDR VAULT_TOKEN

echo "==> [1/6] Waiting for Vault to be ready..."
for i in $(seq 1 30); do
  if vault status > /dev/null 2>&1; then
    echo "    Vault is up."
    break
  fi
  echo "    Attempt $i/30 — waiting 2s..."
  sleep 2
done

vault status

echo ""
echo "==> [2/6] Enabling KV v2 secrets engine at path 'secret/'..."
vault secrets enable -path=secret kv-v2 2>/dev/null && echo "    Enabled." || echo "    Already enabled — skipping."

echo ""
echo "==> [3/6] Enabling Transit secrets engine (KMS emulator)..."
vault secrets enable transit 2>/dev/null && echo "    Enabled." || echo "    Already enabled — skipping."

echo ""
echo "==> [4/6] Creating cryptographic keys..."

# AES-256-GCM96 key for payment tokenization (envelope encryption)
vault write -f transit/keys/payment-key type=aes256-gcm96 \
  && echo "    Created: payment-key (AES-256-GCM96)" \
  || echo "    payment-key already exists — skipping."

# ECDSA P-256 key for order integrity signing
vault write -f transit/keys/order-sign-key type=ecdsa-p256 \
  && echo "    Created: order-sign-key (ECDSA P-256)" \
  || echo "    order-sign-key already exists — skipping."

# AES-256-GCM96 for order-service FLE (envelope encryption)
vault write -f transit/keys/order-fle-key type=aes256-gcm96 \
  && echo "    Created: order-fle-key (AES-256-GCM96)" \
  || echo "    order-fle-key already exists — skipping."

# HMAC key for inter-service request signing
vault write -f transit/keys/order-hmac-key type=aes256-gcm96 \
  && echo "    Created: order-hmac-key (AES-256-GCM96)" \
  || echo "    order-hmac-key already exists — skipping."

# NEW: transit/keys for payment-service
vault write -f transit/keys/payment-sign-key type=ecdsa-p256 \
  && echo "    Created: payment-sign-key (ECDSA P-256)" \
  || echo "    payment-sign-key already exists — skipping."

vault write -f transit/keys/payment-fle-key type=aes256-gcm96 \
  && echo "    Created: payment-fle-key (AES-256-GCM96)" \
  || echo "    payment-fle-key already exists — skipping."

vault write -f transit/keys/payment-audit-key type=aes256-gcm96 \
  && echo "    Created: payment-audit-key (AES-256-GCM96)" \
  || echo "    payment-audit-key already exists — skipping."

echo ""
echo "==> [5/6] Writing initial secrets..."

# Payment service secrets (Stripe sandbox)
vault kv put secret/payment/stripe \
  api_key="sk_test_REPLACE_ME_WITH_REAL_STRIPE_TEST_KEY" \
  webhook_secret="whsec_REPLACE_ME" \
  publishable_key="pk_test_REPLACE_ME" \
  && echo "    Written: secret/payment/stripe"

# Per-service DB credentials
vault kv put secret/catalog/db  password="catalog_dev_pass"  && echo "    Written: secret/catalog/db"
vault kv put secret/cart/db     password="cart_dev_pass"     && echo "    Written: secret/cart/db"
vault kv put secret/order/db    password="order_dev_pass"    && echo "    Written: secret/order/db"
vault kv put secret/payment/db  password="payment_dev_pass"  && echo "    Written: secret/payment/db"

echo ""
echo "==> [6/7] Applying least-privilege policies..."

vault policy write payment-svc /vault/policies/payment-svc.hcl && echo "    Applied: payment-svc"
vault policy write catalog-svc /vault/policies/catalog-svc.hcl && echo "    Applied: catalog-svc"
vault policy write order-svc   /vault/policies/order-svc.hcl   && echo "    Applied: order-svc"

echo ""
echo "==> [7/7] Enabling AppRole auth..."

vault auth enable approle 2>/dev/null && echo "    AppRole enabled." || echo "    AppRole already enabled — skipping."

# AppRole order-service
vault write auth/approle/role/order-service \
  token_policies="order-svc" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0 \
  && echo "    Created AppRole: order-service"

ORDER_ROLE_ID=$(vault read -field=role_id auth/approle/role/order-service/role-id)
ORDER_SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/order-service/secret-id)

echo "    ORDER_VAULT_ROLE_ID=${ORDER_ROLE_ID}"
echo "    ORDER_VAULT_SECRET_ID=${ORDER_SECRET_ID}"

# AppRole payment-service
vault write auth/approle/role/payment-service \
  token_policies="payment-svc" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0 \
  && echo "    Created AppRole: payment-service"

PAYMENT_ROLE_ID=$(vault read -field=role_id auth/approle/role/payment-service/role-id)
PAYMENT_SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/payment-service/secret-id)

echo "    PAYMENT_VAULT_ROLE_ID=${PAYMENT_ROLE_ID}"
echo "    PAYMENT_VAULT_SECRET_ID=${PAYMENT_SECRET_ID}"

echo ""
echo "==> Vault initialization complete!"
echo ""
echo "    Vault UI:  ${VAULT_ADDR}/ui"
echo "    Root token: ${VAULT_TOKEN}"
echo ""
