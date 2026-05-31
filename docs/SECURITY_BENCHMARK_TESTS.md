# Security Benchmark Tests — Enmerce Platform (NT219)

> **Môi trường:** Lab / University PoC  
> **Ngày tạo:** 2026-05-31  
> **Phiên bản hệ thống:** dựa trên security audit tháng 5/2026  
> **Frameworks tham chiếu:** OWASP ASVS v4.0 L2, OWASP API Security Top 10 2023, PCI DSS v4.0

---

## Mục lục

1. [Cấu hình môi trường](#0-cấu-hình-môi-trường)
2. [Chuẩn benchmark tham chiếu](#chuẩn-benchmark-tham-chiếu)
3. [Automated Tools — Chạy ngay không cần hệ thống chạy](#automated-tools--chạy-ngay-không-cần-hệ-thống-chạy)
4. [Experiment 1 — Token Replay & JWT Security](#experiment-1--token-replay--jwt-security)
5. [Experiment 2 — Payment Fraud Simulation](#experiment-2--payment-fraud-simulation)
6. [Experiment 3 — API Abuse & Rate Limiting](#experiment-3--api-abuse--rate-limiting)
7. [Experiment 4 — Key Rotation & Recovery Drills](#experiment-4--key-rotation--recovery-drills)
8. [Experiment 5 — Supply Chain & CI/CD Integrity](#experiment-5--supply-chain--cicd-integrity)
9. [Performance Benchmarks](#performance-benchmarks)
10. [Tổng hợp kết quả](#tổng-hợp-kết-quả)

---

## Chuẩn benchmark tham chiếu

### OWASP ASVS v4.0 — Framework chính

**Application Security Verification Standard** — checklist có 3 cấp độ, được công nhận rộng rãi nhất cho web app/API. Hệ thống e-commerce này áp dụng **Level 2**, một số phần payment áp dụng **Level 3**.

| Level | Mô tả | Áp dụng cho |
|---|---|---|
| **L1** | Automated scan, basic hygiene | Tất cả app |
| **L2** | Manual test + automated, standard assurance | **E-commerce — mức này** |
| **L3** | High-security, formal verification | Banking, HSM, PCI scope |

> Tải checklist Excel: https://github.com/OWASP/ASVS/releases

Mapping ASVS vào hệ thống này:

| ASVS Chapter | Nội dung | Mức áp dụng | Trạng thái |
|---|---|---|---|
| V2 — Authentication | Keycloak, MFA, brute-force | L2 | Partial |
| V3 — Session Management | JWT lifetime, refresh rotation | L2 | **FAIL** — không check exp |
| V4 — Access Control | RBAC, IDOR | L2 | **FAIL** — IDOR payment |
| V5 — Validation | Input validation, SQLi | L1 | PASS (Pydantic + ORM) |
| V6 — Cryptography | AES-GCM, key length, Vault | L2/L3 | Partial |
| V7 — Error Handling | Logging, PII masking | L2 | **FAIL** — PII in logs |
| V8 — Data Protection | TDE, FLE, PAN | L2/L3 | Partial |
| V9 — Communication | TLS, HSTS, mTLS | L2 | **FAIL** — HTTP only |
| V10 — Malicious Code | Dependency scan, secrets | L2 | **FAIL** — hardcoded keys |
| V11 — Business Logic | Payment idempotency, fraud | L2 | PASS |
| V13 — API | CORS, rate limit, versioning | L2 | **FAIL** — wildcard CORS |
| V14 — Configuration | Defaults, secrets mgmt | L1 | **FAIL** — weak passwords |

---

### OWASP API Security Top 10 (2023)

Áp dụng trực tiếp cho kiến trúc microservices REST API:

| ID | Threat | Trạng thái hệ thống |
|---|---|---|
| **API1** | Broken Object Level Auth (IDOR) | **FAIL** — `/refund`, `/payments/{id}` không check owner |
| **API2** | Broken Authentication | **FAIL** — JWT không verify signature |
| **API3** | Broken Object Property Level Auth | Cần kiểm tra (test 2.4) |
| **API4** | Unrestricted Resource Consumption | **FAIL** — không có rate limit trên `/api/*` |
| **API5** | Broken Function Level Auth | Partial — HMAC disabled by default |
| **API6** | Unrestricted Access to Sensitive Flows | PASS — idempotency key triển khai |
| **API7** | Server Side Request Forgery | Cần kiểm tra |
| **API8** | Security Misconfiguration | **FAIL** — CORS `*`, Vault disabled, HTTP |
| **API9** | Improper Inventory Management | Cần kiểm tra — `/docs` exposed |
| **API10** | Unsafe Consumption of APIs | PASS — webhook signature verified |

---

### PCI DSS v4.0 — Cho phần Payment

Hệ thống dùng Stripe sandbox → SAQ A-EP applicable:

| Requirement | Nội dung | Trạng thái |
|---|---|---|
| Req 2.2 | Không dùng default credentials | **FAIL** — `admin123`, `uitstore_dev`, `123456` |
| Req 3.3 | Không lưu SAD/PAN sau auth | **PASS** — Stripe tokenization |
| Req 4.2.1 | TLS 1.2+ cho cardholder data | **FAIL** — HTTP only |
| Req 6.3.3 | Patch vulnerabilities | Cần pip-audit/Trivy |
| Req 7.2 | Least-privilege access | Partial |
| Req 8.3.6 | MFA cho admin access | Keycloak TOTP — cần verify bật chưa |
| Req 10.2 | Audit log events | **PASS** — Kafka audit + HMAC signed |
| Req 12.3.2 | Targeted risk analysis | STRIDE threat model có sẵn |

---

## Automated Tools — Chạy ngay không cần hệ thống chạy

Các tool sau chạy được ngay trên codebase mà không cần deploy.

### Tool 1 — Bandit (Python SAST, chuẩn CWE)

Kiểm tra static code theo CWE IDs: B106 (hardcoded password), B105 (hardcoded token), B501 (weak TLS), B608 (SQL injection).

```bash
pip install bandit

# Scan toàn bộ services — xuất JSON để lưu kết quả
bandit -r /Users/nergy/NT219-Cryptography/services \
  --exclude "*/tests/*,*/__pycache__/*" \
  -f json -o /tmp/bandit_report.json

# Xem summary trên terminal (chỉ medium+ severity)
bandit -r /Users/nergy/NT219-Cryptography/services \
  --exclude "*/tests/*" \
  -ll -ii

# Xem report đẹp
python3 -c "
import json
r = json.load(open('/tmp/bandit_report.json'))
metrics = r['metrics']['_totals']
print(f\"HIGH severity:   {metrics['SEVERITY.HIGH']}\")
print(f\"MEDIUM severity: {metrics['SEVERITY.MEDIUM']}\")
print(f\"LOW severity:    {metrics['SEVERITY.LOW']}\")
print()
for issue in r['results']:
    if issue['issue_severity'] in ('HIGH', 'MEDIUM'):
        print(f\"{issue['issue_severity']:6} | {issue['test_id']} | {issue['filename'].split('services/')[-1]}:{issue['line_number']}\")
        print(f\"       | {issue['issue_text'][:80]}\")
"
```

**Kết quả mong đợi:**
| Severity | Target | Ghi chú |
|---|---|---|
| HIGH | 0 unfixed | Hardcoded passwords, weak crypto |
| MEDIUM | < 5 | Review từng cái |

---

### Tool 2 — pip-audit (Dependency CVE scan)

Quét CVE database của NIST NVD cho tất cả Python packages.

```bash
pip install pip-audit

# Scan từng service
for service in catalog-service cart-service order-service payment-service \
               inventory-service shipping-service noti-service; do
  echo ""
  echo "══════════ $service ══════════"
  pip-audit \
    -r /Users/nergy/NT219-Cryptography/services/$service/requirements.txt \
    --format columns \
    2>/dev/null || echo "  (no vulnerabilities found)"
done

# Xuất JSON tổng hợp
pip-audit \
  -r /Users/nergy/NT219-Cryptography/services/payment-service/requirements.txt \
  --format json > /tmp/pip_audit_payment.json

python3 -c "
import json
data = json.load(open('/tmp/pip_audit_payment.json'))
vulns = [d for d in data.get('dependencies',[]) if d.get('vulns')]
print(f'Vulnerable packages: {len(vulns)}')
for d in vulns:
    for v in d['vulns']:
        print(f\"  {d['name']}=={d['version']} | {v['id']} | {v['description'][:60]}...\")
" 2>/dev/null
```

**Kết quả mong đợi:** 0 CVE với severity CRITICAL/HIGH trong production dependencies.

---

### Tool 3 — Trivy (Container + filesystem scan)

```bash
# macOS
brew install trivy

# Scan filesystem (không cần build image)
trivy fs /Users/nergy/NT219-Cryptography/services/payment-service \
  --severity HIGH,CRITICAL \
  --format table

# Scan toàn bộ project
trivy fs /Users/nergy/NT219-Cryptography \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  --format json -o /tmp/trivy_report.json

# Tìm secrets trong code (Trivy secret scan)
trivy fs /Users/nergy/NT219-Cryptography \
  --scanners secret \
  --format table 2>/dev/null
```

**Trivy secret scan** tự động tìm patterns như Stripe keys (`sk_live_`), AWS keys, private keys trong source code.

---

### Tool 4 — OWASP ZAP (DAST — cần hệ thống đang chạy)

```bash
# API scan dùng OpenAPI spec (FastAPI tự generate /openapi.json)
docker run --rm \
  -v /tmp:/zap/wrk:rw \
  --network host \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py \
    -t http://192.168.122.11/openapi.json \
    -f openapi \
    -r /zap/wrk/zap_api_report.html \
    -J /zap/wrk/zap_api_report.json \
    -z "-config scanner.strength=HIGH"

# Baseline scan (passive only, không tấn công)
docker run --rm \
  -v /tmp:/zap/wrk:rw \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t http://192.168.122.11 \
    -r /zap/wrk/zap_baseline_report.html

echo "Report saved: /tmp/zap_api_report.html"
```

ZAP tự động check các OWASP Top 10 issues, map ra CWE IDs chuẩn.

---

### Tool 5 — testssl.sh (TLS/SSL benchmark — khi bật HTTPS)

```bash
# Chạy khi hệ thống có TLS
curl -sL https://testssl.sh/testssl.sh -o /tmp/testssl.sh
chmod +x /tmp/testssl.sh

# Full scan với PCI DSS grading
bash /tmp/testssl.sh \
  --pcigrading \
  --json /tmp/testssl_result.json \
  https://192.168.122.11

# Chỉ kiểm tra cipher suites và protocols
bash /tmp/testssl.sh \
  --protocols \
  --ciphers \
  --vulnerable \
  https://192.168.122.11
```

**Điều testssl.sh kiểm tra:**
- TLS 1.0/1.1 phải bị tắt (FAIL hiện tại vì dùng HTTP)
- Cipher suites yếu (RC4, DES, 3DES, EXPORT)
- Forward Secrecy (ECDHE)
- HSTS, certificate validity

---

### Tool 6 — gitleaks (Secret scan trong git history)

```bash
# macOS
brew install gitleaks

# Scan toàn bộ git history
gitleaks detect \
  --source /Users/nergy/NT219-Cryptography \
  --report-format json \
  --report-path /tmp/gitleaks_report.json \
  -v

# Xem kết quả
python3 -c "
import json
try:
    leaks = json.load(open('/tmp/gitleaks_report.json'))
    print(f'Secrets found in git history: {len(leaks)}')
    for l in leaks[:10]:
        print(f\"  {l.get('RuleID','?'):20} | {l.get('File','?')} | commit {l.get('Commit','?')[:8]}\")
except:
    print('No leaks found or file empty')
"
```

---

### Tóm tắt — Tools vs Chuẩn tham chiếu

| Tool | Chuẩn | Cần hệ thống chạy | Output |
|---|---|---|---|
| **Bandit** | CWE, OWASP | Không | JSON/terminal |
| **pip-audit** | NIST NVD (CVE) | Không | Table/JSON |
| **Trivy** | CVE + secret patterns | Không | Table/JSON |
| **gitleaks** | Custom + OWASP | Không | JSON |
| **OWASP ZAP** | OWASP Top 10, CWE | **Có** | HTML/JSON |
| **testssl.sh** | PCI DSS, NIST | **Có (HTTPS)** | JSON |
| **ASVS checklist** | OWASP ASVS v4 | Manual | Excel scorecard |

---

## 0. Cấu hình môi trường

```bash
# ── Địa chỉ hệ thống ──────────────────────────────────────────
export BASE_URL="http://192.168.122.11"          # Nginx public entry
export GW_URL="http://192.168.122.11:10000"      # Envoy direct
export KC_URL="http://192.168.122.11:8080"        # Keycloak
export CATALOG_URL="http://192.168.122.12:8001"  # catalog-service VM2
export CART_URL="http://192.168.122.12:8002"
export ORDER_URL="http://192.168.122.12:8003"
export PAYMENT_URL="http://192.168.122.12:8004"  # internal only
export INVENTORY_URL="http://192.168.122.12:8005"

# ── Lấy access token hợp lệ từ Keycloak ───────────────────────
export TOKEN=$(curl -s -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=nt219-frontend-spa&username=testuser&password=testpass" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token: ${TOKEN:0:40}..."

# ── Lấy merchant token (cho catalog) ──────────────────────────
export MERCHANT_TOKEN=$(curl -s -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=nt219-frontend-spa&username=merchant1&password=merchant123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

> **Yêu cầu cài đặt:** `curl`, `python3`, `jq`, `wrk`, `redis-cli`  
> Chạy tất cả test trong lab, không nhắm vào hệ thống thật.

---

## Experiment 1 — Token Replay & JWT Security

**Mục tiêu:** Kiểm tra hệ thống có chặn được token giả mạo, token hết hạn, và replay từ thiết bị khác không.

**Mapping STRIDE:** S-IDP-01, S-FE-02, T-IDP-01, E-IDP-02

---

### Test 1.1 — JWT alg:none Attack

**Mô tả:** Tấn công bằng cách tạo JWT với `"alg":"none"` — không cần chữ ký.

```bash
# Tạo JWT giả với alg:none
FAKE_HEADER=$(echo -n '{"alg":"none","typ":"JWT"}' | base64 | tr '+/' '-_' | tr -d '=')
FAKE_PAYLOAD=$(echo -n '{"sub":"attacker-merchant-id","preferred_username":"attacker","iat":9999999999}' \
  | base64 | tr '+/' '-_' | tr -d '=')
FAKE_JWT="${FAKE_HEADER}.${FAKE_PAYLOAD}."  # chữ ký rỗng

echo "Fake JWT: $FAKE_JWT"

# Gửi request đến catalog-service với JWT giả
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $FAKE_JWT" \
  "$BASE_URL/api/v1/catalog/merchant/products"
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `401 Unauthorized` | `200 OK` (do không verify signature) | **FAIL — lỗ hổng** |

**Ghi chú:** Catalog-service hiện chỉ base64-decode JWT mà không verify chữ ký RS256 từ Keycloak ([catalog-service/app/api/dependencies.py:22-41](../services/catalog-service/app/api/dependencies.py)).

---

### Test 1.2 — JWT Claim Forgery (arbitrary merchant_id)

**Mô tả:** Tạo JWT hợp lệ nhưng thay `sub` claim thành merchant ID của người khác.

```bash
# Dùng JWT thật, decode payload, thay sub claim, tạo lại JWT không ký
REAL_PAYLOAD=$(echo $TOKEN | cut -d. -f2)
# Padding
REAL_PAYLOAD_PADDED="${REAL_PAYLOAD}$(python3 -c "print('=' * (4 - len('$REAL_PAYLOAD') % 4) if len('$REAL_PAYLOAD') % 4 else '')")"

# Decode và thay merchant_id
python3 << 'EOF'
import base64, json, sys

token = open('/dev/stdin').read().strip() if not sys.stdin.isatty() else ""
import os
token = os.environ.get('TOKEN', '')

parts = token.split('.')
payload_b64 = parts[1] + '=' * (4 - len(parts[1]) % 4)
payload = json.loads(base64.urlsafe_b64decode(payload_b64))

original_sub = payload.get('sub')
payload['sub'] = 'victim-merchant-00000000-0000-0000-0000-000000000001'

new_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
fake_jwt = f"{parts[0]}.{new_payload}."
print(f"Original sub: {original_sub}")
print(f"Forged JWT (first 80 chars): {fake_jwt[:80]}...")
EOF

# Test với forged JWT
FORGED_PAYLOAD=$(python3 -c "
import base64, json, os
token = os.environ['TOKEN']
parts = token.split('.')
p = parts[1] + '=' * (4 - len(parts[1]) % 4)
payload = json.loads(base64.urlsafe_b64decode(p))
payload['sub'] = 'victim-merchant-00000000-0000-0000-0000-000000000001'
print(base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode())
")
HEADER=$(echo $TOKEN | cut -d. -f1)
FORGED_JWT="${HEADER}.${FORGED_PAYLOAD}."

curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $FORGED_JWT" \
  "$BASE_URL/api/v1/catalog/merchant/products"
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `401 Unauthorized` | `200 OK` với data của victim | **FAIL — critical** |

---

### Test 1.3 — JWT Expiration Not Enforced

**Mô tả:** Tạo JWT với `exp` đã qua, kiểm tra hệ thống có từ chối không.

```bash
# Tạo JWT với exp = thời điểm trong quá khứ
EXPIRED_PAYLOAD=$(python3 -c "
import base64, json, os, time
token = os.environ['TOKEN']
parts = token.split('.')
p = parts[1] + '=' * (4 - len(parts[1]) % 4)
payload = json.loads(base64.urlsafe_b64decode(p))
payload['exp'] = int(time.time()) - 7200  # 2 giờ trước
print(base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode())
")
HEADER=$(echo $TOKEN | cut -d. -f1)
EXPIRED_JWT="${HEADER}.${EXPIRED_PAYLOAD}."

curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $EXPIRED_JWT" \
  "$BASE_URL/api/v1/catalog/merchant/products"
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `401 Unauthorized` | `200 OK` | **FAIL** |

---

### Test 1.4 — Refresh Token Replay After Rotation

**Mô tả:** Dùng lại refresh token cũ sau khi đã rotate — hệ thống Keycloak phải revoke.

```bash
# Bước 1: lấy token pair đầu tiên
TOKEN_RESPONSE=$(curl -s -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=nt219-frontend-spa&username=testuser&password=testpass")

REFRESH_TOKEN_1=$(echo $TOKEN_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh_token'])")

# Bước 2: rotate — dùng refresh_token_1 để lấy cặp mới
curl -s -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=refresh_token&client_id=nt219-frontend-spa&refresh_token=$REFRESH_TOKEN_1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('New pair obtained:', 'access_token' in d)"

# Bước 3: replay refresh_token_1 (đã được sử dụng)
echo "=== Replay old refresh token ==="
curl -s -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=refresh_token&client_id=nt219-frontend-spa&refresh_token=$REFRESH_TOKEN_1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Result:', d.get('error', 'SUCCESS - VULNERABLE'))"
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `error: invalid_grant` | Phụ thuộc cấu hình Keycloak | Cần kiểm tra |

---

### Test 1.5 — Token Valid After Logout

**Mô tả:** Logout rồi vẫn dùng access token cũ — phải bị reject (token revocation).

```bash
ACCESS_TOKEN=$TOKEN

# Bước 1: gọi API trước khi logout → phải 200
echo "=== Before logout ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE_URL/api/v1/catalog/public/products"

# Bước 2: logout
curl -s -X POST "$KC_URL/realms/nt219/protocol/openid-connect/logout" \
  -d "client_id=nt219-frontend-spa&refresh_token=$REFRESH_TOKEN" \
  -w "Logout status: %{http_code}\n"

# Bước 3: dùng lại token cũ sau logout → phải 401
echo "=== After logout ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE_URL/api/v1/catalog/merchant/products"
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| Step 1: `200`, Step 3: `401` | Step 1: `200`, Step 3: `200` (access token không bị revoke) | **Cần kiểm tra** |

---

### Metrics — Experiment 1

| Metric | Target | Ghi chú |
|---|---|---|
| % forged JWT bị reject | **100%** | Tất cả 1.1, 1.2, 1.3 phải fail |
| Thời gian phát hiện invalid token | < 50ms | Đo bằng `curl -w "%{time_total}"` |
| Refresh token replay bị reject | **100%** | Keycloak revocation |

---

## Experiment 2 — Payment Fraud Simulation

**Mục tiêu:** Kiểm tra tokenization, idempotency, webhook signature, và phát hiện double-spend.

**Mapping STRIDE:** S-PAY-01, S-PAY-02, T-PAY-01, T-PAY-02, I-PAY-01

---

### Test 2.1 — Stripe Webhook Without Signature

**Mô tả:** Gửi webhook giả không có header `Stripe-Signature`.

```bash
FAKE_WEBHOOK='{
  "id": "evt_fake_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_fake_123",
      "amount": 100000,
      "status": "succeeded"
    }
  }
}'

echo "=== Test: No Stripe-Signature header ==="
curl -s -o /tmp/webhook_result.json -w "HTTP Status: %{http_code}\n" \
  -X POST "$PAYMENT_URL/api/v1/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -d "$FAKE_WEBHOOK"
cat /tmp/webhook_result.json | python3 -m json.tool 2>/dev/null || cat /tmp/webhook_result.json
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `400 Bad Request` | `400 Bad Request` | **PASS** |

---

### Test 2.2 — Webhook With Forged HMAC Signature

**Mô tả:** Gửi webhook với `Stripe-Signature` sai — verify phải fail.

```bash
TIMESTAMP=$(date +%s)
FAKE_PAYLOAD='{"id":"evt_forged","type":"payment_intent.succeeded"}'
FAKE_SIG="t=${TIMESTAMP},v1=fakesignature0000000000000000000000000000000000000000000000000"

echo "=== Test: Forged Stripe-Signature ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -X POST "$PAYMENT_URL/api/v1/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: $FAKE_SIG" \
  -d "$FAKE_PAYLOAD"
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `400 Bad Request` | `400 Bad Request` | **PASS** |

---

### Test 2.3 — Payment Request Replay (Idempotency)

**Mô tả:** Gửi cùng một payment charge request 3 lần — chỉ được charge 1 lần.

```python
# Lưu thành file: experiments/test_idempotency.py
import asyncio, httpx, json, time, uuid, hmac, hashlib

PAYMENT_URL = "http://192.168.122.12:8004"
HMAC_SECRET = "nt219-shared-internal-hmac-secret-32b!"
IDEMPOTENCY_KEY = str(uuid.uuid4())  # cùng key cho cả 3 requests

def sign_request(method, path, body_bytes, secret):
    timestamp = str(int(time.time()))
    nonce = str(uuid.uuid4())
    canonical = f"{method}\n{path}\n{timestamp}\n{nonce}\n"
    canonical += hashlib.sha256(body_bytes).hexdigest()
    sig = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    return {"X-Signature": sig, "X-Timestamp": timestamp, "X-Nonce": nonce}

async def charge_once(client, attempt_num):
    path = "/api/v1/payments/charge"
    body = {
        "order_id": "order-test-idempotency-001",
        "user_id": "user-test-001",
        "amount": "150000",
        "currency": "VND",
        "payment_method_type": "cod",
        "idempotency_key": IDEMPOTENCY_KEY,
    }
    body_bytes = json.dumps(body, separators=(",", ":")).encode()
    headers = sign_request("POST", path, body_bytes, HMAC_SECRET)
    headers["Content-Type"] = "application/json"

    t0 = time.time()
    resp = await client.post(PAYMENT_URL + path, content=body_bytes, headers=headers)
    elapsed = (time.time() - t0) * 1000
    print(f"Attempt {attempt_num}: HTTP {resp.status_code} | {elapsed:.0f}ms | "
          f"payment_id={resp.json().get('data', {}).get('payment_id', 'N/A')[:16]}...")
    return resp.status_code, resp.json()

async def main():
    print(f"Idempotency key: {IDEMPOTENCY_KEY}")
    print("Sending 3 identical payment requests...\n")
    async with httpx.AsyncClient(timeout=10) as client:
        r1 = await charge_once(client, 1)
        r2 = await charge_once(client, 2)
        r3 = await charge_once(client, 3)

    payment_ids = set([
        r1[1].get('data', {}).get('payment_id'),
        r2[1].get('data', {}).get('payment_id'),
        r3[1].get('data', {}).get('payment_id'),
    ])
    print(f"\nUnique payment_ids: {len(payment_ids)}")
    print("PASS: idempotency works" if len(payment_ids) == 1 else "FAIL: multiple charges!")

asyncio.run(main())
```

```bash
python3 experiments/test_idempotency.py
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| 3 lần trả về cùng 1 `payment_id` | 3 lần trả về cùng 1 `payment_id` | **PASS** |

---

### Test 2.4 — Amount Tampering

**Mô tả:** Frontend gửi checkout với `unit_price` thấp hơn giá thật — order-service phải dùng giá từ DB, không từ request.

```bash
# Gửi checkout với unit_price = 1 VND thay vì giá thật
TAMPERED_CHECKOUT='{
  "cart_id": "cart-test-001",
  "payment_method_type": "cod",
  "shipping_fee": "0",
  "items": [{
    "product_id": "prod-test-00000000-0000-0000-0000-000000000001",
    "merchant_id": "merch-test-00000000-0000-0000-0000-000000000001",
    "sku": "TEST-SKU-001",
    "product_name": "Test Product",
    "quantity": 1,
    "unit_price": "1"
  }],
  "shipping_address": {
    "full_name": "Test User",
    "phone": "0909000000",
    "address_line1": "123 Test St",
    "city": "Ho Chi Minh"
  }
}'

echo "=== Amount tampering test (unit_price=1 VND) ==="
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST "$BASE_URL/api/v1/orders/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-User-Id: user-test-001" \
  -H "Content-Type: application/json" \
  -d "$TAMPERED_CHECKOUT" \
  | python3 -m json.tool 2>/dev/null
```

**Kiểm tra kết quả:** Nếu order được tạo với `total_amount = 1` thì FAIL. Nếu hệ thống lấy giá từ catalog hoặc reject thì PASS.

| Kết quả mong đợi | Cách kiểm tra |
|---|---|
| `total_amount` trong response = giá thật từ catalog | So sánh `total_amount` vs giá thật của sản phẩm |

---

### Test 2.5 — IDOR: Refund Payment Của Người Khác

**Mô tả:** User A cố refund payment của User B — đây là lỗ hổng đã được xác nhận trong audit.

```bash
# Bước 1: Tạo payment hợp lệ (với user-A)
echo "=== Step 1: Create payment for User A ==="
CHARGE_BODY='{"order_id":"order-user-a-001","user_id":"user-a","amount":"100000","currency":"VND","payment_method_type":"cod","idempotency_key":"ik-user-a-001"}'
PAYMENT_ID=$(curl -s -X POST "$PAYMENT_URL/api/v1/payments/charge" \
  -H "Content-Type: application/json" -H "X-User-Id: user-a" \
  -d "$CHARGE_BODY" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('payment_id','NOT_FOUND'))")

echo "Payment ID of User A: $PAYMENT_ID"

# Bước 2: User B cố refund payment của User A (không có user check)
echo "=== Step 2: User B attempts to refund User A's payment ==="
REFUND_BODY="{\"payment_id\":\"$PAYMENT_ID\",\"amount\":\"100000\",\"reason\":\"IDOR test\"}"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST "$PAYMENT_URL/api/v1/payments/refund" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-b" \
  -d "$REFUND_BODY"

# Bước 3: Bất kỳ ai đọc payment details không cần auth
echo "=== Step 3: Unauthenticated access to payment details ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  "$PAYMENT_URL/api/v1/payments/$PAYMENT_ID"
```

| Endpoint | Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|---|
| `POST /refund` (user B) | `403 Forbidden` | `200 OK` (refund thành công) | **FAIL — critical IDOR** |
| `GET /payments/{id}` (no auth) | `401 Unauthorized` | `200 OK` | **FAIL — no auth** |

---

### Test 2.6 — PAN Không Được Lưu Trong DB

**Mô tả:** Sau khi checkout, kiểm tra DB không chứa PAN (card number) dạng plaintext.

```bash
# Kết nối vào DB và tìm PAN patterns
docker exec -it payment-db psql -U uitstore -d payment_db << 'EOF'
-- Tìm cột có thể chứa card number
SELECT column_name, table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%card%' OR column_name ILIKE '%pan%'
       OR column_name ILIKE '%number%' OR column_name ILIKE '%cvv%');

-- Kiểm tra payment_methods table
SELECT
  psp_payment_method_id,  -- phải là pm_xxx (Stripe token)
  card_last4,             -- chỉ 4 số cuối
  card_fingerprint,       -- hash
  billing_name_encrypted IS NOT NULL as name_encrypted,
  billing_email_encrypted IS NOT NULL as email_encrypted
FROM payment_methods LIMIT 5;
EOF
```

| Kết quả mong đợi | Trạng thái |
|---|---|
| `psp_payment_method_id` bắt đầu bằng `pm_` | **PASS** |
| Không có cột nào chứa 16-digit card number | **PASS** |
| `billing_name_encrypted` là binary (không readable) | **PASS** |

---

### Metrics — Experiment 2

| Metric | Target | Công thức |
|---|---|---|
| Webhook forge rejection rate | **100%** | Test 2.1 + 2.2 |
| Idempotency collision prevention | **100%** | Test 2.3: 1 unique payment_id / 3 requests |
| IDOR vulnerability confirmed | Documented | Test 2.5 — cần fix trước production |
| Checkout latency với tokenization | < 2000ms p95 | Đo bằng wrk (xem Performance section) |

---

## Experiment 3 — API Abuse & Rate Limiting

**Mục tiêu:** Đo khả năng phát hiện và chặn credential stuffing, brute-force, và API flooding.

**Mapping STRIDE:** S-IDP-01, S-IDP-03, D-GW-01, D-IDP-01

---

### Test 3.1 — Credential Stuffing Simulation

**Mô tả:** Gửi 50 login request liên tiếp với username/password sai — hệ thống phải lockout hoặc CAPTCHA.

```bash
# Script giả lập credential stuffing (chỉ chạy trong lab)
echo "=== Credential stuffing simulation ==="
LOCKOUT_AT=0
for i in $(seq 1 50); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
    -d "grant_type=password&client_id=nt219-frontend-spa&username=testuser&password=wrong_pass_$i" \
    -m 5)

  if [ "$HTTP_CODE" = "429" ] || [ "$HTTP_CODE" = "423" ]; then
    LOCKOUT_AT=$i
    echo "Account locked/rate-limited at attempt #$i (HTTP $HTTP_CODE)"
    break
  fi

  if [ "$((i % 10))" = "0" ]; then
    echo "Attempt $i: HTTP $HTTP_CODE (no lockout yet)"
  fi
done

if [ $LOCKOUT_AT -eq 0 ]; then
  echo "FAIL: No lockout after 50 attempts"
else
  echo "PASS: Lockout triggered at attempt #$LOCKOUT_AT"
fi
```

| Kết quả mong đợi | Metric |
|---|---|
| Lockout / rate-limit sau ≤ 10 failed attempts | `LOCKOUT_AT` ≤ 10 |
| Response time tăng dần (progressive delay) | Đo `time_total` mỗi 10 requests |

---

### Test 3.2 — Brute-force Password Detection

**Mô tả:** Tấn công cùng 1 account với nhiều password — Keycloak phải lock account.

```bash
TARGET_USER="testuser"

# Gửi 20 wrong passwords cho cùng 1 user
echo "=== Brute-force on single account: $TARGET_USER ==="
for i in $(seq 1 20); do
  RESULT=$(curl -s \
    -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
    -d "grant_type=password&client_id=nt219-frontend-spa&username=$TARGET_USER&password=brute_$i" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','success'), d.get('error_description','')[:50])" 2>/dev/null)
  echo "  Attempt $i: $RESULT"
done

# Thử đăng nhập đúng sau khi bị brute-force
echo "=== Verify account lockout (correct password should also fail if locked) ==="
curl -s -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=nt219-frontend-spa&username=$TARGET_USER&password=testpass" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Account status:', d.get('error', 'OK - LOGIN SUCCEEDED'))"
```

| Kết quả mong đợi | Trạng thái |
|---|---|
| Account bị lock sau N failures (N ≤ 5 theo best practice) | Phụ thuộc Keycloak brute-force policy |
| Đăng nhập đúng cũng fail khi bị lock | Keycloak default: **có** nếu brute-force protection bật |

---

### Test 3.3 — Rate Limit trên API Gateway

**Mô tả:** Flood endpoint `/api/v1/orders/checkout` để kiểm tra rate limiting tại Envoy/Nginx.

```bash
# Dùng wrk để flood checkout endpoint (30 giây, 50 connections)
# Yêu cầu: cài wrk (brew install wrk / apt install wrk)

cat > /tmp/checkout_flood.lua << 'LUAEOF'
wrk.method = "POST"
wrk.body   = '{"cart_id":"cart-flood-test","payment_method_type":"cod","shipping_fee":"0","items":[{"product_id":"prod-1","merchant_id":"merch-1","sku":"SKU-1","product_name":"Test","quantity":1,"unit_price":"100"}],"shipping_address":{"full_name":"Test","phone":"0909","address_line1":"123","city":"HCM"}}'
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Authorization"] = "Bearer " .. (os.getenv("TOKEN") or "")
wrk.headers["X-User-Id"] = "flood-test-user"
LUAEOF

echo "=== Rate limiting test: 50 concurrent connections, 30 seconds ==="
wrk -t4 -c50 -d30s \
    --script /tmp/checkout_flood.lua \
    "$BASE_URL/api/v1/orders/checkout" \
    --latency 2>&1 | tee /tmp/rate_limit_result.txt

# Đếm số 429 responses
echo ""
echo "=== Checking for rate limit responses ==="
grep -E "Non-2xx|errors" /tmp/rate_limit_result.txt || echo "No error stats found in wrk output"
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| 429 responses xuất hiện sau ngưỡng | Chỉ có rate limit trên `/static/` (30r/s) | **FAIL — không có rate limit trên `/api/*`** |

---

### Test 3.4 — User Enumeration

**Mô tả:** Kiểm tra response "user not found" vs "wrong password" có giống nhau không.

```bash
echo "=== User Enumeration Test ==="

# Login với user không tồn tại
RESP_NONEXIST=$(curl -s -w "\nHTTP:%{http_code}\nTime:%{time_total}" \
  -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=nt219-frontend-spa&username=user_does_not_exist_xyz&password=anypass")

# Login với user tồn tại nhưng sai password
RESP_WRONGPASS=$(curl -s -w "\nHTTP:%{http_code}\nTime:%{time_total}" \
  -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=nt219-frontend-spa&username=testuser&password=wrong_password")

echo "Non-existent user response:"
echo "$RESP_NONEXIST" | python3 -c "import sys,json; lines=sys.stdin.read().split('\n'); body=lines[0]; print(json.loads(body).get('error_description',''));" 2>/dev/null

echo "Wrong password response:"
echo "$RESP_WRONGPASS" | python3 -c "import sys,json; lines=sys.stdin.read().split('\n'); body=lines[0]; print(json.loads(body).get('error_description',''));" 2>/dev/null
```

| Kết quả mong đợi | Trạng thái |
|---|---|
| Cả 2 trả về message giống nhau: `"Invalid user credentials"` | Keycloak default: **PASS** |
| Response time tương đương (không leakage qua timing) | Cần đo và so sánh |

---

### Test 3.5 — CORS Wildcard Exploitation

**Mô tả:** Request từ origin độc hại với credentials — phải bị reject nếu CORS đúng.

```bash
echo "=== CORS wildcard test from evil origin ==="
curl -s -v \
  -H "Origin: https://evil-attacker.com" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v1/catalog/public/products" 2>&1 \
  | grep -E "Access-Control|HTTP/|< " | head -20
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `Access-Control-Allow-Origin` không chứa `evil-attacker.com` | `Access-Control-Allow-Origin: *` | **FAIL** |

---

### Test 3.6 — WAF SQL Injection Detection

**Mô tả:** Gửi SQL injection payload qua API — WAF phải block.

```bash
echo "=== WAF SQLi test ==="
SQL_PAYLOADS=(
  "' OR '1'='1"
  "' UNION SELECT * FROM users--"
  "'; DROP TABLE orders;--"
  "1; SELECT pg_sleep(5)--"
)

for payload in "${SQL_PAYLOADS[@]}"; do
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$payload'))")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/api/v1/catalog/public/products?search=$encoded")
  echo "Payload: $(echo $payload | head -c 30)... → HTTP $HTTP_CODE"
done
```

| Kết quả mong đợi | Kết quả hiện tại | Trạng thái |
|---|---|---|
| `403 Forbidden` cho tất cả SQLi payloads | WAF Lua rules active | **Cần kiểm tra** |

---

### Test 3.7 — WAF Scanner Detection

**Mô tả:** Gửi request với User-Agent của công cụ tấn công — WAF phải block.

```bash
echo "=== WAF scanner detection ==="
BAD_AGENTS=("sqlmap/1.7" "nikto/2.1.6" "Nessus" "masscan/1.0" "dirbuster")

for agent in "${BAD_AGENTS[@]}"; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: $agent" \
    "$BASE_URL/api/v1/catalog/public/products")
  echo "User-Agent: $agent → HTTP $HTTP_CODE"
done
```

| Kết quả mong đợi | Trạng thái |
|---|---|
| `403 Forbidden` cho tất cả bad user-agents | **Cần kiểm tra** |

---

### Metrics — Experiment 3

| Metric | Target | Công thức |
|---|---|---|
| Brute-force lockout threshold | ≤ 10 attempts | Test 3.1, 3.2 |
| API rate limit threshold | Có 429 responses | Test 3.3: requests/sec trước khi 429 |
| WAF SQLi block rate | **100%** payloads bị block | Test 3.6 |
| User enumeration leakage | Không phân biệt được | Test 3.4 |
| CORS enforcement | Reject evil origins | Test 3.5 |

---

## Experiment 4 — Key Rotation & Recovery Drills

**Mục tiêu:** Đo thời gian rotate keys, validate recovery procedures, kiểm tra graceful degradation.

**Mapping STRIDE:** T-KMS-01, I-KMS-01, I-KMS-02, D-KMS-01

---

### Test 4.1 — Vault Seal/Unseal Drill

**Mô tả:** Seal Vault → services bị ảnh hưởng → unseal → đo thời gian recovery.

```bash
# ── Chạy trên node-3 (Vault host) ──

echo "=== BEFORE SEAL: Test crypto operation ==="
T_START=$(date +%s%3N)
curl -s "$PAYMENT_URL/health" | python3 -m json.tool
T_HEALTH=$(date +%s%3N)
echo "Health check latency: $((T_HEALTH - T_START))ms"

# Seal Vault
echo ""
echo "=== SEALING VAULT ==="
T_SEAL=$(date +%s%3N)
vault operator seal
echo "Vault sealed at: $(date)"

# Kiểm tra service có degraded không
echo ""
echo "=== TESTING SERVICE DEGRADATION ==="
for i in $(seq 1 5); do
  curl -s -o /dev/null -w "Attempt $i: HTTP %{http_code}\n" \
    "$PAYMENT_URL/health"
  sleep 2
done

# Unseal Vault
echo ""
echo "=== UNSEALING VAULT ==="
vault operator unseal $UNSEAL_KEY_1
vault operator unseal $UNSEAL_KEY_2
vault operator unseal $UNSEAL_KEY_3
T_UNSEAL=$(date +%s%3N)
echo "Vault unsealed. Time sealed: $((T_UNSEAL - T_SEAL))ms"

# Verify recovery
echo ""
echo "=== VERIFY RECOVERY ==="
sleep 5
curl -s "$PAYMENT_URL/health" | python3 -m json.tool
```

| Metric | Target | Ghi chú |
|---|---|---|
| MTTR (Mean Time To Recover) | < 5 phút | Từ khi unseal đến service healthy |
| Service degradation mode | Graceful (không crash) | Log error thay vì panic |

---

### Test 4.2 — Vault Transit Key Rotation

**Mô tả:** Rotate encryption key trong Vault Transit — dữ liệu cũ vẫn decrypt được với auto-rewrap.

```bash
# ── Chạy trên node-3 ──

echo "=== Step 1: Encrypt data với key version hiện tại ==="
vault write transit/encrypt/payment-fle-key \
  plaintext=$(echo -n "test-billing-name@example.com" | base64) \
  > /tmp/original_ciphertext.txt
cat /tmp/original_ciphertext.txt

CIPHERTEXT=$(vault write -field=ciphertext transit/encrypt/payment-fle-key \
  plaintext=$(echo -n "test-billing-name@example.com" | base64))
echo "Ciphertext: $CIPHERTEXT"

echo ""
echo "=== Step 2: Rotate key ==="
vault write -f transit/keys/payment-fle-key/rotate
vault read transit/keys/payment-fle-key | grep latest_version

echo ""
echo "=== Step 3: Rewrap ciphertext với key mới ==="
NEW_CIPHERTEXT=$(vault write -field=ciphertext transit/rewrap/payment-fle-key \
  ciphertext="$CIPHERTEXT")
echo "New ciphertext: $NEW_CIPHERTEXT"

echo ""
echo "=== Step 4: Decrypt với key mới (verify) ==="
DECRYPTED=$(vault write -field=plaintext transit/decrypt/payment-fle-key \
  ciphertext="$NEW_CIPHERTEXT" | base64 -d)
echo "Decrypted: $DECRYPTED"

if [ "$DECRYPTED" = "test-billing-name@example.com" ]; then
  echo "PASS: Data integrity maintained after key rotation"
else
  echo "FAIL: Data corrupted after rotation!"
fi
```

| Metric | Target |
|---|---|
| Decrypt sau rotate | Thành công, data nguyên vẹn |
| Key rotation latency | Đo bằng `time vault write -f transit/keys/payment-fle-key/rotate` |
| Rewrap latency | < 100ms cho 1 record |

---

### Test 4.3 — KMS Latency Benchmark (Envelope Encryption)

**Mô tả:** Đo overhead của envelope encryption qua Vault Transit so với encrypt thẳng bằng local key.

```python
# Lưu thành: experiments/test_kms_latency.py
import asyncio, time, statistics, httpx, base64, json

VAULT_URL = "http://192.168.122.13:8200"  # node-3
VAULT_TOKEN = "your-vault-token-here"
ITERATIONS = 100

async def encrypt_via_vault(client, plaintext: str) -> float:
    """Đo thời gian encrypt 1 field qua Vault Transit."""
    payload = base64.b64encode(plaintext.encode()).decode()
    t0 = time.perf_counter()
    resp = await client.post(
        f"{VAULT_URL}/v1/transit/encrypt/payment-fle-key",
        headers={"X-Vault-Token": VAULT_TOKEN},
        json={"plaintext": payload}
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000
    assert resp.status_code == 200, f"Vault error: {resp.text}"
    return elapsed_ms

async def benchmark_vault_encrypt():
    latencies = []
    async with httpx.AsyncClient(timeout=10) as client:
        # Warmup
        for _ in range(5):
            await encrypt_via_vault(client, "warmup-data")

        # Actual benchmark
        for i in range(ITERATIONS):
            ms = await encrypt_via_vault(client, f"billing-email-test-{i}@example.com")
            latencies.append(ms)

    latencies.sort()
    print(f"\n=== Vault Transit Encrypt Latency ({ITERATIONS} iterations) ===")
    print(f"  Min:    {min(latencies):.2f}ms")
    print(f"  Median: {statistics.median(latencies):.2f}ms")
    print(f"  p95:    {latencies[int(ITERATIONS*0.95)]:.2f}ms")
    print(f"  p99:    {latencies[int(ITERATIONS*0.99)]:.2f}ms")
    print(f"  Max:    {max(latencies):.2f}ms")
    print(f"\nKMS calls @ 10 req/s → est. {10*statistics.median(latencies):.0f}ms latency added per second")

asyncio.run(benchmark_vault_encrypt())
```

```bash
python3 experiments/test_kms_latency.py
```

| Metric | Target | Ghi chú |
|---|---|---|
| Vault encrypt median | < 10ms (local network) | Phụ thuộc VM setup |
| Vault encrypt p99 | < 50ms | |
| Added latency per checkout | < 100ms (2-3 FLE fields) | Acceptable |

---

### Test 4.4 — HMAC Key Compromise & Rotation

**Mô tả:** Simulate key compromise — rotate HMAC key và verify requests cũ bị reject.

```bash
OLD_KEY="nt219-shared-internal-hmac-secret-32b!"
NEW_KEY="nt219-rotated-hmac-key-$(date +%Y%m%d)-new!!"

echo "=== Simulate HMAC Key Compromise & Rotation ==="
echo ""
echo "Step 1: Request với key cũ (should work if HMAC disabled)"
python3 - << PYEOF
import hmac, hashlib, time, uuid, json, urllib.request

path = "/api/v1/payments/charge"
body = json.dumps({"order_id":"test-001","user_id":"u1","amount":"100","currency":"VND","payment_method_type":"cod","idempotency_key":"ik-test-001"}, separators=(',',':')).encode()
ts = str(int(time.time()))
nonce = str(uuid.uuid4())
canonical = f"POST\n{path}\n{ts}\n{nonce}\n" + hashlib.sha256(body).hexdigest()
sig = hmac.new("$OLD_KEY".encode(), canonical.encode(), hashlib.sha256).hexdigest()

req = urllib.request.Request("http://192.168.122.12:8004" + path,
    data=body, method="POST",
    headers={"Content-Type":"application/json","X-Signature":sig,"X-Timestamp":ts,"X-Nonce":nonce})
try:
    resp = urllib.request.urlopen(req, timeout=5)
    print(f"Old key → HTTP {resp.status}: PASS (key works)")
except Exception as e:
    print(f"Old key → Error: {e}")
PYEOF

echo ""
echo "Step 2: Sau khi rotate, request với key cũ phải bị reject"
echo "  (Đây là manual step: update LOCAL_CRYPTO_SECRET trong .env, restart service)"
echo "  → Sau khi restart, chạy lại test trên → phải nhận HTTP 401"
```

---

### Metrics — Experiment 4

| Metric | Target |
|---|---|
| MTTR after Vault seal | < 5 phút |
| Key rotation + rewrap time | < 10 phút (toàn bộ records) |
| Vault p99 latency | < 50ms |
| Checkout overhead với KMS | < 100ms thêm vào |

---

## Experiment 5 — Supply Chain & CI/CD Integrity

**Mục tiêu:** Kiểm tra artifact signing và deployment gating chống tampered images.

**Mapping STRIDE:** S-CI-01, S-CI-02, T-CI-01, I-CI-01

---

### Test 5.1 — Unsigned Docker Image Deployment

**Mô tả:** Cố deploy container image chưa được ký — admission controller phải reject (nếu có cấu hình).

```bash
# Kiểm tra xem có image signing policy không
echo "=== Check image signing policy ==="
docker inspect registry.local/enmerce/payment-service:latest \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null \
  || echo "No signing labels found"

# Kiểm tra cosign signature (nếu cosign được cài)
if command -v cosign &> /dev/null; then
  cosign verify --key /etc/cosign/cosign.pub \
    registry.local/enmerce/payment-service:latest 2>&1 \
    || echo "FAIL: Image not signed or signature invalid"
else
  echo "cosign not installed — skip signature verification"
fi

# So sánh checksum image hiện tại với expected
EXPECTED_DIGEST="sha256:$(cat /etc/enmerce/expected-image-digests.txt | grep payment-service | awk '{print $2}')"
ACTUAL_DIGEST=$(docker inspect registry.local/enmerce/payment-service:latest --format '{{.Id}}' 2>/dev/null)
echo "Expected: $EXPECTED_DIGEST"
echo "Actual:   $ACTUAL_DIGEST"
[ "$EXPECTED_DIGEST" = "$ACTUAL_DIGEST" ] && echo "PASS: Image digest matches" || echo "FAIL: Image tampered!"
```

---

### Test 5.2 — Dependency Vulnerability Scan

**Mô tả:** Quét dependencies tìm CVE đã biết.

```bash
echo "=== Dependency vulnerability scan ==="

# Dùng pip-audit (Python)
for service in catalog-service cart-service order-service payment-service inventory-service shipping-service noti-service; do
  echo ""
  echo "--- $service ---"
  pip-audit -r /Users/nergy/NT219-Cryptography/services/$service/requirements.txt \
    --format=columns 2>/dev/null \
    || echo "pip-audit not installed — run: pip install pip-audit"
done

# Hoặc dùng Snyk (nếu có)
# snyk test --all-projects --severity-threshold=high
```

---

### Test 5.3 — Secrets trong Git History

**Mô tả:** Kiểm tra git history có chứa secrets không.

```bash
cd /Users/nergy/NT219-Cryptography

echo "=== Scan git history for exposed secrets ==="

# Tìm .env files trong git history
echo "--- .env files ever committed ---"
git log --all --full-history -- "**/.env" "*.env" --oneline 2>/dev/null | head -20

# Tìm patterns của secrets trong toàn bộ commits
echo ""
echo "--- Secret patterns in history ---"
git log --all -p --follow -- "*.env" 2>/dev/null \
  | grep -E "(SECRET|PASSWORD|API_KEY|TOKEN|sk_live|whsec_)" \
  | grep "^+" | grep -v "^+++" | head -30

# Tìm sk_live (real Stripe keys) hoặc keys không phải _mock
echo ""
echo "--- Real API keys (non-mock) ---"
git log --all -p 2>/dev/null \
  | grep -E "sk_live_|pk_live_|rk_live_" | head -10
```

| Kết quả mong đợi | Trạng thái |
|---|---|
| Không tìm thấy `sk_live_` keys | Cần kiểm tra |
| `.env` files không có trong git history | .gitignore hiện tại bảo vệ files mới, nhưng cần kiểm tra history cũ |

---

### Metrics — Experiment 5

| Metric | Target |
|---|---|
| CVE severity HIGH+ trong dependencies | 0 unfixed HIGH/CRITICAL |
| Real credentials trong git history | 0 |
| Docker images với valid signature | 100% production images |

---

## Performance Benchmarks

**Mục tiêu:** Đo latency/throughput trade-offs của các security controls.

---

### Bench P1 — Checkout End-to-End Latency

```bash
cat > /tmp/checkout_bench.lua << 'LUAEOF'
math.randomseed(os.time())

wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Authorization"] = "Bearer " .. (os.getenv("TOKEN") or "")
wrk.headers["X-User-Id"] = "bench-user-001"

local counter = 0
request = function()
  counter = counter + 1
  local body = string.format([[{
    "cart_id": "cart-bench-%d",
    "payment_method_type": "cod",
    "shipping_fee": "0",
    "items": [{"product_id":"prod-001","merchant_id":"merch-001","sku":"SKU-001","product_name":"Test","quantity":1,"unit_price":"100000"}],
    "shipping_address": {"full_name":"Bench User","phone":"0909000000","address_line1":"123 Test","city":"HCM"}
  }]], counter)
  return wrk.format(nil, nil, nil, body)
end
LUAEOF

echo "=== Checkout latency benchmark: 10 concurrent, 30 seconds ==="
wrk -t2 -c10 -d30s \
    --script /tmp/checkout_bench.lua \
    "$BASE_URL/api/v1/orders/checkout" \
    --latency | tee /tmp/checkout_bench_result.txt
```

**Kết quả cần ghi lại:**

| Metric | Baseline (không có security) | Với HMAC+FLE | Với HMAC+FLE+Vault |
|---|---|---|---|
| Median latency | ___ ms | ___ ms | ___ ms |
| p95 latency | ___ ms | ___ ms | ___ ms |
| p99 latency | ___ ms | ___ ms | ___ ms |
| Throughput (req/s) | ___ | ___ | ___ |

---

### Bench P2 — KMS Calls vs Direct Encryption

```python
# experiments/bench_encryption.py
import time, os, statistics
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITERATIONS = 1000
LOCAL_KEY = AESGCM(os.urandom(32))
PLAINTEXT = b"user@example.com"

# Benchmark 1: Local AES-GCM (không có KMS)
def local_encrypt():
    nonce = os.urandom(12)
    return LOCAL_KEY.encrypt(nonce, PLAINTEXT, None)

t0 = time.perf_counter()
local_times = []
for _ in range(ITERATIONS):
    t = time.perf_counter()
    local_encrypt()
    local_times.append((time.perf_counter() - t) * 1000)

local_times.sort()
print(f"Local AES-GCM ({ITERATIONS} iterations):")
print(f"  Median: {statistics.median(local_times):.4f}ms")
print(f"  p99:    {local_times[int(ITERATIONS*0.99)]:.4f}ms")
print(f"  Throughput: {ITERATIONS/(time.perf_counter()-t0):.0f} ops/sec")
print()
print("Compare with Vault Transit results from test_kms_latency.py")
print("Expected overhead: Vault adds ~5-15ms per encrypt call")
```

```bash
python3 experiments/bench_encryption.py
```

---

### Bench P3 — HMAC Signing Overhead per Request

```python
# experiments/bench_hmac.py
import hmac, hashlib, time, uuid, statistics

ITERATIONS = 10000
SECRET = b"nt219-shared-internal-hmac-secret-32b!"
BODY = b'{"order_id":"test","amount":"100000","currency":"VND"}'

def sign_request(body):
    ts = str(int(time.time()))
    nonce = str(uuid.uuid4())
    canonical = f"POST\n/api/v1/payments/charge\n{ts}\n{nonce}\n"
    canonical += hashlib.sha256(body).hexdigest()
    return hmac.new(SECRET, canonical.encode(), hashlib.sha256).hexdigest()

times = []
for _ in range(ITERATIONS):
    t = time.perf_counter()
    sign_request(BODY)
    times.append((time.perf_counter() - t) * 1000)

times.sort()
print(f"HMAC-SHA256 signing overhead ({ITERATIONS} iterations):")
print(f"  Median: {statistics.median(times):.4f}ms")
print(f"  p99:    {times[int(ITERATIONS*0.99)]:.4f}ms")
print(f"  → Overhead per API call: negligible (< 0.1ms)")
```

---

### Bench P4 — Authentication Latency (Keycloak Token Issuance)

```bash
echo "=== Token issuance latency (50 measurements) ==="
> /tmp/auth_latencies.txt
for i in $(seq 1 50); do
  curl -s -o /dev/null \
    -w "%{time_total}\n" \
    -X POST "$KC_URL/realms/nt219/protocol/openid-connect/token" \
    -d "grant_type=password&client_id=nt219-frontend-spa&username=testuser&password=testpass" \
    >> /tmp/auth_latencies.txt
done

# Tính percentiles
python3 << 'EOF'
import statistics
with open('/tmp/auth_latencies.txt') as f:
    times = [float(l.strip())*1000 for l in f if l.strip()]
times.sort()
n = len(times)
print(f"\nKeycloak token issuance latency ({n} measurements):")
print(f"  Min:    {min(times):.0f}ms")
print(f"  Median: {statistics.median(times):.0f}ms")
print(f"  p95:    {times[int(n*0.95)]:.0f}ms")
print(f"  p99:    {times[int(n*0.99)]:.0f}ms")
print(f"  Max:    {max(times):.0f}ms")
EOF
```

---

### Bench P5 — Throughput Under Concurrent Checkouts

```bash
echo "=== Throughput test: ramping concurrency ==="
for CONC in 1 5 10 20 50; do
  echo -n "Concurrency=$CONC: "
  wrk -t2 -c$CONC -d10s \
      --script /tmp/checkout_bench.lua \
      "$BASE_URL/api/v1/orders/checkout" 2>/dev/null \
      | grep -E "Requests/sec:|Latency" | tr '\n' ' '
  echo ""
done
```

**Bảng ghi kết quả:**

| Concurrency | Req/sec | Median latency | p99 latency | Errors |
|---|---|---|---|---|
| 1 | | | | |
| 5 | | | | |
| 10 | | | | |
| 20 | | | | |
| 50 | | | | |

---

## Tổng hợp kết quả

### Security Score Card

| Experiment | Test | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| **1. Token** | 1.1 alg:none attack | 401 | _(điền sau)_ | |
| | 1.2 JWT claim forgery | 401 | _(điền sau)_ | |
| | 1.3 Expired JWT rejected | 401 | _(điền sau)_ | |
| | 1.4 Refresh token rotation | `invalid_grant` | _(điền sau)_ | |
| | 1.5 Token valid after logout | 401 | _(điền sau)_ | |
| **2. Payment** | 2.1 Webhook no signature | 400 | _(điền sau)_ | |
| | 2.2 Webhook forged HMAC | 400 | _(điền sau)_ | |
| | 2.3 Idempotency (3 requests) | 1 unique payment_id | _(điền sau)_ | |
| | 2.4 Amount tampering | price từ catalog | _(điền sau)_ | |
| | 2.5 IDOR refund | 403 | _(điền sau)_ | |
| | 2.6 No PAN in DB | no raw PAN | _(điền sau)_ | |
| **3. API** | 3.1 Credential stuffing lockout | lockout ≤ 10 | _(điền sau)_ | |
| | 3.3 Rate limit checkout | 429 responses | _(điền sau)_ | |
| | 3.4 User enumeration | same error msg | _(điền sau)_ | |
| | 3.5 CORS wildcard | reject evil origin | _(điền sau)_ | |
| | 3.6 WAF SQLi | 403 | _(điền sau)_ | |
| | 3.7 WAF scanner | 403 | _(điền sau)_ | |
| **4. Keys** | 4.1 Vault recovery MTTR | < 5 min | _(điền sau)_ | |
| | 4.2 Key rotation integrity | data preserved | _(điền sau)_ | |
| | 4.3 KMS latency p99 | < 50ms | _(điền sau)_ | |
| **5. Supply** | 5.2 CVE scan | 0 HIGH/CRITICAL | _(điền sau)_ | |
| | 5.3 Secrets in git | 0 real secrets | _(điền sau)_ | |

---

### Performance Targets

| Metric | Target | Baseline | Với Security Controls |
|---|---|---|---|
| Checkout median latency | < 500ms | ___ ms | ___ ms |
| Checkout p99 latency | < 2000ms | ___ ms | ___ ms |
| KMS encrypt median | < 10ms | N/A | ___ ms |
| Token issuance median | < 200ms | ___ ms | ___ ms |
| Max concurrent checkouts | ≥ 20 req/s | ___ | ___ |

---

### Lỗ hổng Cần Fix Trước Demo

> Các lỗ hổng sau sẽ khiến test FAIL theo kế hoạch — cần sửa để demo đúng mục tiêu:

| Ưu tiên | Lỗ hổng | File cần sửa | Test liên quan |
|---|---|---|---|
| P0 | JWT không verify signature | [catalog-service/app/api/dependencies.py:22-41](../services/catalog-service/app/api/dependencies.py) | 1.1, 1.2, 1.3 |
| P0 | IDOR trên `/refund` và `/payments/{id}` | [payment-service/app/api/v1/internal/payments.py:34-60](../services/payment-service/app/api/v1/internal/payments.py) | 2.5 |
| P1 | CORS wildcard `*` | tất cả `main.py` | 3.5 |
| P1 | HMAC disabled by default | tất cả `.env` | 4.4 |
| P1 | Không có rate limit trên `/api/*` | Envoy config | 3.3 |

---

*Generated by security audit — NT219 Cryptography, 2026-05-31*
