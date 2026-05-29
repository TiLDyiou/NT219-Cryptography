#!/bin/bash
# NODE-3: PCI DSS ZONE - Khởi động
# Chạy SAU NODE-4 (cần DB/Kafka), TRƯỚC NODE-2

VM4_IP="${VM4_IP:-192.168.122.14}"
NODE3_IP=$(hostname -I | awk '{print $1}')

echo "============================================="
echo "  NODE-3: Khởi động PCI DSS Zone"
echo "  IP: ${NODE3_IP}"
echo "============================================="

echo ""
echo ">>> Kiểm tra kết nối NODE-4 (${VM4_IP})..."
nc -z -w3 "${VM4_IP}" 5432 && echo "  PostgreSQL - OK" || echo "  PostgreSQL - KHÔNG KẾT NỐI ĐƯỢC!"
nc -z -w3 "${VM4_IP}" 9092 && echo "  Kafka      - OK" || echo "  Kafka      - KHÔNG KẾT NỐI ĐƯỢC!"

echo ""
echo "[1/2] HashiCorp Vault..."
systemctl start vault && sleep 5

export VAULT_ADDR="http://127.0.0.1:8200"
SVC_DIR="/opt/uitstore/services/payment-service"

INITIALIZED=$(vault operator init -status -format=json 2>/dev/null \
    | jq -r '.initialized' 2>/dev/null || echo "false")

if [ "$INITIALIZED" = "false" ]; then
    echo "  [INIT] Khởi tạo Vault lần đầu..."

    INIT_JSON=$(vault operator init -key-shares=1 -key-threshold=1 -format=json)
    echo "$INIT_JSON" > /root/vault-init.txt
    chmod 600 /root/vault-init.txt

    UNSEAL_KEY=$(echo "$INIT_JSON" | jq -r '.unseal_keys_b64[0]')
    ROOT_TOKEN=$(echo "$INIT_JSON" | jq -r '.root_token')

    vault operator unseal "$UNSEAL_KEY"
    export VAULT_TOKEN="$ROOT_TOKEN"

    # Secrets engines
    vault secrets enable -path=secret kv-v2
    vault secrets enable transit

    # Transit keys
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
        vault write -f "transit/keys/${KEY}" type="${TYPE}" && echo "    key: ${KEY}"
    done

    # Initial secrets
    vault kv put secret/payment/stripe \
        api_key="sk_test_REPLACE_ME" webhook_secret="whsec_REPLACE_ME" publishable_key="pk_test_REPLACE_ME"
    vault kv put secret/catalog/db  password="catalog_dev_pass"
    vault kv put secret/cart/db     password="cart_dev_pass"
    vault kv put secret/order/db    password="order_dev_pass"
    vault kv put secret/payment/db  password="payment_dev_pass"
    vault kv put secret/shipping/db password="shipping_dev_pass"
    vault kv put secret/shipping/ghn \
        api_key="REPLACE_ME_GHN" webhook_secret="dev-ghn-webhook-secret"

    # Policies
    vault policy write payment-svc  /etc/vault.d/policies/payment-svc.hcl
    vault policy write catalog-svc  /etc/vault.d/policies/catalog-svc.hcl
    vault policy write order-svc    /etc/vault.d/policies/order-svc.hcl
    vault policy write shipping-svc /etc/vault.d/policies/shipping-svc.hcl

    # AppRole
    vault auth enable approle

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

    # Cập nhật payment-service .env với AppRole credentials
    sed -i "s|VAULT_TOKEN=mock_token|VAULT_TOKEN=${ROOT_TOKEN}|" "${SVC_DIR}/.env"

    # Lưu AppRole credentials cho NODE-2 (order/shipping cần)
    cat > /root/vault-approle.txt <<EOF
# Dán vào .env của order-service và shipping-service trên NODE-2
VAULT_ADDR=http://${NODE3_IP}:8200
ORDER_VAULT_ROLE_ID=${ORDER_ROLE_ID}
ORDER_VAULT_SECRET_ID=${ORDER_SECRET_ID}
SHIPPING_VAULT_ROLE_ID=${SHIPPING_ROLE_ID}
SHIPPING_VAULT_SECRET_ID=${SHIPPING_SECRET_ID}
EOF
    chmod 600 /root/vault-approle.txt

    echo "  Vault init HOÀN TẤT!"
    echo "  → Unseal key + root token: /root/vault-init.txt"
    echo "  → AppRole credentials cho NODE-2: /root/vault-approle.txt"

elif [ -f /root/vault-init.txt ]; then
    # Đã init — chỉ cần unseal sau restart
    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' /root/vault-init.txt)
    vault operator unseal "$UNSEAL_KEY" 2>/dev/null \
        && echo "  Vault unsealed - OK" || echo "  Vault đã unsealed"
else
    echo "  [WARNING] Vault đã init nhưng không tìm thấy /root/vault-init.txt"
    echo "  Unseal thủ công: vault operator unseal <KEY>"
fi

echo ""
echo "[2/2] Payment Service..."
systemctl start payment-service && sleep 3
systemctl is-active payment-service && echo "  payment-service :8004 - OK" || echo "  payment-service - FAILED"

echo ""
echo ">>> Kiểm tra ports..."
for PORT in 8200 8004; do
    ss -tlnp 2>/dev/null | grep -q ":${PORT} " \
        && echo "  :${PORT} - OPEN" || echo "  :${PORT} - closed"
done

echo ""
echo "============================================="
echo "  NODE-3 đang chạy!"
echo "  Vault UI:      http://${NODE3_IP}:8200"
echo "  Payment API:   http://${NODE3_IP}:8004/docs"
echo ""
echo "  → Khởi động NODE-2 tiếp theo"
echo "============================================="
