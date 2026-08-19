#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp /etc/envoy/waf.lua "/etc/envoy/waf.lua.bak.$(date +%Y%m%d)" 2>/dev/null || true
cp "$SCRIPT_DIR/waf.lua" /etc/envoy/waf.lua

cp /etc/envoy/envoy.yaml "/etc/envoy/envoy.yaml.bak.$(date +%Y%m%d)" 2>/dev/null || true
VM2_IP=$(grep -oP '(?<=address: )[\d.]+' /etc/envoy/envoy.yaml | grep -v "127.0.0.1\|0.0.0.0" | head -1)
sed "s/\${VM2_IP}/$VM2_IP/g" "$SCRIPT_DIR/envoy.yaml" > /etc/envoy/envoy.yaml

systemctl reload envoy 2>/dev/null || systemctl restart envoy
ufw delete allow 9901/tcp 2>/dev/null || true
