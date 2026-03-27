#!/usr/bin/env bash
# =============================================================================
# NT219 Crypto Capstone — Vault Initialization Script
#
# Run ONCE after `docker compose up -d` to set up secrets engines,
# transit encryption keys, and apply least-privilege policies.
#
# Usage (from project root):
#   VAULT_ADDR=http://localhost:8200 bash infra/vault/scripts/init-vault.sh
#
# Or from inside the container:
#   docker compose exec vault sh /vault/scripts/init-vault.sh
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

echo ""
echo "==> [5/6] Writing initial secrets (placeholders — replace before Week 5)..."

# Payment service secrets (Stripe sandbox)
vault kv put secret/payment/stripe \
  api_key="sk_test_REPLACE_ME_WITH_REAL_STRIPE_TEST_KEY" \
  webhook_secret="whsec_REPLACE_ME" \
  && echo "    Written: secret/payment/stripe"

# Per-service DB credentials
vault kv put secret/catalog/db  password="catalog_dev_pass"  && echo "    Written: secret/catalog/db"
vault kv put secret/cart/db     password="cart_dev_pass"     && echo "    Written: secret/cart/db"
vault kv put secret/order/db    password="order_dev_pass"    && echo "    Written: secret/order/db"
vault kv put secret/payment/db  password="payment_dev_pass"  && echo "    Written: secret/payment/db"

echo ""
echo "==> [6/6] Applying least-privilege policies..."

vault policy write payment-svc /vault/policies/payment-svc.hcl && echo "    Applied: payment-svc"
vault policy write catalog-svc /vault/policies/catalog-svc.hcl && echo "    Applied: catalog-svc"
vault policy write order-svc   /vault/policies/order-svc.hcl   && echo "    Applied: order-svc"

echo ""
echo "==> Vault initialization complete!"
echo ""
echo "    Vault UI:  ${VAULT_ADDR}/ui"
echo "    Root token: ${VAULT_TOKEN}"
echo ""
echo "    To get a scoped token for payment-service (example):"
echo "      vault token create -policy=payment-svc -display-name=payment-service -period=24h"
echo ""
echo "    NOTE: Dev mode storage resets on container restart."
echo "    Re-run this script after 'docker compose down && docker compose up -d'."
