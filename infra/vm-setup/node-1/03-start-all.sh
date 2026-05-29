#!/bin/bash
# NODE-1: INGRESS ZONE - Khởi động
# Chạy SAU CÙNG (sau NODE-2, NODE-3, NODE-4)

VM2_IP="${VM2_IP:-192.168.122.12}"
NODE1_IP=$(hostname -I | awk '{print $1}')

echo "============================================="
echo "  NODE-1: Khởi động Ingress Zone"
echo "  IP: ${NODE1_IP}"
echo "============================================="

echo ""
echo ">>> Kiểm tra NODE-2 (Service Mesh) sẵn sàng..."
for PORT in 8001 8002 8003 8005 8007 8008; do
    nc -z -w3 "${VM2_IP}" "${PORT}" \
        && echo "  NODE-2 :${PORT} - OK" \
        || echo "  NODE-2 :${PORT} - KHÔNG KẾT NỐI!"
done

echo ""
echo "[1/3] Keycloak..."
systemctl start keycloak
echo "  Keycloak đang khởi động (~30s)..."

echo "  Đợi Keycloak sẵn sàng (~45s)..."
for i in $(seq 1 15); do
    sleep 3
    HTTP=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:8080/health/ready" 2>/dev/null || echo "000")
    [ "$HTTP" = "200" ] && break
done

if [ -f /tmp/realm-export-vm.json ]; then
    TOKEN=$(curl -sf -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=admin-cli&grant_type=password&username=admin&password=admin123" \
        2>/dev/null | jq -r '.access_token // empty')
    if [ -n "$TOKEN" ]; then
        HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:8080/admin/realms" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d @/tmp/realm-export-vm.json)
        [ "$HTTP" = "201" ] && echo "  Realm uitstore imported - OK" \
            || echo "  Realm import HTTP ${HTTP} (có thể đã tồn tại)"
    else
        echo "  [WARNING] Keycloak chưa sẵn sàng, import realm thủ công:"
        echo "  bash ${PROJECT_DIR}/infra/idp/test-token.sh"
    fi
fi

echo ""
echo "[2/3] Envoy Gateway..."
systemctl start envoy && sleep 2
systemctl is-active envoy \
    && echo "  Envoy :10000 - OK" \
    || echo "  Envoy - FAILED (journalctl -u envoy -n 20)"

echo ""
echo "[3/3] Nginx..."
systemctl start nginx
nginx -t 2>/dev/null && systemctl reload nginx
echo "  Nginx :80 - OK"

echo ""
echo ">>> Kiểm tra ports..."
for PORT in 80 8080 9901 10000; do
    ss -tlnp 2>/dev/null | grep -q ":${PORT} " \
        && echo "  :${PORT} - OPEN" || echo "  :${PORT} - pending"
done

echo ""
echo ">>> Test end-to-end routing..."
sleep 5
CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/" 2>/dev/null || echo "ERR")
echo "  GET / → ${CODE} (frontend)"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/v1/catalog/health" 2>/dev/null || echo "ERR")
echo "  GET /api/v1/catalog/health → ${CODE} (qua Envoy → NODE-2)"

echo ""
echo "============================================="
echo "  HỆ THỐNG ĐÃ KHỞI ĐỘNG ĐẦY ĐỦ!"
echo ""
echo "  Truy cập từ máy host (macOS):"
echo "    Frontend:    http://${NODE1_IP}/"
echo "    Keycloak:    http://${NODE1_IP}:8080  (admin/admin123)"
echo "    Envoy Admin: http://${NODE1_IP}:9901"
echo ""
echo "  Truy cập trực tiếp từng node (demo):"
echo "    Vault UI:    http://<NODE3_IP>:8200"
echo "    Grafana:     http://<NODE4_IP>:3000  (admin/admin)"
echo "    Kibana:      http://<NODE4_IP>:5601"
echo "    Prometheus:  http://<NODE4_IP>:9090"
echo "============================================="
