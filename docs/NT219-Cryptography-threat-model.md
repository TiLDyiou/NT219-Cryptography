# Threat Model: NT219-Cryptography

## 1. System Model & Scope
This threat model covers the `NT219-Cryptography` project, a microservices-based e-commerce or ordering system.

### In-Scope Components
- **Order Service**: Central orchestrator for business logic.
- **Inventory Service**: Manages stock and inventory (Port 8005).
- **Payment Service**: Processes transactions via Stripe (Port 8004).
- **Shipping Service**: Connects to Giao Hang Nhanh for logistics.
- **Notification Service**: Sends emails via SMTP.
- **Message Broker (Kafka)**: Used for `inventory.events` and `audit-logs`.

### Out of Scope
- Internal workings of third-party services (Stripe, Giao Hang Nhanh, SMTP provider).
- Underlying infrastructure setup (Kubernetes, AWS/GCP layers) unless directly interacting with the code.

## 2. Boundaries, Assets, and Entry Points

### Trust Boundaries
1. **Internet to API (External)**: Currently undefined in code (assumed direct exposure or missing API Gateway). Requests are trusted based on HTTP headers (`X-User-Id`, `X-Merchant-Id`).
2. **Service-to-Service (Internal HTTP)**: Orchestrated primarily by `order-service`. Security controls (HMAC and Nonce guard) exist but are **disabled** by default (`REQUIRE_INBOUND_HMAC=False`, `REQUIRE_NONCE_GUARD=False`).
3. **Services to Third Parties (External egress)**: API calls to Stripe, Giao Hang Nhanh, and SMTP.
4. **Services to Kafka**: Internal publishing/subscribing to events.

### Assets (Risk Drivers)
- **High Sensitivity**: Financial transaction data (Stripe `client_secret`), Merchant/User IDs, PII for shipping, Audit logs.
- **Medium Sensitivity**: Inventory stock counts, order statuses.

### Entry Points
- HTTP REST API endpoints on all services (exposed to users or internal services).
- Kafka topic consumers.

## 3. Attacker Capabilities
- **External Attacker**: Can send arbitrary HTTP requests to any exposed API endpoint. Can manipulate HTTP headers.
- **Internal/Compromised Service Attacker**: If one service is compromised, the attacker can move laterally to other services since internal HMAC checks are disabled.

## 4. Threats as Abuse Paths

### T1. Identity Spoofing and Privilege Escalation via Trust-based Auth (Critical)
- **Path**: An external attacker sends an HTTP request to any exposed service and manually injects the `X-User-Id: <target_id>` or `X-Merchant-Id: <target_id>` header.
- **Impact**: **High**. Attacker can fully impersonate any user or merchant, viewing their PII, placing orders, or modifying inventory.
- **Likelihood**: **High**. The system relies purely on HTTP headers without validating JWTs or session signatures.
- **Impacted Assets**: All user data, financial data, order integrity.

### T2. Lateral Movement and Internal API Abuse (High)
- **Path**: An attacker gains access to the internal network (SSRF, compromised container) and calls internal APIs (e.g., Inventory or Payment) directly.
- **Impact**: **High**. They can bypass the `order-service` orchestrator to artificially inflate inventory, trigger fake payments, or exfiltrate data.
- **Likelihood**: **High**. Internal HMAC signatures (`HmacVerificationMiddleware`) and replay protections (`NonceGuardMiddleware`) are bypassed (`False`).
- **Impacted Assets**: System integrity, database state.

### T3. Application Crash / DoS in Payment Service (Medium)
- **Path**: Attacker triggers a payment failure scenario.
- **Impact**: **Medium**. The `payment_repository.py` attempts to save a non-existent `client_secret` and uses mismatched field names (`error_code` vs `failure_code`), causing an `AttributeError` and crashing the payment flow.
- **Likelihood**: **High** (Guaranteed on failure).
- **Impacted Assets**: Availability of payment processing.

### T4. Phantom Orders via Dev Stubbing (High)
- **Path**: An attacker or normal user encounters an inventory error during ordering.
- **Impact**: **High**. Because `dev_stub_on_failure = True`, the system mocks a success response. The order completes without reserving inventory, leading to unfulfilled orders and financial discrepancies.
- **Likelihood**: **Medium**. Requires an underlying failure, but the configuration makes the system fail open instead of failing secure.
- **Impacted Assets**: Financial integrity, Inventory state.

## 5. Mitigations & Recommendations

### Recommended Immediate Mitigations
1. **Implement API Gateway & JWT Validation (T1)**: 
   - Deploy an API Gateway to act as the single entry point.
   - The Gateway MUST cryptographically verify JWT signatures before forwarding requests.
   - Internal services must only accept requests from the Gateway or valid internal peers, never trusting `X-User-Id` from arbitrary sources.
2. **Enforce Service-to-Service Authentication (T2)**:
   - Set `REQUIRE_INBOUND_HMAC=True` and `REQUIRE_NONCE_GUARD=True` on all environments except local dev.
3. **Fix Payment Repository Schema Mismatch (T3)**:
   - Align `payment_repository.py` and `payment_transaction.py` fields (`error_code` vs `failure_code`).
   - Add the missing `client_secret` column to the database schema.
4. **Disable Dev Configurations in Production (T4)**:
   - Enforce `dev_stub_on_failure = False` globally for staging and production.
   - Disable SQLite fallback (`ENABLE_SQLITE_FALLBACK=False`) to prevent data fragmentation.
5. **Secrets Management**:
   - Ensure `INTERNAL_API_TOKEN` and `LOCAL_CRYPTO_SECRET` are injected via environment variables or a Vault, not hardcoded.

## 6. Assumptions & Open Questions (For Review)
To finalize this threat model, please clarify the following:
1. **Deployment Model**: Will the services be exposed directly to the internet, or will there be an API Gateway/Ingress handling authentication before traffic hits the microservices?
2. **User Roles**: Are there specific RBAC (Role-Based Access Control) requirements for Merchants vs Standard Users?
3. **Data Sensitivity**: Does the system store full credit card details, or only interact with Stripe via tokens/client secrets?

*(Please review these assumptions. If not corrected, the prioritization of T1 remains Critical.)*
