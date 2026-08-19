#!/bin/bash
set -euo pipefail

systemctl start postgresql
systemctl start zookeeper
systemctl start kafka

TOPICS=(order-commands order-events inventory-commands payment-commands notification-events)
for TOPIC in "${TOPICS[@]}"; do
    /opt/kafka/bin/kafka-topics.sh --create --if-not-exists \
        --topic "$TOPIC" --bootstrap-server localhost:9092 \
        --partitions 3 --replication-factor 1 2>/dev/null || true
done

systemctl start elasticsearch
systemctl start kibana
systemctl start logstash
systemctl start prometheus
systemctl start grafana-server
