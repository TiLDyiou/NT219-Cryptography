#!/bin/bash
set -euo pipefail

VM4_IP="${VM4_IP:-192.168.122.14}"
NODE3_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

nc -z -w3 "${VM4_IP}" 5432 2>/dev/null || true
nc -z -w3 "${VM4_IP}" 9092 2>/dev/null || true

systemctl start vault
sleep 2

export VAULT_ADDR="http://127.0.0.1:8200"
SVC_DIR="/opt/uitstore/services/payment-service"

INITIALIZED=$(vault operator init -status -format=json 2>/dev/null \
    | jq -r '.initialized' 2>/dev/null || echo "false")

if [ "$INITIALIZED" = "false" ]; then
    INIT_JSON=$(vault operator init -key-shares=1 -key-threshold=1 -format=json)
    echo "$INIT_JSON" > /root/vault-init.txt
    chmod 600 /root/vault-init.txt

    UNSEAL_KEY=$(echo "$INIT_JSON" | jq -r '.unseal_keys_b64[0]')
    ROOT_TOKEN=$(echo "$INIT_JSON" | jq -r '.root_token')

    vault operator unseal "$UNSEAL_KEY"
    export VAULT_TOKEN="$ROOT_TOKEN"

    vault secrets enable -path=secret kv-v2 2>/dev/null || true
    vault secrets enable transit 2>/dev/null || true

    for KEY_SPEC in \
        "payment-key:aes256-gcm96" \
        "payment-sign-key:ecdsa-p256" \
        "payment-fle-key:aes256-gcm96" \
        "payment-audit-key:aes256-gcm96" \
        "order-fle-key:aes256-gcm96" \
        "order-sign-key:ecdsa-p256" \
        "order-hmac-key:aes256-gcm96" \
        "inventory-fle-key:aes256-gcm96" \
        "inventory-sign-key:ecdsa-p256" \
        "inventory-audit-key:aes256-gcm96" \
        "shipping-fle-key:aes256-gcm96" \
        "shipping-sign-key:ecdsa-p256" \
        "shipping-audit-key:aes256-gcm96"
    do
        KEY="${KEY_SPEC%%:*}"; TYPE="${KEY_SPEC##*:}"
        vault write -f "transit/keys/${KEY}" type="${TYPE}" 2>/dev/null || true
    done

    vault kv put secret/payment/stripe \
        api_key="${STRIPE_API_KEY:-sk_test_placeholder}" \
        webhook_secret="${STRIPE_WEBHOOK_SECRET:-whsec_placeholder}" \
        publishable_key="${STRIPE_PUB_KEY:-pk_test_placeholder}"
    vault kv put secret/catalog/db  password="${CATALOG_DB_PASS:-$(openssl rand -hex 16)}"
    vault kv put secret/cart/db     password="${CART_DB_PASS:-$(openssl rand -hex 16)}"
    vault kv put secret/order/db    password="${ORDER_DB_PASS:-$(openssl rand -hex 16)}"
    vault kv put secret/payment/db  password="${PAYMENT_DB_PASS:-$(openssl rand -hex 16)}"
    vault kv put secret/shipping/db password="${SHIPPING_DB_PASS:-$(openssl rand -hex 16)}"
    vault kv put secret/shipping/ghn \
        api_key="${GHN_API_KEY:-ghn_placeholder}" webhook_secret="${GHN_WEBHOOK_SECRET:-ghn_secret_placeholder}"

    vault policy write payment-svc  /etc/vault.d/policies/payment-svc.hcl
    vault policy write catalog-svc  /etc/vault.d/policies/catalog-svc.hcl
    vault policy write order-svc    /etc/vault.d/policies/order-svc.hcl
    vault policy write shipping-svc /etc/vault.d/policies/shipping-svc.hcl

    vault auth enable approle 2>/dev/null || true

    vault write auth/approle/role/payment-service \
        token_policies="payment-svc" token_ttl=1h secret_id_ttl=0
    PAYMENT_ROLE_ID=$(vault read -field=role_id auth/approle/role/payment-service/role-id)
    PAYMENT_SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/payment-service/secret-id)

    vault write auth/approle/role/order-service \
        token_policies="order-svc" token_ttl=1h secret_id_ttl=0
    ORDER_ROLE_ID=$(vault read -field=role_id auth/approle/role/order-service/role-id)
    ORDER_SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/order-service/secret-id)

    vault write auth/approle/role/shipping-service \
        token_policies="shipping-svc" token_ttl=1h secret_id_ttl=0
    SHIPPING_ROLE_ID=$(vault read -field=role_id auth/approle/role/shipping-service/role-id)
    SHIPPING_SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/shipping-service/secret-id)

    if [ -f "${SVC_DIR}/.env" ]; then
        sed -i "s|VAULT_TOKEN=mock_token|VAULT_ROLE_ID=${PAYMENT_ROLE_ID}\nVAULT_SECRET_ID=${PAYMENT_SECRET_ID}|" "${SVC_DIR}/.env"
    fi

    cat > /root/vault-approle.txt <<EOF
VAULT_ADDR=http://${NODE3_IP:-127.0.0.1}:8200
ORDER_VAULT_ROLE_ID=${ORDER_ROLE_ID}
ORDER_VAULT_SECRET_ID=${ORDER_SECRET_ID}
SHIPPING_VAULT_ROLE_ID=${SHIPPING_ROLE_ID}
SHIPPING_VAULT_SECRET_ID=${SHIPPING_SECRET_ID}
EOF
    chmod 600 /root/vault-approle.txt

elif [ -f /root/vault-init.txt ]; then
    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /root/vault-init.txt)
    vault operator unseal "$UNSEAL_KEY" 2>/dev/null || true
fi

systemctl start payment-service
