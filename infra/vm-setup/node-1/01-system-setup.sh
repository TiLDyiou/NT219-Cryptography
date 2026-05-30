#!/bin/bash
# =============================================================================
# NODE-1: INGRESS ZONE - Bước 1: Thiết lập hệ thống
# Cài: Python 3.11, Java 17 (cho Keycloak)
# Usage: sudo bash 01-system-setup.sh
# =============================================================================
set -euo pipefail

echo "============================================="
echo "  NODE-1: INGRESS ZONE - System Setup"
echo "  (Nginx + Envoy + Keycloak)"
echo "============================================="

apt update && apt upgrade -y

apt install -y \
    build-essential curl wget git unzip \
    software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    net-tools htop tmux jq openssl ufw netcat

# Java 17 cho Keycloak
echo ""
echo ">>> Cài Java 17 (cho Keycloak)..."
apt install -y openjdk-17-jdk
echo "  $(java -version 2>&1 | head -1) - OK"

echo ""
echo ">>> Cài đặt Tailscale (Mạng riêng ảo VPN)..."
curl -fsSL https://tailscale.com/install.sh | sh
echo "  [OK] Tailscale đã cài đặt. Chú ý: Cần tự chạy 'sudo tailscale up' sau khi script này xong!"

echo ""
echo "============================================="
echo "  Bước 1 HOÀN TẤT!"
echo "  Tiếp theo: sudo bash 02-setup-ingress.sh"
echo "============================================="
