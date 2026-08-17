# Đánh Giá Mức Độ Sử Dụng Tech-Stack & Kỹ Thuật (NT219 Codebase)

> **Mục đích**: Định vị chính xác trình độ kỹ thuật (Proficiency Level) để đưa vào CV hoặc trả lời phỏng vấn. Dựa 100% trên codebase thực tế.

---

## 1. Bảng Đánh Giá Mức Độ Thành Thạo & Sử Dụng

| Nhóm kỹ năng / Tech-Stack | Kỹ thuật trong code | Mức độ thực tế | Đánh giá năng lực |
| --- | --- | --- | --- |
| **Python & FastAPI** | Async I/O (`asyncpg`, `aiokafka`, `httpx`), Pydantic v2, Custom Middleware, DI | **Proficient (Cao)** | Sử dụng async thành thạo toàn bộ pipeline, xử lý exception và config chuẩn chỉ. |
| **Applied Cryptography** | Envelope Encryption (AES-256-GCM), HashiCorp Vault Transit KMS, HMAC-SHA256, Digital Signature, X.509 PKI | **Advanced (Chuyên sâu)** | Hiểu rõ kiến trúc KMS, cơ chế DEK/KEK, binary blob layout và cryptographic verification. |
| **Application Security** | OAuth2 + PKCE (RFC 7636), Anti-Replay (Redis Nonce + Skew Timestamp), PCI DSS Masking, Constant-time compare | **Proficient (Cao)** | Áp dụng tư duy Defense-in-Depth thực tế; tự code PKCE bằng Web Crypto API không dựa lib ngoài. |
| **Distributed Systems Patterns** | SAGA Orchestration (Forward + Compensation), Transactional Outbox Pattern, Distributed Idempotency | **Proficient (Cao)** | Giải quyết tốt bài toán Dual-write và Distributed Transaction trong microservices. |
| **Event-Driven & Cache** | Apache Kafka (`aiokafka` producer/consumer), Redis (Nonce store, Idempotency keys, Caching) | **Intermediate (Khá)** | Triển khai tốt pub/sub, message worker; chưa tối ưu nâng cao (Kafka consumer group rebalance/DLQ). |
| **Database & ORM** | PostgreSQL 15, SQLAlchemy 2.0 Async, Alembic migrations, Monthly Table Partitioning | **Intermediate (Khá)** | Sử dụng ORM async tốt, biết tối ưu phân vùng dữ liệu lớn (partitioning). |
| **DevSecOps & Gateway** | Envoy Proxy, Lua L7 WAF filter, GitHub Actions CI (`gitleaks`, `pip-audit`), Docker Compose | **Intermediate (Khá)** | CI/CD có security gate; Lua WAF ở mức prototype (regex cơ bản). |
| **React & Frontend** | React 18 UMD, Web Crypto API, Stripe Elements, Vanilla CSS | **Basic (Cơ bản)** | Load qua CDN, compile Babel thủ công, state global `window`; thiếu Vite/Webpack/TS/Redux. |

---

## 2. Định Vị CV Phù Hợp

* **Cyber Security Intern (AppSec / Cryptography)**: **9/10 (Rất mạnh)**. Nắm chắc KMS Envelope Encryption, Zero-Trust S2S Auth, Anti-Replay và DevSecOps pipeline.
* **Backend / Distributed Systems Intern**: **8.5/10 (Mạnh)**. Nắm vững FastAPI Async, Clean Architecture, SAGA Orchestration, Transactional Outbox và Kafka.
* **Full-stack Dev Intern**: **5/10 (Không khuyến khích)**. Frontend chỉ ở mức Basic, dễ bị bắt bẻ về build tool, state management và type safety.

---

## 3. Việc Cần Dọn Dẹp Trước Khi Public Git

1. **P0 - Xóa Private Key**: Xóa `services/certs/*.key` khỏi git tracking (`git rm --cached`).
2. **P0 - Fix Fallback Secret**: Ép fail-fast trên container nếu không kết nối được Vault (không fallback về hardcoded secret).
