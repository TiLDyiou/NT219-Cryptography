# Data Flow Diagram - E-Commerce Platform

## Tổng quan quyết định thiết kế

| Quyết định         | Kết quả                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Keycloak           | Giữ ở **TB3 (Services)** - stateful, cần model trust boundary crossing GW<->IdP                         |
| ML Fraud Scoring   | TB3 + kết nối **external ML API** (TB7)                                                                 |
| Notification       | TB3, dùng **FastAPI-Mail** -> kết nối **Gmail SMTP** (TB8)                                              |
| CDN                | Giữ ở **TB2 (Edge Network)**                                                                            |
| Service-to-Service | **Async qua Kafka** (TB3 - cùng cluster với services)                                                   |
| Auth               | GW dùng **JWT self-validation**, kết nối IdP cho OIDC login/token/JWKS                                  |
| Database Pattern   | **Database-per-service** - mỗi service có PostgreSQL instance riêng (TDE + FLE)                         |
| Key Management     | Payment, Fraud, Notification lấy external credentials từ Vault; tất cả DBs lấy encryption keys từ Vault |
| Observability      | **ELK** (audit logs), **Prometheus** (metrics scraping), **Grafana** (dashboards) - đặt trong TB4       |
| Prometheus Targets | GW, Keycloak, Order, Payment, Kafka, tất cả PostgreSQL instances, Vault                                 |
| Checkout Flow      | **Saga orchestration** - Order Service điều phối: Reserve Inventory -> Check Fraud -> Process Payment   |
| Settlement         | **Marketplace model** - Platform thu hộ buyer -> trừ hoa hồng -> chuyển cho merchant theo kỳ            |

---

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph TB1["TB1: Internet - Untrusted"]
        User["User / Frontend"]
    end

    subgraph TB2["TB2: Edge Network"]
        CDN["CDN"]
        GW["API Gateway - Envoy\n(JWT Self-Validation)"]
    end

    subgraph TB3["TB3: Backend Services"]
        direction LR
        subgraph TB3_1
            IdP["IdP (Keycloak + DB)"]
            Catalog["Catalog"]
            Cart["Cart"]
        end
        Order["Order\n(Saga Orchestrator)"]
        subgraph TB3_2
            Payment["Payment"]
            Inventory["Inventory"]
            Shipping["Shipping"]
            Notif["Notification\nFastAPI-Mail"]
            Fraud["Fraud Scoring"]
        end
        Kafka["Kafka"]
        TB3_1 ~~~ Order
        Kafka ~~~ TB3_2
        Order <==> Kafka
        Kafka <==> TB3_2
    end

    subgraph TB4["TB4: Data Layer"]
        direction LR
        subgraph DBS["Database-per-Service - PostgreSQL (TDE + FLE)"]
            direction LR
            DB_Cat[("Catalog DB")] ~~~
            DB_Cart[("Cart DB")] ~~~
            DB_Ord[("Order DB")] ~~~
            DB_Pay[("Payment DB")] ~~~
            DB_Inv[("Inventory DB")] ~~~
            DB_Ship[("Shipping DB")] ~~~
            DB_Notif[("Notification DB")]
        end
        subgraph OBS["Observability"]
            direction TB
            ELK["ELK Stack\nElasticsearch + Logstash + Kibana"] ~~~
            Prom["Prometheus"] ~~~
            Graf["Grafana"]
        end
        DBS ~~~ OBS
    end

    subgraph TB5["TB5: Key Management"]
        KMS["KMS / HSM"]
        Vault["HashiCorp Vault"]
    end

    subgraph TB6["TB6: External Payment"]
        PSP["Stripe"]
    end

    subgraph TB7["TB7: External ML Provider"]
        MLApi["External ML API"]
    end

    subgraph TB8["TB8: External Mail Provider"]
        Gmail["Gmail SMTP"]
    end

    %% ── TB1 -> TB2: User to Edge ──
    User -->|"HTTPS/TLS 1.3\nStatic Assets"| CDN
    User -->|"HTTPS/TLS 1.3\nAPI Requests + JWT"| GW

    %% ── TB2 <-> TB3: Edge to Services ──
    GW <-->|"HTTPS/REST"| IdP
    GW -->|"mTLS"| Catalog
    GW -->|"mTLS"| Cart
    GW -->|"mTLS"| Order


    %% ── TB3 -> TB4: Database-per-Service ──
    TB3 <-.->|"SQL/JDBC+TLS"| DBS

    %% ── Audit Logging -> ELK ──
    GW -.->|"Access Logs"| ELK
    TB3_2 -.->|"Audit Trail Order + Payment"| ELK
    Fraud -.->|"Anomaly Logs"| ELK

    %% ── Prometheus Scrape (pull model) ──
    Prom -.->|"Scrape"| GW
    Prom -.->|"Scrape IdP + Order + Payment + Kafka + Catalog"| TB3
    Prom -.->|"Scrape"| Vault
    Graf -->|"PromQL Query"| Prom

    %% ── TB3/TB4 -> TB5: Key Management ──
    Payment <-->|"Stripe API Key"| Vault
    Fraud <-->|"ML API Key"| Vault
    Notif <-->|"SMTP Credentials"| Vault
    DBS <-.->|"Encryption Keys PaymentDB OrderDB "| Vault
    Vault <-->|"Key Wrapping"| KMS

    %% ── TB3 -> External Services ──
    Payment -->|"HTTPS/REST\nCharge"| PSP
    Fraud -->|"HTTPS/REST\nScore Request"| MLApi
    Notif -->|"SMTP/TLS\nEmail Delivery"| Gmail
