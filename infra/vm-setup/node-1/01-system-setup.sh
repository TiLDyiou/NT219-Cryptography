#!/bin/bash
set -euo pipefail

apt update && apt upgrade -y

apt install -y \
    build-essential curl wget git unzip \
    software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release \
    net-tools htop tmux jq openssl ufw netcat \
    openjdk-17-jdk

curl -fsSL https://tailscale.com/install.sh | sh
