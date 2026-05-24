#!/bin/bash
# =============================================================================
# NODE-1: INGRESS ZONE - Bước 2: Cài Nginx + Envoy + Keycloak
# Nginx phục vụ frontend, Envoy route API vào NODE-2 (Service Mesh)
# Keycloak xác thực JWT cho Envoy
#
# CẤU HÌNH: Chỉnh IP trước khi chạy
# Usage: sudo bash 02-setup-ingress.sh
# =============================================================================
set -euo pipefail

# ============================================================
VM1_IP="${VM1_IP:-192.168.64.11}"   # IP của node này (NODE-1)
VM2_IP="${VM2_IP:-192.168.64.12}"   # Service Mesh

UITSTORE_PASS="UIT_NT219_SecurePass!"
KEYCLOAK_VERSION="24.0.5"
PROJECT_DIR="/opt/uitstore"
# ============================================================

echo "============================================="
echo "  NODE-1: INGRESS ZONE"
echo "  Nginx + Envoy + Keycloak"
echo "  Route API đến VM2: ${VM2_IP}"
echo "============================================="

# =============================================================================
# 1. NGINX - Frontend static files
# =============================================================================
echo ""
echo ">>> [1/3] Cài Nginx..."

apt install -y nginx

mkdir -p /var/www/uitstore
if [ -d "${PROJECT_DIR}/frontend" ]; then
    cp -r "${PROJECT_DIR}/frontend/"* /var/www/uitstore/
    chown -R www-data:www-data /var/www/uitstore
    echo "  Frontend copied - OK"
else
    echo "  [WARNING] Không tìm thấy ${PROJECT_DIR}/frontend"
fi

cat > /etc/nginx/sites-available/uitstore <<'NGXCFG'
server {
    listen 80;
    server_name _;

    root /var/www/uitstore;
    index index.html;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Tất cả API qua Envoy Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:10000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Keycloak (auth)
    location /auth/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGXCFG

ln -sf /etc/nginx/sites-available/uitstore /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx
echo "  Nginx - OK"

# =============================================================================
# 2. KEYCLOAK 24 - Identity Provider (local trên NODE-1)
# =============================================================================
echo ""
echo ">>> [2/3] Cài Keycloak ${KEYCLOAK_VERSION}..."

# Keycloak dùng H2 embedded (đủ cho demo, không cần PostgreSQL riêng)
cd /opt
if [ ! -d "/opt/keycloak" ]; then
    wget -q "https://github.com/keycloak/keycloak/releases/download/${KEYCLOAK_VERSION}/keycloak-${KEYCLOAK_VERSION}.tar.gz"
    tar -xzf "keycloak-${KEYCLOAK_VERSION}.tar.gz"
    mv "keycloak-${KEYCLOAK_VERSION}" keycloak
    rm -f "keycloak-${KEYCLOAK_VERSION}.tar.gz"
fi

cd /opt/keycloak
bin/kc.sh build 2>/dev/null || true

cat > /etc/systemd/system/keycloak.service <<SVC
[Unit]
Description=Keycloak Identity Provider (Ingress Zone)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/keycloak
Environment=KEYCLOAK_ADMIN=admin
Environment=KEYCLOAK_ADMIN_PASSWORD=admin123
ExecStart=/opt/keycloak/bin/kc.sh start-dev
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SVC

systemctl enable keycloak
echo "  Keycloak ${KEYCLOAK_VERSION} - OK"

# =============================================================================
# 3. ENVOY PROXY - Route đến NODE-2 (Service Mesh)
# =============================================================================
echo ""
echo ">>> [3/3] Cài Envoy..."

# Cài Envoy binary
ARCH=$(dpkg --print-architecture)
if [ "$ARCH" = "arm64" ]; then
    wget -q -O /usr/local/bin/envoy \
        "https://github.com/envoyproxy/envoy/releases/download/v1.30.4/envoy-1.30.4-linux-arm64"
else
    wget -q -O /usr/local/bin/envoy \
        "https://github.com/envoyproxy/envoy/releases/download/v1.30.4/envoy-1.30.4-linux-x86_64"
fi
chmod +x /usr/local/bin/envoy

mkdir -p /etc/envoy

# Envoy chỉ route đến NODE-2 (không route trực tiếp đến NODE-3)
cat > /etc/envoy/envoy.yaml <<ENVOYCFG
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 10000
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: service_mesh
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/api/v1/catalog" }
                          route: { cluster: catalog_service }
                        - match: { prefix: "/api/v1/cart" }
                          route: { cluster: cart_service }
                        - match: { prefix: "/api/v1/orders" }
                          route: { cluster: order_service }
                        - match: { prefix: "/api/v1/inventory" }
                          route: { cluster: inventory_service }
                        - match: { prefix: "/api/v1/shipping" }
                          route: { cluster: shipping_service }
                        - match: { prefix: "/api/v1/notifications" }
                          route: { cluster: notification_service }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    # Tất cả đều trỏ vào NODE-2 (Service Mesh)
    - name: catalog_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: catalog_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: ${VM2_IP}
                      port_value: 8001

    - name: cart_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: cart_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: ${VM2_IP}
                      port_value: 8002

    - name: order_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: order_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: ${VM2_IP}
                      port_value: 8003

    - name: inventory_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: inventory_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: ${VM2_IP}
                      port_value: 8005

    - name: shipping_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: shipping_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: ${VM2_IP}
                      port_value: 8006

    - name: notification_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: notification_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: ${VM2_IP}
                      port_value: 8007
ENVOYCFG

cat > /etc/systemd/system/envoy.service <<SVC
[Unit]
Description=Envoy API Gateway (Ingress Zone)
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/envoy -c /etc/envoy/envoy.yaml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

systemctl enable envoy
echo "  Envoy - OK (route → VM2: ${VM2_IP})"

# =============================================================================
# FIREWALL - Mở port 80 cho tất cả, 8080/9901 cho admin
# =============================================================================
echo ""
echo ">>> Cấu hình firewall..."

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp    # Nginx (public)
ufw allow 8080/tcp  # Keycloak (admin + VM-2/3 JWT validation)
ufw allow 9901/tcp  # Envoy Admin (demo)

ufw reload
echo "  Firewall - OK"

systemctl daemon-reload

echo ""
echo "============================================="
echo "  NODE-1 Setup HOÀN TẤT!"
echo ""
echo "  Truy cập từ máy host:"
echo "    Frontend:    http://${VM1_IP}/"
echo "    Keycloak:    http://${VM1_IP}:8080"
echo "    Envoy Admin: http://${VM1_IP}:9901"
echo ""
echo "  Tiếp theo: sudo bash 03-start-all.sh"
echo "============================================="
