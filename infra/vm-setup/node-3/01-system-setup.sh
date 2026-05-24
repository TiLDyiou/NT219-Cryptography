#!/bin/bash
# =============================================================================
# NODE-3: PCI DSS ZONE - Bước 1: Thiết lập hệ thống
# Cài: Python 3.11 (payment-service) + HashiCorp Vault deps
# Usage: sudo bash 01-system-setup.sh
# =============================================================================
set -euo pipefail

echo "============================================="
echo "  NODE-3: PCI DSS ZONE - System Setup"
echo "  (payment-service + HashiCorp Vault)"
echo "============================================="

apt update && apt upgrade -y

apt install -y \
    build-essential curl wget git unzip \
    software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    net-tools htop tmux jq openssl ufw netcat

echo ""
echo ">>> Cài Python 3.11..."
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
echo "  Python $(python3.11 --version) - OK"

echo ""
echo "============================================="
echo "  Bước 1 HOÀN TẤT!"
echo "  Tiếp theo: sudo bash 02-setup-payment.sh"
echo "============================================="
