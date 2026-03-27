# Infrastructure

[Cường]

## 1. Mục đích

Thư mục này chứa toàn bộ cấu hình để dựng lên nền tảng hỗ trợ cho các Microservices hoạt động.

## 2. Cấu trúc thư mục

- `/gateway/`: Cấu hình định tuyến của Envoy Proxy (Chặn HTTP, Rate limit).
- `/idp/`: Cấu hình Keycloak Realm và Clients (Quản lý User, JWT).
- `/vault/`: Script tự động khởi tạo và unseal HashiCorp Vault.
- `/observability/`: File cấu hình cho Prometheus, Grafana và ELK Stack.
- `docker-compose.yml`: File kết nối tất cả các thành phần trên.
