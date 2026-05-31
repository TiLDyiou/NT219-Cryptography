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
VM1_IP="${VM1_IP:-192.168.122.11}" # IP của node này (NODE-1)
VM2_IP="${VM2_IP:-192.168.122.12}" # Service Mesh

UITSTORE_PASS="123456"
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

mkdir -p /var/cache/nginx/static
cat >/etc/nginx/nginx.conf <<'NGXCFG'
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;

    # Preserve X-Forwarded-Proto from upstream proxy (e.g. ngrok),
    # fallback to $scheme for direct access
    map $http_x_forwarded_proto $passed_proto {
        ""      $scheme;
        default $http_x_forwarded_proto;
    }
    default_type  application/octet-stream;

    log_format cdn '$remote_addr - [$time_local] "$request" '
                   '$status $body_bytes_sent '
                   '"$http_referer" "$http_user_agent" '
                   'cache_status=$upstream_cache_status '
                   'rt=$request_time';

    access_log /var/log/nginx/access.log cdn;
    sendfile on; tcp_nopush on; tcp_nodelay on;
    keepalive_timeout 65;

    gzip on; gzip_vary on; gzip_proxied any;
    gzip_comp_level 6; gzip_min_length 256;
    gzip_types text/plain text/css text/javascript application/javascript
               application/json application/xml image/svg+xml font/woff2;

    proxy_cache_path /var/cache/nginx/static levels=1:2
                     keys_zone=static_cache:10m max_size=500m
                     inactive=7d use_temp_path=off;

    limit_req_zone $binary_remote_addr zone=cdn_limit:10m rate=30r/s;

    server {
        listen 80;
        server_name _;
        root /var/www/uitstore;

        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

        location ~ /\. { deny all; return 403; }

        location /health {
            return 200 '{"status":"OK","service":"nginx"}';
            add_header Content-Type application/json always;
        }

        location /static/ {
            alias /var/www/uitstore/static/;
            autoindex off;
            limit_req zone=cdn_limit burst=50 nodelay;
            location ~* \.(js|css|woff2?|ttf|eot|svg|ico)$ {
                expires 365d;
                add_header Cache-Control "public, max-age=31536000, immutable" always;
                gzip_static on;
            }
            location ~* \.(jpg|jpeg|png|gif|webp|avif)$ {
                expires 30d;
                add_header Cache-Control "public, max-age=2592000" always;
            }
            add_header Cache-Control "public, max-age=604800" always;
        }

        location /api/ {
            proxy_http_version 1.1;
            add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
            proxy_pass http://127.0.0.1:10000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
            proxy_connect_timeout 10s;
            proxy_read_timeout 30s;
        }

        location /auth/ {
            proxy_http_version 1.1;
            add_header Cache-Control "no-store, private" always;
            proxy_pass http://127.0.0.1:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $passed_proto;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
NGXCFG
nginx -t 2>/dev/null && echo "  nginx.conf syntax OK" || echo "  [ERROR] nginx.conf syntax lỗi"
systemctl enable nginx
echo "  Nginx - OK"

cat >/tmp/realm-export-vm.json <<REALM
{
  "realm": "nt219",
  "enabled": true,
  "loginTheme": "uitstore",
  "displayName": "NT219 Ecommerce",
  "displayNameHtml": "<b>NT219 Ecommerce</b>",
  "sslRequired": "external",
  "registrationAllowed": true,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": true,
  "failureFactor": 5,
  "waitIncrementSeconds": 60,
  "accessTokenLifespan": 300,
  "accessTokenLifespanForImplicitFlow": 900,
  "ssoSessionIdleTimeout": 1800,
  "ssoSessionMaxLifespan": 36000,
  "refreshTokenMaxReuse": 0,
  "revokeRefreshToken": true,
  "clients": [
    {
      "clientId": "frontend-spa",
      "name": "Frontend SPA",
      "description": "Web single-page application (OAuth2 PKCE flow)",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "serviceAccountsEnabled": false,
      "redirectUris": ["http://${VM1_IP}/*"],
      "webOrigins": ["+"],
      "protocol": "openid-connect",
      "attributes": {
        "pkce.code.challenge.method": "S256",
        "access.token.lifespan": "300",
        "client.session.idle.timeout": "1800"
      }
    },
    {
      "clientId": "catalog-service", "name": "Catalog Service",
      "enabled": true, "publicClient": false,
      "standardFlowEnabled": false, "serviceAccountsEnabled": true,
      "secret": "catalog-client-secret-changeme", "protocol": "openid-connect", "attributes": {}
    },
    {
      "clientId": "cart-service", "name": "Cart Service",
      "enabled": true, "publicClient": false,
      "standardFlowEnabled": false, "serviceAccountsEnabled": true,
      "secret": "cart-client-secret-changeme", "protocol": "openid-connect", "attributes": {}
    },
    {
      "clientId": "order-service", "name": "Order Service",
      "enabled": true, "publicClient": false,
      "standardFlowEnabled": false, "serviceAccountsEnabled": true,
      "secret": "order-client-secret-changeme", "protocol": "openid-connect", "attributes": {}
    },
    {
      "clientId": "payment-service", "name": "Payment Service",
      "enabled": true, "publicClient": false,
      "standardFlowEnabled": false, "serviceAccountsEnabled": true,
      "secret": "payment-client-secret-changeme", "protocol": "openid-connect", "attributes": {}
    },
    {
      "clientId": "test-cli", "name": "Test CLI",
      "description": "Dev/test only — password grant. REMOVE in production.",
      "enabled": true, "publicClient": true,
      "standardFlowEnabled": false, "directAccessGrantsEnabled": true,
      "serviceAccountsEnabled": false, "protocol": "openid-connect",
      "attributes": {"access.token.lifespan": "300"}
    }
  ],
  "roles": {
    "realm": [
      {"name": "user",    "description": "Regular customer"},
      {"name": "admin",   "description": "Store administrator"},
      {"name": "analyst", "description": "Fraud/BI analyst — read-only"}
    ]
  },
  "users": [
    {
      "username": "testuser", "enabled": true,
      "email": "testuser@nt219.local", "firstName": "Test", "lastName": "User",
      "credentials": [{"type": "password", "value": "testpass123", "temporary": false}],
      "realmRoles": ["user"]
    },
    {
      "username": "admin_store", "enabled": true,
      "email": "admin@nt219.local", "firstName": "Store", "lastName": "Admin",
      "credentials": [{"type": "password", "value": "adminpass123", "temporary": false}],
      "realmRoles": ["admin", "user"]
    },
    {
      "username": "fraud_analyst", "enabled": true,
      "email": "analyst@nt219.local", "firstName": "Fraud", "lastName": "Analyst",
      "credentials": [{"type": "password", "value": "analystpass123", "temporary": false}],
      "realmRoles": ["analyst"]
    }
  ]
}
REALM
echo "  realm-export → /tmp/realm-export-vm.json"

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
if [ -d "${PROJECT_DIR}/infra/keycloak-themes/uitstore" ]; then
    mkdir -p /opt/keycloak/themes
    cp -r "${PROJECT_DIR}/infra/keycloak-themes/uitstore" /opt/keycloak/themes/
    echo "  Keycloak theme uitstore - OK"
fi
bin/kc.sh build 2>/dev/null || true

cat >/etc/systemd/system/keycloak.service <<SVC
[Unit]
Description=Keycloak Identity Provider (Ingress Zone)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/keycloak
Environment=KEYCLOAK_ADMIN=admin
Environment=KEYCLOAK_ADMIN_PASSWORD=admin123
ExecStart=/opt/keycloak/bin/kc.sh start-dev --http-relative-path=/auth --proxy-headers=xforwarded
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

mkdir -p /etc/envoy/certs

# TLS certs tự ký cho Envoy (dùng IP thật của NODE-1)
openssl genrsa -out /etc/envoy/certs/ca.key 4096 2>/dev/null
openssl req -new -x509 -days 3650 -key /etc/envoy/certs/ca.key \
    -out /etc/envoy/certs/ca.crt \
    -subj "/C=VN/ST=Ho Chi Minh/O=NT219 Capstone/CN=NT219 Root CA" 2>/dev/null
openssl genrsa -out /etc/envoy/certs/server.key 2048 2>/dev/null
cat >/tmp/san.cnf <<SANCNF
[req]
default_bits = 2048
prompt = no
distinguished_name = dn
req_extensions = v3_req
[dn]
C = VN
ST = Ho Chi Minh
O = NT219 Capstone
CN = ${VM1_IP}
[v3_req]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
[alt_names]
DNS.1 = localhost
IP.1 = ${VM1_IP}
IP.2 = 127.0.0.1
SANCNF
openssl req -new -key /etc/envoy/certs/server.key \
    -out /tmp/server.csr -config /tmp/san.cnf 2>/dev/null
openssl x509 -req -days 365 -in /tmp/server.csr \
    -CA /etc/envoy/certs/ca.crt -CAkey /etc/envoy/certs/ca.key -CAcreateserial \
    -out /etc/envoy/certs/server.crt -extensions v3_req -extfile /tmp/san.cnf 2>/dev/null
rm -f /tmp/server.csr /tmp/san.cnf /etc/envoy/certs/ca.srl
echo "  TLS certs - OK (/etc/envoy/certs/)"

# WAF Lua script — chạy trước JWT validation, block SQLi/XSS/path-traversal/scanner
cat >/etc/envoy/waf.lua <<'WAFLUA'
local sqli_patterns = {
  "union%s+select","union%s+all%s+select","select%s+.*%s+from",
  "insert%s+into","delete%s+from","drop%s+table","drop%s+database",
  "alter%s+table","exec%s*%(","execute%s*%(","xp_cmdshell",
  "0x[0-9a-fA-F]+","'%s*or%s+'","'%s*or%s+1%s*=%s*1","1%s*=%s*1",
  "';%s*--","sleep%s*%(","benchmark%s*%(","waitfor%s+delay",
  "char%s*%(","concat%s*%(","group_concat%s*%(","load_file%s*%(",
  "into%s+outfile","into%s+dumpfile","information_schema",
  "pg_catalog","pg_sleep",
}
local xss_patterns = {
  "<script","</script","javascript%s*:","vbscript%s*:","on%a+%s*=",
  "expression%s*%(","url%s*%(%s*['\"]?javascript","eval%s*%(",
  "alert%s*%(","prompt%s*%(","confirm%s*%(","document%.cookie",
  "document%.domain","document%.write","window%.location",
  "innerHTML","fromCharCode","<iframe","<embed","<object",
  "<svg%s","<img%s+[^>]*onerror",
}
local traversal_patterns = {
  "%.%.%/","%.%.\\","%%2e%%2e","%%252e%%252e","%%c0%%ae","%%c1%%9c",
  "/etc/passwd","/etc/shadow","/proc/self","/var/log","boot%.ini","win%.ini",
}
local bad_agents = {
  "sqlmap","nikto","nessus","masscan","nmap","dirbuster",
  "gobuster","wfuzz","hydra","burpsuite","zgrab","nuclei",
}

local function url_decode(str)
  if not str then return "" end
  return str:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
end

local function check_patterns(input, patterns, category)
  if not input or input == "" then return nil end
  local decoded = url_decode(input):lower()
  for _, pattern in ipairs(patterns) do
    if decoded:find(pattern) then
      return { category = category, pattern = pattern }
    end
  end
  return nil
end

local function blocked_response(reason, category, request_id)
  return string.format(
    '{"error":"blocked_by_waf","reason":"%s","category":"%s","request_id":"%s"}',
    reason, category, request_id or "unknown"
  )
end

function envoy_on_request(request_handle)
  local request_id = request_handle:headers():get("x-request-id") or "no-id"
  local client_ip  = request_handle:headers():get("x-forwarded-for") or "unknown"
  local method     = request_handle:headers():get(":method") or "?"
  local path       = request_handle:headers():get(":path") or "/"
  local user_agent = request_handle:headers():get("user-agent") or ""


  local ua_lower = user_agent:lower()
  for _, agent in ipairs(bad_agents) do
    if ua_lower:find(agent, 1, true) then
      request_handle:logWarn(string.format("[WAF] BLOCKED scanner ip=%s agent=%s", client_ip, agent))
      request_handle:respond(
        {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="scanner"},
        blocked_response("Automated scanner detected", "scanner", request_id))
      return
    end
  end

  local match = check_patterns(path, traversal_patterns, "path_traversal")
  if match then
    request_handle:logWarn(string.format("[WAF] BLOCKED path_traversal ip=%s path=%s", client_ip, path:sub(1,100)))
    request_handle:respond(
      {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="path_traversal"},
      blocked_response("Path traversal attempt detected", "path_traversal", request_id))
    return
  end

  match = check_patterns(path, sqli_patterns, "sqli")
  if match then
    request_handle:logWarn(string.format("[WAF] BLOCKED sqli ip=%s path=%s", client_ip, path:sub(1,100)))
    request_handle:respond(
      {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="sqli"},
      blocked_response("SQL injection attempt detected", "sqli", request_id))
    return
  end

  match = check_patterns(path, xss_patterns, "xss")
  if match then
    request_handle:logWarn(string.format("[WAF] BLOCKED xss ip=%s path=%s", client_ip, path:sub(1,100)))
    request_handle:respond(
      {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="xss"},
      blocked_response("XSS attempt detected", "xss", request_id))
    return
  end

  if method == "POST" or method == "PUT" or method == "PATCH" then
    -- Chỉ quét body dạng JSON; multipart/binary (upload ảnh) không áp dụng rule text SQLi/XSS
    local content_type = (request_handle:headers():get("content-type") or ""):lower()
    local scan_body = content_type:find("application/json", 1, true) ~= nil
      or content_type:find("application/merge-patch+json", 1, true) ~= nil
      or content_type:find("application/vnd.api+json", 1, true) ~= nil
    if scan_body then
      local body = request_handle:body()
      if body then
        local body_str = body:getBytes(0, math.min(body:length(), 8192))
        match = check_patterns(body_str, sqli_patterns, "sqli_body")
        if match then
          request_handle:respond(
            {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="sqli_body"},
            blocked_response("SQL injection in body detected", "sqli_body", request_id))
          return
        end
        match = check_patterns(body_str, xss_patterns, "xss_body")
        if match then
          request_handle:respond(
            {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="xss_body"},
            blocked_response("XSS in body detected", "xss_body", request_id))
          return
        end
      end
    end
  end

  request_handle:headers():add("x-waf-status", "passed")
end

function envoy_on_response(response_handle)
  response_handle:headers():add("X-Content-Type-Options", "nosniff")
  response_handle:headers():add("X-Frame-Options", "DENY")
  response_handle:headers():add("X-XSS-Protection", "1; mode=block")
  response_handle:headers():add("Referrer-Policy", "strict-origin-when-cross-origin")
end
WAFLUA
echo "  WAF Lua - OK (/etc/envoy/waf.lua)"

# Envoy chỉ route đến NODE-2 (không route trực tiếp đến NODE-3)
cat >/etc/envoy/envoy.yaml <<ENVOYCFG
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
                        - match: { prefix: "/auth/" }
                          route: { cluster: keycloak_service }
                        - match: { prefix: "/api/v1/catalog" }
                          route: { cluster: catalog_service, prefix_rewrite: "/api/v1" }
                        - match: { prefix: "/api/v1/cart" }
                          route: { cluster: cart_service, prefix_rewrite: "/api/v1" }
                        - match: { prefix: "/api/v1/orders" }
                          route: { cluster: order_service, prefix_rewrite: "/api/v1" }
                        - match: { prefix: "/api/v1/inventory" }
                          route: { cluster: inventory_service, prefix_rewrite: "/api/v1" }
                        - match: { prefix: "/api/v1/shipping" }
                          route: { cluster: shipping_service, prefix_rewrite: "/api/v1" }
                        - match: { prefix: "/api/v1/notifications" }
                          route: { cluster: notification_service, prefix_rewrite: "/api/v1" }
                http_filters:
                  - name: envoy.filters.http.lua
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                      default_source_code:
                        filename: /etc/envoy/waf.lua
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: keycloak_service
      connect_timeout: 5s
      type: STRICT_DNS
      load_assignment:
        cluster_name: keycloak_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8080

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
                      port_value: 8007

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
                      port_value: 8008
ENVOYCFG

cat >/etc/systemd/system/envoy.service <<SVC
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
ufw allow 80/tcp   # Nginx (public)
ufw allow 8080/tcp # Keycloak (admin + VM-2/3 JWT validation)
ufw allow 9901/tcp # Envoy Admin (demo)

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
