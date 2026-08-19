# Infrastructure

Toàn bộ hướng dẫn cài đặt: **[vm-setup/README.md](vm-setup/README.md)**

---

## Tổng quan

Hệ thống triển khai trên **4 VM** (2 máy vật lý × 2 VM), mỗi VM là 1 security zone độc lập.

| Node | Zone | Dịch vụ chính |
|---|---|---|
| NODE-1 | Ingress | Nginx (CDN), Envoy + WAF Lua, Keycloak |
| NODE-2 | Service Mesh | catalog, cart, order, inventory, shipping, notification |
| NODE-3 | PCI DSS | payment-service, HashiCorp Vault (auto-init) |
| NODE-4 | Data + Obs | PostgreSQL, Kafka, ELK Stack, Prometheus, Grafana |

Thứ tự triển khai: `NODE-4 → NODE-3 → NODE-2 → NODE-1`

## Cấu trúc scripts

```
vm-setup/
├── node-1/   02-setup-ingress.sh — TLS cert tự ký + WAF Lua inline + Keycloak realm import tự động
├── node-2/   02-setup-services.sh — 6 microservices as systemd units
├── node-3/   02-setup-payment.sh — Vault policies inline
│             03-start-all.sh     — Vault auto-init + unseal + AppRole setup
└── node-4/   02-install-data-obs.sh — PostgreSQL + Kafka + ELK + Prometheus + Grafana inline
```

> Mọi config (nginx, envoy, kibana, logstash, grafana, prometheus, Keycloak realm, Vault policies)
> đều được **inline trực tiếp** vào scripts — không cần file config riêng.
