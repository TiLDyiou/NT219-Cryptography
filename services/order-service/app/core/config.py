import os

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class VaultConfig(BaseModel):
    vault_addr: str = "http://localhost:8200"
    token: str | None = None
    role_id: str | None = None
    secret_id: str | None = None
    renewal_interval_seconds: int = 1800
    fle_key_name: str = "order-fle-key"
    sign_key_name: str = "order-sign-key"
    hmac_key_name: str = "order-hmac-key"
    # Key của payment-service để verify chữ ký event đến từ payment (transit verify cần đúng key bên ký).
    payment_sign_key_name: str = "payment-sign-key"
    enabled: bool = True


class RedisConfig(BaseModel):
    url: str = "redis://localhost:6379/0"
    nonce_ttl_seconds: int = 600
    enabled: bool = True


class KafkaConfig(BaseModel):
    bootstrap_servers: str = "localhost:9092"
    topic_checkout: str = "order.checkout"
    topic_audit: str = "audit-logs"
    topic_payment_events: str = "payment.events"
    consumer_group: str = "order-service"
    enabled: bool = True


class PaymentServiceConfig(BaseModel):
    base_url: str = "http://localhost:8004"
    timeout_seconds: int = 30
    mtls_enabled: bool = False
    client_cert_path: str | None = None
    client_key_path: str | None = None
    ca_cert_path: str | None = None
    dev_stub_on_failure: bool = False
    internal_token: str = ""


class InventoryServiceConfig(BaseModel):
    base_url: str = "http://localhost:8005"
    timeout_seconds: int = 30
    mtls_enabled: bool = False
    client_cert_path: str | None = None
    client_key_path: str | None = None
    ca_cert_path: str | None = None
    dev_stub_on_failure: bool = False
    internal_token: str = ""


