#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
    set -a; source .env; set +a
fi

NODE4_IP="${NODE4_IP:-}"
VM1_IP="${VM1_IP:-0.0.0.0}"
VM2_IP="${VM2_IP:-0.0.0.0}"
VM3_IP="${VM3_IP:-0.0.0.0}"

if [ -z "$NODE4_IP" ]; then
    NODE4_IP=$(tailscale ip -4 2>/dev/null || echo "127.0.0.1")
fi

sed \
    -e "s|\${VM1_IP}|${VM1_IP}|g" \
    -e "s|\${VM2_IP}|${VM2_IP}|g" \
    -e "s|\${VM3_IP}|${VM3_IP}|g" \
    prometheus.yml > prometheus.resolved.yml

NODE4_IP="${NODE4_IP}" \
docker compose \
    -f docker-compose.yml \
    --env-file /dev/null \
    up -d \
    --remove-orphans

SECONDS=0
until docker compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list &>/dev/null; do
    sleep 5
    if [ $SECONDS -gt 90 ]; then
        break
    fi
done

for TOPIC in order-commands order-events inventory-commands payment-commands notification-events; do
    docker compose exec -T kafka \
        kafka-topics --create --if-not-exists \
        --topic "$TOPIC" \
        --bootstrap-server localhost:9092 \
        --partitions 3 \
        --replication-factor 1 2>/dev/null || true
done
