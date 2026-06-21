# Data Flow Diagram & Trust Boundaries

Dựa vào cấu hình hạ tầng (`infra/vm-setup/README.md`, `services/envoy.yaml`) và source code của các microservices, dưới đây là Data Flow Diagram (DFD) cùng với việc phân định rõ các Trust Boundaries (Vùng tin cậy) của hệ thống.

## Data Flow Diagram (Mermaid)

```mermaid
flowchart TD
    classDef external fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef ingress fill:#e6f7ff,stroke:#1890ff,stroke-width:2px;
    classDef mesh fill:#f6ffed,stroke:#52c41a,stroke-width:2px;
    classDef pci fill:#fff1f0,stroke:#f5222d,stroke-width:2px;
    classDef data fill:#f9f0ff,stroke:#722ed1,stroke-width:2px;

    Client((Client App / Browser)):::external
    Stripe((Stripe API)):::external

    subgraph Ingress [Trust Boundary 1: Ingress Zone / DMZ - NODE 1]
        Nginx[Nginx CDN/LB]:::ingress
        Envoy[Envoy Proxy + WAF]:::ingress
        Keycloak[Keycloak IdP]:::ingress
    end

    subgraph Mesh [Trust Boundary 2: Service Mesh - NODE 2]
        Catalog[Catalog Service]:::mesh
        Cart[Cart Service]:::mesh
        Order[Order Service]:::mesh
        Inventory[Inventory Service]:::mesh
        Shipping[Shipping Service]:::mesh
        Noti[Notification Service]:::mesh
    end

    subgraph PCI [Trust Boundary 3: PCI DSS Zone - NODE 3]
        Payment[Payment Service]:::pci
        Vault[HashiCorp Vault]:::pci
    end

    subgraph DataZone [Trust Boundary 4: Data & Obs - NODE 4]
        DB[(PostgreSQL)]:::data
        Kafka{{Kafka Event Bus}}:::data
        ELK[Logstash / ES / Kibana]:::data
        Prometheus[Prometheus / Grafana]:::data
    end

    %% Flow - External to Ingress
    Client -- HTTPS --> Nginx
    Nginx -- HTTP --> Envoy
    Envoy -- Validate JWT --> Keycloak

    %% Flow - Ingress to Mesh
    Envoy -- HTTP --> Catalog
    Envoy -- HTTP --> Cart
    Envoy -- mTLS --> Order
    Envoy -- HTTP --> Inventory
    Envoy -- HTTP --> Shipping
    Envoy -- HTTP --> Noti

    %% Flow - Service to Service
    Order -- mTLS + HMAC --> Payment

    %% Flow - External Integrations
    Payment -- HTTPS --> Stripe

    %% Flow - Vault Integration
    Payment -- AppRole Auth --> Vault
    Order -- AppRole Auth --> Vault
    Shipping -- AppRole Auth --> Vault

    %% Flow - DB Integration
    Catalog -. TCP 5432 .-> DB
    Cart -. TCP 5432 .-> DB
    Order -. TCP 5432 .-> DB
    Inventory -. TCP 5432 .-> DB
    Shipping -. TCP 5432 .-> DB
    Payment -. TCP 5432 .-> DB

    %% Flow - Event Bus (Kafka)
    Order -- Publish (Checkout, Audit) --> Kafka
    Order -- Consume (Payment Events) <-- Kafka
    Inventory -- Publish (Inventory, Audit) --> Kafka
    Payment -- Publish (Payment, Audit) --> Kafka
    Shipping -- Publish (Shipping, Audit) --> Kafka
    Noti -- Consume (All Events) <-- Kafka
    Noti -- Publish (DLQ, Audit) --> Kafka
    
    %% Observability Flow
    Kafka -. Async Logs .-> ELK
    DB -. Metrics .-> Prometheus
```

## Chi tiết Phân định Trust Boundaries

Hệ thống được chia thành 4 Trust Boundaries (Vùng tin cậy) chính, được cách ly vật lý hoặc logic ở mức network (thông qua Tailscale và cấu trúc triển khai VM):

### 1. Ingress Zone / DMZ (Mức độ tin cậy: Thấp - Giao tiếp với External)
- **Thành phần:** Nginx, Envoy Proxy, Keycloak (Node-1).
- **Trách nhiệm:** 
  - Là điểm chạm đầu tiên của public traffic.
  - Xử lý TLS Termination, lọc WAF, và xác thực Authentication (Keycloak JWT).
- **Ranh giới:** Chặn các request độc hại hoặc không có xác thực ngay tại mép (edge) của hệ thống trước khi lan vào Service Mesh.

### 2. Service Mesh Zone (Mức độ tin cậy: Trung bình - Nội bộ)
- **Thành phần:** Các dịch vụ cốt lõi không xử lý dữ liệu thanh toán nhạy cảm như Catalog, Cart, Order, Inventory, Shipping, Noti (Node-2).
- **Trách nhiệm:** Xử lý logic nghiệp vụ chung (e-commerce).
- **Ranh giới:** 
  - Chỉ nhận request đã đi qua Envoy (đã được lọc WAF và có JWT hợp lệ).
  - Riêng `order-service` yêu cầu giao tiếp từ Envoy qua chuẩn **mTLS** để tăng cường bảo mật cho quá trình tạo đơn hàng.

### 3. PCI DSS Zone (Mức độ tin cậy: Rất Cao - Tách biệt hoàn toàn)
- **Thành phần:** Payment Service, HashiCorp Vault (Node-3).
- **Trách nhiệm:** 
  - Xử lý và lưu trữ dữ liệu thanh toán, giao tiếp với Cổng thanh toán (Stripe).
  - Vault quản lý tập trung các Encryption Keys (KMS), Secrets, AppRole token.
- **Ranh giới:** 
  - KHÔNG thể truy cập trực tiếp từ Internet hoặc Envoy.
  - Request chỉ được phép gọi vào từ `order-service` thông qua kết nối có xác thực khắt khe **mTLS + HMAC**.
  - Đây là phân vùng độc lập giúp cô lập rủi ro trong trường hợp Service Mesh bị tấn công.

### 4. Data & Observability Zone (Mức độ tin cậy: Cao - Chỉ truy cập nội bộ)
- **Thành phần:** PostgreSQL, Kafka, ELK Stack, Prometheus & Grafana (Node-4).
- **Trách nhiệm:** Lưu trữ trạng thái hệ thống (Database), xử lý tin nhắn bất đồng bộ (Kafka), và thu thập Logs/Metrics.
- **Ranh giới:** Không xử lý logic kinh doanh, chỉ chấp nhận kết nối nội bộ từ Node 2 và Node 3 đã qua xác thực (chẳng hạn pg_hba.conf cho Database). 

---
**Tóm tắt các biện pháp bảo vệ dữ liệu trên đường truyền (Data in Transit):**
1. **Client -> Ingress:** Mã hóa HTTPS.
2. **Ingress -> Order Service:** Mã hóa mTLS.
3. **Order Service -> Payment Service:** Mã hóa mTLS + Xác thực tính toàn vẹn (HMAC).
4. **Services -> Vault:** Xác thực thông qua cơ chế Vault AppRole.
5. **Nội bộ Services -> Data:** TCP Connection (Có thể nâng cấp lên TLS cho DB/Kafka nếu cần).
6. **Payment Service -> Stripe:** Mã hóa HTTPS ra môi trường External.
