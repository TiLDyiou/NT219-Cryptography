# Kiến Trúc và Luồng Xử Lý HMAC

Tài liệu này mô tả kiến trúc và luồng xử lý HMAC dựa trên cấu trúc thực tế trong codebase, tuân thủ các tiêu chuẩn UML hiện đại.

## 1. Sơ Đồ Lớp (Class Diagram)

Sơ đồ thể hiện rõ các pattern đang được áp dụng trong code:

- **Dependency Injection / Strategy Pattern**: Thông qua interface `CryptoService`.
- **Mối quan hệ UML chuẩn**: `Realization` (Thực thi interface), `Inheritance` (Kế thừa), `Association/Aggregation` (Tiêm phụ thuộc).

```mermaid
classDiagram
    class BaseHTTPMiddleware {
        <<Starlette>>
        +dispatch(request, call_next)
    }

    class HmacVerificationMiddleware {
        +dispatch(request: Request, call_next: Callable) Response
    }

    class CryptoService {
        <<interface>>
        +sign_request(method, path, body, timestamp, nonce) HmacSignature
        +verify_request(method, path, body, timestamp, nonce, signature) bool
    }

    class VaultCryptoService {
        -_envelope: EnvelopeEncryptor
        -_hmac: HmacSigner
        -_events: EventSigner
        +sign_request(...) HmacSignature
        +verify_request(...) bool
    }

    class LocalDevCryptoService {
        -_hmac_key: bytes
        +sign_request(...) HmacSignature
        +verify_request(...) bool
    }

    class HmacSigner {
        -_transit: VaultTransit
        -_key_name: str
        +sign(...) tuple
        +verify(...) bool
    }

    class VaultTransit {
        +hmac(key_name, input_data) dict
        +verify_hmac(key_name, input_data, hmac_value) bool
    }

    %% Relationships
    BaseHTTPMiddleware <|-- HmacVerificationMiddleware : Kế thừa (Inheritance)
    HmacVerificationMiddleware ..> CryptoService : Sử dụng (Dependency)

    CryptoService <|.. VaultCryptoService : Thực thi (Realization)
    CryptoService <|.. LocalDevCryptoService : Thực thi (Realization)

    VaultCryptoService o-- HmacSigner : Tiêm phụ thuộc (Aggregation)
    HmacSigner o-- VaultTransit : Tiêm phụ thuộc (Aggregation)
```

**Giải thích:**

- Các hàm/phương thức tiện ích như `build_canonical_request` được thiết kế dạng standalone function trong codebase nên không đại diện như một class độc lập.

---

## 2. Sơ Đồ Tuần Tự (Sequence Diagram)

Sơ đồ này phản ánh logic chi tiết trong mã nguồn khi một HTTP Request đi qua Middleware xác thực HMAC, và đi sâu vào cách Canonical Request được tạo ra.

```mermaid
sequenceDiagram
    actor Client
    participant MW as HmacVerificationMiddleware
    participant CS as CryptoService<br/>(Interface)
    participant VC as VaultCryptoService
    participant HS as HmacSigner
    participant VT as VaultTransit<br/>(HashiCorp Vault)
    participant LDC as LocalDevCryptoService

    Client->>MW: HTTP Request (Method, Path, Body)<br/>Headers: X-Signature, X-Timestamp, X-Nonce

    MW->>MW: Kiểm tra tính hợp lệ của Headers
    MW->>MW: Kiểm tra Timestamp Tolerance (chống Replay)

    MW->>CS: verify_request(method, path, body, timestamp, nonce, signature)

    alt Sử dụng Vault (Production)
        CS->>VC: verify_request(...)
        VC->>HS: verify(...)
        HS->>HS: build_canonical_request(...)<br/>(METHOD + PATH + TIMESTAMP + NONCE + SHA256(BODY))
        HS->>HS: Base64 Encode Canonical String
        HS->>VT: verify_hmac(key_name, input_data, signature)
        Note right of VT: Vault engine xử lý thuật toán HMAC<br/>dựa trên RFC 2104 với secret key nội bộ
        VT-->>HS: True / False
        HS-->>VC: True / False
        VC-->>CS: True / False

    else Sử dụng Local (Development)
        CS->>LDC: verify_request(...)
        LDC->>LDC: sign_request(...) sinh ra Expected Signature
        LDC->>LDC: build_canonical_request(...)
        Note right of LDC: Python hmac.new(hmac_key, canonical, sha256)
        LDC->>LDC: hmac.compare_digest(expected, signature)
        LDC-->>CS: True / False
    end

    CS-->>MW: Kết quả xác thực (Boolean)

    alt Kết quả == False
        MW-->>Client: 401 Unauthorized (INVALID_SIGNATURE)
    else Kết quả == True
        MW->>MW: call_next(request)
        MW-->>Client: Trả về kết quả từ Controller
    end
```

**Tại sao áp dụng sơ đồ này?**

- Tuân thủ cấu trúc codebase thực tế (chỉ gọi logic trong các service và hàm helper `build_canonical_request`), thay vì cố gắng mapping các toán tử bitwise của RFC 2104 (như `ipad`/`opad`) vốn bị ẩn hoàn toàn bởi thư viện `hmac` (trong Python) hoặc engine Vault.
- Giúp developer nhanh chóng theo dõi được luồng đi của dữ liệu từ tầng Middleware, qua Interface, đến quá trình mã hóa/giải mã ở các Implementation khác nhau.
