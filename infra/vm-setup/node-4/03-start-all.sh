#!/bin/bash
# NODE-4: DATA + EVENT BUS + OBSERVABILITY - Khởi động
# Chạy TRƯỚC tất cả các node khác
set -euo pipefail

NODE4_IP=$(hostname -I | awk '{print $1}')
echo "============================================="
echo "  NODE-4: Khởi động Data + Observability"
echo "  IP: ${NODE4_IP}"
echo "============================================="

echo ""
echo "[1/5] PostgreSQL..."
systemctl start postgresql && sleep 2
systemctl is-active postgresql && echo "  OK" || echo "  FAILED"

echo ""
echo "[2/5] Zookeeper → Kafka..."
systemctl start zookeeper && sleep 5
systemctl start kafka && sleep 5
systemctl is-active kafka && echo "  Kafka - OK" || echo "  Kafka - FAILED"

echo ""
echo "  Tạo Kafka topics..."
TOPICS=(order-commands order-events inventory-commands payment-commands notification-events)
for TOPIC in "${TOPICS[@]}"; do
    /opt/kafka/bin/kafka-topics.sh --create --if-not-exists \
        --topic "$TOPIC" --bootstrap-server localhost:9092 \
        --partitions 3 --replication-factor 1 2>/dev/null && echo "  topic: $TOPIC"
done

echo ""
echo "[3/5] Elasticsearch → Kibana → Logstash..."
systemctl start elasticsearch && sleep 5
systemctl start kibana
systemctl start logstash
echo "  OK (ES cần ~30s để sẵn sàng)"

echo ""
echo "[4/5] Prometheus + Grafana..."
systemctl start prometheus
systemctl start grafana-server
echo "  OK"

echo ""
echo "[5/5] Kiểm tra ports..."
for PORT in 5432 9092 9200 5601 5044 9090 3000; do
    ss -tlnp 2>/dev/null | grep -q ":${PORT} " \
        && echo "  :${PORT} - OPEN" || echo "  :${PORT} - pending..."
done

echo ""
echo "============================================="
echo "  NODE-4 đang chạy!"
echo "  Grafana:    http://${NODE4_IP}:3000 (admin/admin)"
echo "  Kibana:     http://${NODE4_IP}:5601"
echo "  Prometheus: http://${NODE4_IP}:9090"
echo ""
echo "  → Khởi động NODE-3 tiếp theo"
echo "============================================="