class Settings(BaseSettings):
    PROJECT_NAME: str = "Order Service"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Keycloak — service tự verify JWT RS256 (không còn tin header X-User-Id).
    KEYCLOAK_URL: str = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
    KEYCLOAK_REALM: str = os.getenv("KEYCLOAK_REALM", "nt219")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://uitstore:uitstore_dev@localhost:5432/order_db",
    )
    DATABASE_SQLITE_FALLBACK_URL: str = os.getenv(
        "DATABASE_SQLITE_FALLBACK_URL",
        "sqlite+aiosqlite:///./order_service.db",
    )
    ENABLE_SQLITE_FALLBACK: bool = (
        os.getenv("ENABLE_SQLITE_FALLBACK", "false").lower() == "true"
    )
    DATABASE_POOL_SIZE: int = int(os.getenv("DATABASE_POOL_SIZE", "10"))
    DATABASE_MAX_OVERFLOW: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))
    DATABASE_POOL_TIMEOUT: int = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
    DATABASE_POOL_RECYCLE: int = int(os.getenv("DATABASE_POOL_RECYCLE", "1800"))

    INTERNAL_API_TOKEN: str = os.getenv(
        "INTERNAL_API_TOKEN", "order_internal_dev_token"
    )
    CHECKOUT_REQUEST_TIMEOUT_SECONDS: int = int(
        os.getenv("CHECKOUT_REQUEST_TIMEOUT_SECONDS", "30")
    )

    TIMESTAMP_TOLERANCE_SECONDS: int = int(
        os.getenv("TIMESTAMP_TOLERANCE_SECONDS", "300")
    )
    REQUIRE_INBOUND_HMAC: bool = (
        os.getenv("REQUIRE_INBOUND_HMAC", "true").lower() == "true"
    )
    REQUIRE_NONCE_GUARD: bool = (
        os.getenv("REQUIRE_NONCE_GUARD", "true").lower() == "true"
    )

    VAULT_ADDR: str = os.getenv("VAULT_ADDR", "http://localhost:8200")
    VAULT_TOKEN: str | None = os.getenv("VAULT_TOKEN")
    VAULT_ROLE_ID: str | None = os.getenv("VAULT_ROLE_ID")
    VAULT_SECRET_ID: str | None = os.getenv("VAULT_SECRET_ID")
    VAULT_ENABLED: bool = os.getenv("VAULT_ENABLED", "true").lower() == "true"
    VAULT_FLE_KEY: str = os.getenv("VAULT_FLE_KEY", "order-fle-key")
    VAULT_SIGN_KEY: str = os.getenv("VAULT_SIGN_KEY", "order-sign-key")
    VAULT_HMAC_KEY: str = os.getenv("VAULT_HMAC_KEY", "order-hmac-key")
    VAULT_PAYMENT_SIGN_KEY: str = os.getenv("VAULT_PAYMENT_SIGN_KEY", "payment-sign-key")
    VAULT_RENEWAL_INTERVAL_SECONDS: int = int(
        os.getenv("VAULT_RENEWAL_INTERVAL_SECONDS", "1800")
    )

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "true").lower() == "true"
    REDIS_NONCE_TTL_SECONDS: int = int(os.getenv("REDIS_NONCE_TTL_SECONDS", "600"))

    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv(
        "KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"
    )
    KAFKA_TOPIC_CHECKOUT: str = os.getenv("KAFKA_TOPIC_CHECKOUT", "order.checkout")
    KAFKA_TOPIC_AUDIT: str = os.getenv("KAFKA_TOPIC_AUDIT", "audit-logs")
    KAFKA_TOPIC_PAYMENT_EVENTS: str = os.getenv("KAFKA_TOPIC_PAYMENT_EVENTS", "payment.events")
    KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "order-service")
    KAFKA_ENABLED: bool = os.getenv("KAFKA_ENABLED", "true").lower() == "true"

    PAYMENT_SERVICE_URL: str = os.getenv("PAYMENT_SERVICE_URL", "http://localhost:8004")
    # H-02: token nội bộ order gửi sang payment (phải khớp INTERNAL_API_TOKEN của payment).
    PAYMENT_INTERNAL_API_TOKEN: str = os.getenv(
        "PAYMENT_INTERNAL_API_TOKEN", "payment_internal_dev_token"
    )
    PAYMENT_MTLS_ENABLED: bool = (
        os.getenv("PAYMENT_MTLS_ENABLED", "false").lower() == "true"
    )
    PAYMENT_CLIENT_CERT: str | None = os.getenv("PAYMENT_CLIENT_CERT")
    PAYMENT_CLIENT_KEY: str | None = os.getenv("PAYMENT_CLIENT_KEY")
    PAYMENT_CA_CERT: str | None = os.getenv("PAYMENT_CA_CERT")
    PAYMENT_DEV_STUB_ON_FAILURE: bool = (
        os.getenv("PAYMENT_DEV_STUB_ON_FAILURE", "false").lower() == "true"
    )

    INVENTORY_SERVICE_URL: str = os.getenv(
        "INVENTORY_SERVICE_URL", "http://localhost:8005"
    )
    # H-03: token nội bộ order gửi sang inventory (phải khớp INTERNAL_API_TOKEN của inventory).
    INVENTORY_INTERNAL_API_TOKEN: str = os.getenv(
        "INVENTORY_INTERNAL_API_TOKEN", "inventory_internal_dev_token"
    )
    CART_SERVICE_URL: str = os.getenv("CART_SERVICE_URL", "http://localhost:8002")
    CART_INTERNAL_API_TOKEN: str = os.getenv(
        "CART_INTERNAL_API_TOKEN", "cart_internal_dev_token"
    )
    INVENTORY_MTLS_ENABLED: bool = (
        os.getenv("INVENTORY_MTLS_ENABLED", "false").lower() == "true"
    )
    INVENTORY_CLIENT_CERT: str | None = os.getenv("INVENTORY_CLIENT_CERT")
    INVENTORY_CLIENT_KEY: str | None = os.getenv("INVENTORY_CLIENT_KEY")
    INVENTORY_CA_CERT: str | None = os.getenv("INVENTORY_CA_CERT")
    INVENTORY_DEV_STUB_ON_FAILURE: bool = (
        os.getenv("INVENTORY_DEV_STUB_ON_FAILURE", "false").lower() == "true"
    )

    LOCAL_CRYPTO_SECRET: str = os.getenv(
        "LOCAL_CRYPTO_SECRET", "local-dev-order-crypto-key-32b!"
    )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in ("production", "prod", "staging")

    @property
    def vault(self) -> VaultConfig:
        return VaultConfig(
            vault_addr=self.VAULT_ADDR,
            token=self.VAULT_TOKEN,
            role_id=self.VAULT_ROLE_ID,
            secret_id=self.VAULT_SECRET_ID,
            renewal_interval_seconds=self.VAULT_RENEWAL_INTERVAL_SECONDS,
            fle_key_name=self.VAULT_FLE_KEY,
            sign_key_name=self.VAULT_SIGN_KEY,
            hmac_key_name=self.VAULT_HMAC_KEY,
            payment_sign_key_name=self.VAULT_PAYMENT_SIGN_KEY,
            enabled=self.VAULT_ENABLED,
        )

    @property
    def redis(self) -> RedisConfig:
        return RedisConfig(
            url=self.REDIS_URL,
            nonce_ttl_seconds=self.REDIS_NONCE_TTL_SECONDS,
            enabled=self.REDIS_ENABLED,
        )

    @property
    def kafka(self) -> KafkaConfig:
        return KafkaConfig(
            bootstrap_servers=self.KAFKA_BOOTSTRAP_SERVERS,
            topic_checkout=self.KAFKA_TOPIC_CHECKOUT,
            topic_audit=self.KAFKA_TOPIC_AUDIT,
            topic_payment_events=self.KAFKA_TOPIC_PAYMENT_EVENTS,
            consumer_group=self.KAFKA_CONSUMER_GROUP,
            enabled=self.KAFKA_ENABLED,
        )

    @property
    def payment(self) -> PaymentServiceConfig:
        return PaymentServiceConfig(
            base_url=self.PAYMENT_SERVICE_URL,
            timeout_seconds=self.CHECKOUT_REQUEST_TIMEOUT_SECONDS,
            mtls_enabled=self.PAYMENT_MTLS_ENABLED,
            client_cert_path=self.PAYMENT_CLIENT_CERT,
            client_key_path=self.PAYMENT_CLIENT_KEY,
            ca_cert_path=self.PAYMENT_CA_CERT,
            dev_stub_on_failure=self.PAYMENT_DEV_STUB_ON_FAILURE,
            internal_token=self.PAYMENT_INTERNAL_API_TOKEN,
        )

    @property
    def inventory(self) -> InventoryServiceConfig:
        return InventoryServiceConfig(
            base_url=self.INVENTORY_SERVICE_URL,
            timeout_seconds=self.CHECKOUT_REQUEST_TIMEOUT_SECONDS,
            mtls_enabled=self.INVENTORY_MTLS_ENABLED,
            client_cert_path=self.INVENTORY_CLIENT_CERT,
            client_key_path=self.INVENTORY_CLIENT_KEY,
            ca_cert_path=self.INVENTORY_CA_CERT,
            dev_stub_on_failure=self.INVENTORY_DEV_STUB_ON_FAILURE,
            internal_token=self.INVENTORY_INTERNAL_API_TOKEN,
        )


settings = Settings()