```

---

## Order Saga Flow

> [!IMPORTANT]
> Order Service đóng vai trò **Saga Orchestrator** - điều phối toàn bộ checkout flow qua Kafka commands (request-reply pattern). Nếu bất kỳ bước nào fail -> saga compensate (rollback) các bước đã hoàn thành.

```mermaid
sequenceDiagram
    participant U as User
    participant O as Order Service<br>(Saga Orchestrator)
    participant I as Inventory Service
    participant F as Fraud Service
    participant P as Payment Service
    participant S as Shipping Service
    participant N as Notification Service

    U->>O: Send Order (checkout)
    Note over O: Create order (status: pending_payment)<br>Create saga_state (step: reserve_inventory)

        Note over O,P: SAGA STEPS (qua Kafka request-reply)
        O->>I: 1. ReserveInventory
        I-->>O: InventoryReserved
        Note right of I: inventory_reservations.status = held<br>TTL 10 phút

        O->>F: 2. CheckFraud
        F-->>O: FraudResult
        Note right of F: Stateless service<br>-> orders.fraud_score cập nhật

        O->>P: 3. ProcessPayment
        P-->>O: PaymentProcessed
        Note right of P: payment_transactions.status = succeeded

    Note over O,P: Saga completed <br>Order status: confirmed

    O->>I: ConfirmReservation
    Note right of I: reservation.status = confirmed<br>on_hand -= quantity

    O->>S: Publish: OrderConfirmed
    O->>N: Publish: OrderConfirmed
    S-->>O: Created shipment
    N-->>O: Sent confirmation email
```

**Compensation (khi có lỗi):**

```mermaid
sequenceDiagram
    participant O as Order (Saga)
    participant I as Inventory

    Note over O: Fraud flagged -> compensate

    O->>I: 1. ReserveInventory
    I-->>O: InventoryReleased


    Note over O: Payment fail -> compensate

    O->>I: 1. ReleaseInventory
    I-->>O: InventoryReleased
    Note right of I: reservation.status = released<br>release_reason = saga_compensated

    Note over O: on_hand = 0 in Inventory
    I-->>O: OutOfStock
```

---
