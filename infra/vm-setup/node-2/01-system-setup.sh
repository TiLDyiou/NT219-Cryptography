#!/bin/bash
set -euo pipefail

apt update && apt upgrade -y

apt install -y \
    build-essential curl wget git unzip \
    software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    net-tools htop tmux jq openssl ufw netcat

add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

curl -fsSL https://tailscale.com/install.sh | sh
