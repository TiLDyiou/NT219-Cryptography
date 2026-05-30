#!/bin/bash
# NODE-4 macOS: Khởi động toàn bộ service qua Docker Compose
# Usage: bash start.sh
# Hoặc:  NODE4_IP=100.x.x.x VM1_IP=... VM2_IP=... VM3_IP=... bash start.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env nếu có
if [ -f .env ]; then
    set -a; source .env; set +a
fi

NODE4_IP="${NODE4_IP:-}"
VM1_IP="${VM1_IP:-}"
VM2_IP="${VM2_IP:-}"
VM3_IP="${VM3_IP:-}"

# Tự lấy Tailscale IP nếu chưa set
if [ -z "$NODE4_IP" ]; then
    NODE4_IP=$(tailscale ip -4 2>/dev/null || echo "")
    if [ -z "$NODE4_IP" ]; then
        echo "ERROR: Chưa có NODE4_IP và tailscale ip -4 thất bại."
        echo "       Chạy: sudo tailscale up --login-server=https://nergy-headscale.duckdns.org"
        exit 1
    fi
fi

echo "============================================="
echo "  NODE-4: Data + Observability (Docker)"
echo "  NODE4_IP (Kafka advertise): ${NODE4_IP}"
echo "  VM1_IP (Ingress):           ${VM1_IP:-<chưa set>}"
echo "  VM2_IP (Service Mesh):      ${VM2_IP:-<chưa set>}"
echo "  VM3_IP (Payment):           ${VM3_IP:-<chưa set>}"
echo "============================================="

if [ -z "$VM1_IP" ] || [ -z "$VM2_IP" ] || [ -z "$VM3_IP" ]; then
    echo "WARN: Một hoặc nhiều VM_IP chưa set."
    echo "      Prometheus sẽ không scrape được các node khác cho đến khi cập nhật."
    echo "      Điền đầy đủ trong file .env rồi chạy lại hoặc export trước khi chạy script."
fi

# Sinh prometheus.yml với IP thật
VM1_IP="${VM1_IP:-0.0.0.0}"
VM2_IP="${VM2_IP:-0.0.0.0}"
VM3_IP="${VM3_IP:-0.0.0.0}"

sed \
    -e "s|\${VM1_IP}|${VM1_IP}|g" \
    -e "s|\${VM2_IP}|${VM2_IP}|g" \
    -e "s|\${VM3_IP}|${VM3_IP}|g" \
    prometheus.yml > prometheus.resolved.yml

echo ""
echo ">>> Khởi động Docker Compose..."
NODE4_IP="${NODE4_IP}" \
docker compose \
    -f docker-compose.yml \
    --env-file /dev/null \
    up -d \
    --remove-orphans

echo ""
echo ">>> Chờ Kafka healthy (~30s)..."
SECONDS=0
until docker compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list &>/dev/null; do
    sleep 5
    if [ $SECONDS -gt 90 ]; then
        echo "WARN: Kafka chưa sẵn sàng sau 90s, bỏ qua tạo topics."
        break
    fi
done

echo ""
echo ">>> Tạo Kafka topics..."
for TOPIC in order-commands order-events inventory-commands payment-commands notification-events; do
    docker compose exec -T kafka \
        kafka-topics --create --if-not-exists \
        --topic "$TOPIC" \
        --bootstrap-server localhost:9092 \
        --partitions 3 \
        --replication-factor 1 2>/dev/null \
        && echo "  topic: $TOPIC - OK" || echo "  topic: $TOPIC - SKIP (đã tồn tại)"
done

echo ""
echo "============================================="
echo "  NODE-4 đang chạy!"
echo ""
echo "  Grafana:    http://${NODE4_IP}:3000  (admin/admin)"
echo "  Kibana:     http://${NODE4_IP}:5601"
echo "  Prometheus: http://${NODE4_IP}:9090"
echo "  PostgreSQL: ${NODE4_IP}:5432  (uitstore/123456)"
echo "  Kafka:      ${NODE4_IP}:9092"
echo ""
echo "  → NODE khác dùng NODE4_IP=${NODE4_IP}"
echo "============================================="
