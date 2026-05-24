#!/bin/bash
# NODE-2: SERVICE MESH - Khởi động
# Chạy SAU NODE-3 và NODE-4

VM3_IP="${VM3_IP:-192.168.64.13}"
VM4_IP="${VM4_IP:-192.168.64.14}"
NODE2_IP=$(hostname -I | awk '{print $1}')

echo "============================================="
echo "  NODE-2: Khởi động Service Mesh"
echo "  IP: ${NODE2_IP}"
echo "============================================="

echo ""
echo ">>> Kiểm tra kết nối các node phụ thuộc..."
nc -z -w3 "${VM4_IP}" 5432 && echo "  NODE-4 PostgreSQL - OK" || echo "  NODE-4 PostgreSQL - KHÔNG KẾT NỐI!"
nc -z -w3 "${VM4_IP}" 9092 && echo "  NODE-4 Kafka      - OK" || echo "  NODE-4 Kafka      - KHÔNG KẾT NỐI!"
nc -z -w3 "${VM3_IP}" 8004 && echo "  NODE-3 Payment    - OK" || echo "  NODE-3 Payment    - KHÔNG KẾT NỐI!"

echo ""
echo ">>> Khởi động services..."

SERVICES=(catalog-service cart-service order-service inventory-service shipping-service noti-service)
PORTS=(8001 8002 8003 8005 8007 8008)

for i in "${!SERVICES[@]}"; do
    SVC="${SERVICES[$i]}"
    PORT="${PORTS[$i]}"
    systemctl start "$SVC" && sleep 1
    systemctl is-active --quiet "$SVC" \
        && echo "  $SVC :${PORT} - OK" \
        || echo "  $SVC - FAILED (journalctl -u $SVC -n 20)"
done

echo ""
echo ">>> Kiểm tra ports..."
for PORT in 8001 8002 8003 8005 8007 8008; do
    ss -tlnp 2>/dev/null | grep -q ":${PORT} " \
        && echo "  :${PORT} - OPEN" || echo "  :${PORT} - closed"
done

echo ""
echo ">>> Health check..."
sleep 3
for PORT in 8001 8002 8003 8005 8007 8008; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" 2>/dev/null || echo "ERR")
    echo "  :${PORT}/health → ${CODE}"
done

echo ""
echo "============================================="
echo "  NODE-2 đang chạy!"
echo "  Catalog API:  http://${NODE2_IP}:8001/docs"
echo "  Cart API:     http://${NODE2_IP}:8002/docs"
echo "  Order API:    http://${NODE2_IP}:8003/docs"
echo ""
echo "  → Khởi động NODE-1 (Ingress) cuối cùng"
echo "============================================="
