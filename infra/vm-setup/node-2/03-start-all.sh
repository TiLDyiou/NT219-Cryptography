#!/bin/bash
set -euo pipefail

VM3_IP="${VM3_IP:-192.168.122.13}"
VM4_IP="${VM4_IP:-192.168.122.14}"

nc -z -w3 "${VM4_IP}" 5432 2>/dev/null || true
nc -z -w3 "${VM4_IP}" 9092 2>/dev/null || true
nc -z -w3 "${VM3_IP}" 8004 2>/dev/null || true

SERVICES=(catalog-service cart-service order-service inventory-service shipping-service noti-service)

for SVC in "${SERVICES[@]}"; do
    systemctl start "$SVC"
done
