#!/bin/bash
# NODE-3: PCI DSS ZONE - Khởi động
# Chạy SAU NODE-4 (cần DB/Kafka), TRƯỚC NODE-2

VM4_IP="${VM4_IP:-192.168.64.14}"
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
systemctl start vault && sleep 3

# Kiểm tra sealed
if curl -s http://127.0.0.1:8200/v1/sys/health 2>/dev/null | grep -q '"sealed":true'; then
    echo ""
    echo "  ============================================"
    echo "  Vault đang SEALED - cần unseal thủ công!"
    echo ""
    echo "  Lần đầu (init + unseal):"
    echo "    export VAULT_ADDR='http://127.0.0.1:8200'"
    echo "    vault operator init -key-shares=1 -key-threshold=1"
    echo "    vault operator unseal <UNSEAL_KEY>"
    echo "    vault login <ROOT_TOKEN>"
    echo "    vault secrets enable transit"
    echo "    vault write -f transit/keys/payment-key"
    echo ""
    echo "  Các lần sau:"
    echo "    vault operator unseal <UNSEAL_KEY>"
    echo "  ============================================"
else
    echo "  Vault - OK (unsealed)"
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
