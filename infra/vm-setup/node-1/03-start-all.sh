#!/bin/bash
set -euo pipefail

VM2_IP="${VM2_IP:-192.168.122.12}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"
if [ -f /etc/keycloak/keycloak.env ]; then
    KEYCLOAK_ADMIN_PASSWORD=$(grep KEYCLOAK_ADMIN_PASSWORD /etc/keycloak/keycloak.env | cut -d= -f2)
fi

for PORT in 8001 8002 8003 8005 8007 8008; do
    nc -z -w3 "${VM2_IP}" "${PORT}" 2>/dev/null || true
done

systemctl start keycloak

for i in $(seq 1 30); do
    sleep 3
    HTTP=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:8080/auth/health/ready" 2>/dev/null || echo "000")
    [ "$HTTP" = "200" ] && break
done

if [ -f /tmp/realm-export-vm.json ]; then
    TOKEN=$(curl -sf -X POST "http://localhost:8080/auth/realms/master/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=admin-cli&grant_type=password&username=admin&password=${KEYCLOAK_ADMIN_PASSWORD}" \
        2>/dev/null | jq -r '.access_token // empty')
    if [ -n "$TOKEN" ]; then
        curl -s -o /dev/null -X POST "http://localhost:8080/auth/admin/realms" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d @/tmp/realm-export-vm.json 2>/dev/null || true
    fi
    rm -f /tmp/realm-export-vm.json
fi

systemctl start envoy
systemctl start nginx
nginx -t 2>/dev/null && systemctl reload nginx
