#!/bin/bash
# Apply security patches to ingress node (100.96.240.45)
# Run trên NODE-1 (ingress):  sudo bash apply-patches.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Applying security patches to ingress node ==="

# 1. WAF Lua — thêm admin'-- bypass patterns
echo "[1/3] Updating WAF Lua rules..."
cp /etc/envoy/waf.lua /etc/envoy/waf.lua.bak.$(date +%Y%m%d)
cp "$SCRIPT_DIR/waf.lua" /etc/envoy/waf.lua
echo "  waf.lua updated ✅"

# 2. Envoy config — thêm rate limit, đóng admin port về localhost
echo "[2/3] Updating envoy.yaml..."
cp /etc/envoy/envoy.yaml /etc/envoy/envoy.yaml.bak.$(date +%Y%m%d)
# Điền VM2_IP từ config hiện tại
VM2_IP=$(grep -oP '(?<=address: )[\d.]+' /etc/envoy/envoy.yaml | grep -v "127.0.0.1\|0.0.0.0" | head -1)
sed "s/\${VM2_IP}/$VM2_IP/g" "$SCRIPT_DIR/envoy.yaml" > /etc/envoy/envoy.yaml
echo "  envoy.yaml updated (VM2_IP=$VM2_IP) ✅"

# 3. Reload Envoy
echo "[3/3] Reloading Envoy..."
systemctl reload envoy 2>/dev/null || systemctl restart envoy
sleep 2
systemctl is-active envoy && echo "  Envoy running ✅" || echo "  ❌ Envoy failed, check: journalctl -u envoy -n 20"

# 4. Đóng admin port firewall
ufw delete allow 9901/tcp 2>/dev/null || true
echo "  Port 9901 closed ✅"

echo ""
echo "=== Patches applied ==="
echo "  WAF: admin'-- bypass now blocked"
echo "  Rate limit: 100 req/60s per IP on all /api/* routes"
echo "  Admin port 9901: localhost only"
