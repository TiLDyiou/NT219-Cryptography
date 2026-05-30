#!/bin/bash
# =============================================================================
# NODE-4: DATA + EVENT BUS + OBSERVABILITY - Bước 1: Thiết lập hệ thống
# Cài: Java 17 (Kafka, Elasticsearch), không cần Python
# Usage: sudo bash 01-system-setup.sh
# =============================================================================
set -euo pipefail

echo "============================================="
echo "  NODE-4: DATA + EVENT BUS + OBS - System Setup"
echo "  (PostgreSQL + Kafka + ELK + Prometheus + Grafana)"
echo "============================================="

apt update && apt upgrade -y

apt install -y \
    build-essential curl wget git unzip \
    software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    net-tools htop tmux jq openssl ufw netcat

# Java 17 cho Kafka + Elasticsearch
echo ""
echo ">>> Cài Java 17..."
apt install -y openjdk-17-jdk
echo "  $(java -version 2>&1 | head -1) - OK"

echo ""
echo ">>> Cài đặt Tailscale (Mạng riêng ảo VPN)..."
curl -fsSL https://tailscale.com/install.sh | sh
echo "  [OK] Tailscale đã cài đặt. Chú ý: Cần tự chạy 'sudo tailscale up' sau khi script này xong!"

echo ""
echo "============================================="
echo "  Bước 1 HOÀN TẤT!"
echo "  Tiếp theo: sudo bash 02-install-data-obs.sh"
echo "============================================="
