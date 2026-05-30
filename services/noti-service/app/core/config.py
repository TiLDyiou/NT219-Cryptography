import os
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class VaultConfig(BaseModel):
    vault_addr: str = "http://localhost:8200"
    token: str | None = None
    role_id: str | None = None
    secret_id: str | None = None
    renewal_interval_seconds: int = 1800
    fle_key_name: str = "notification-fle-key"
    sign_key_name: str = "notification-sign-key"
    hmac_key_name: str = "notification-hmac-key"
    audit_key_name: str = "notification-audit-key"
    smtp_secret_path: str = "secret/data/notification/smtp"
    enabled: bool = True


class RedisConfig(BaseModel):
    url: str = "redis://localhost:6379/8"
    nonce_ttl_seconds: int = 600
    idempotency_ttl_seconds: int = 86400
    rate_limit_tokens: int = 10
    rate_limit_window_seconds: int = 60
    enabled: bool = True


class KafkaConfig(BaseModel):
    bootstrap_servers: str = "localhost:9092"
    topic_order_checkout: str = "order.checkout"
    topic_payment_events: str = "payment.events"
    topic_shipping_events: str = "shipping.events"
    topic_notification_events: str = "notification.events"
    topic_audit: str = "audit-logs"
    topic_dlq: str = "notification.dlq"
    consumer_group: str = "noti-service"
    enabled: bool = True


class SmtpConfig(BaseModel):
    host: str = "smtp.gmail.com"
    port: int = 587
    username: str | None = None
    app_password: str | None = None
    from_address: str = "noreply@example.com"
    from_name: str = "Enmerce"
    timeout_seconds: int = 10
    starttls_required: bool = True


class Settings(BaseSettings):
    PROJECT_NAME: str = "Notification Service"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8008

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://notification_user:notification_dev_pass@localhost:5432/notification_db",
    )
    DATABASE_SQLITE_FALLBACK_URL: str = os.getenv(
        "DATABASE_SQLITE_FALLBACK_URL",
        "sqlite+aiosqlite:///./noti_service.db",
    )
    ENABLE_SQLITE_FALLBACK: bool = os.getenv("ENABLE_SQLITE_FALLBACK", "false").lower() == "true"
    DATABASE_POOL_SIZE: int = int(os.getenv("DATABASE_POOL_SIZE", "10"))
    DATABASE_MAX_OVERFLOW: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))
    DATABASE_POOL_TIMEOUT: int = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
    DATABASE_POOL_RECYCLE: int = int(os.getenv("DATABASE_POOL_RECYCLE", "1800"))
    ALEMBIC_CHECK_ON_STARTUP: bool = os.getenv("ALEMBIC_CHECK_ON_STARTUP", "true").lower() == "true"

    INTERNAL_API_TOKEN: str = os.getenv("INTERNAL_API_TOKEN", "notification_internal_dev_token")
    TIMESTAMP_TOLERANCE_SECONDS: int = int(os.getenv("TIMESTAMP_TOLERANCE_SECONDS", "300"))
    REQUIRE_INBOUND_HMAC: bool = os.getenv("REQUIRE_INBOUND_HMAC", "true").lower() == "true"
    REQUIRE_NONCE_GUARD: bool = os.getenv("REQUIRE_NONCE_GUARD", "true").lower() == "true"

    VAULT_ADDR: str = os.getenv("VAULT_ADDR", "http://localhost:8200")
    VAULT_TOKEN: str | None = os.getenv("VAULT_TOKEN")
    VAULT_ROLE_ID: str | None = os.getenv("VAULT_ROLE_ID")
    VAULT_SECRET_ID: str | None = os.getenv("VAULT_SECRET_ID")
    VAULT_ENABLED: bool = os.getenv("VAULT_ENABLED", "true").lower() == "true"
    VAULT_FLE_KEY: str = os.getenv("VAULT_FLE_KEY", "notification-fle-key")
    VAULT_SIGN_KEY: str = os.getenv("VAULT_SIGN_KEY", "notification-sign-key")
    VAULT_HMAC_KEY: str = os.getenv("VAULT_HMAC_KEY", "notification-hmac-key")
    VAULT_AUDIT_KEY: str = os.getenv("VAULT_AUDIT_KEY", "notification-audit-key")
    VAULT_SMTP_SECRET_PATH: str = os.getenv("VAULT_SMTP_SECRET_PATH", "secret/data/notification/smtp")
    VAULT_RENEWAL_INTERVAL_SECONDS: int = int(os.getenv("VAULT_RENEWAL_INTERVAL_SECONDS", "1800"))

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/8")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "true").lower() == "true"
    REDIS_NONCE_TTL_SECONDS: int = int(os.getenv("REDIS_NONCE_TTL_SECONDS", "600"))
    REDIS_IDEMPOTENCY_TTL_SECONDS: int = int(os.getenv("REDIS_IDEMPOTENCY_TTL_SECONDS", "86400"))
    RATE_LIMIT_TOKENS: int = int(os.getenv("RATE_LIMIT_TOKENS", "10"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_TOPIC_ORDER_CHECKOUT: str = os.getenv("KAFKA_TOPIC_ORDER_CHECKOUT", "order.checkout")
    KAFKA_TOPIC_PAYMENT_EVENTS: str = os.getenv("KAFKA_TOPIC_PAYMENT_EVENTS", "payment.events")
    KAFKA_TOPIC_SHIPPING_EVENTS: str = os.getenv("KAFKA_TOPIC_SHIPPING_EVENTS", "shipping.events")
    KAFKA_TOPIC_NOTIFICATION_EVENTS: str = os.getenv("KAFKA_TOPIC_NOTIFICATION_EVENTS", "notification.events")
    KAFKA_TOPIC_AUDIT: str = os.getenv("KAFKA_TOPIC_AUDIT", "audit-logs")
    KAFKA_TOPIC_DLQ: str = os.getenv("KAFKA_TOPIC_DLQ", "notification.dlq")
    KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "noti-service")
    KAFKA_ENABLED: bool = os.getenv("KAFKA_ENABLED", "true").lower() == "true"

    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str | None = os.getenv("SMTP_USERNAME")
    SMTP_APP_PASSWORD: str | None = os.getenv("SMTP_APP_PASSWORD")
    SMTP_FROM_ADDRESS: str = os.getenv("SMTP_FROM_ADDRESS", "noreply@example.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Enmerce")
    SMTP_TIMEOUT_SECONDS: int = int(os.getenv("SMTP_TIMEOUT_SECONDS", "10"))
    SMTP_STARTTLS_REQUIRED: bool = os.getenv("SMTP_STARTTLS_REQUIRED", "true").lower() == "true"

    LOCAL_CRYPTO_SECRET: str = os.getenv(
        "LOCAL_CRYPTO_SECRET", "local-dev-notification-crypto-key-32!"
    )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

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
            audit_key_name=self.VAULT_AUDIT_KEY,
            smtp_secret_path=self.VAULT_SMTP_SECRET_PATH,
            enabled=self.VAULT_ENABLED,
        )

    @property
    def redis(self) -> RedisConfig:
        return RedisConfig(
            url=self.REDIS_URL,
            nonce_ttl_seconds=self.REDIS_NONCE_TTL_SECONDS,
            idempotency_ttl_seconds=self.REDIS_IDEMPOTENCY_TTL_SECONDS,
            rate_limit_tokens=self.RATE_LIMIT_TOKENS,
            rate_limit_window_seconds=self.RATE_LIMIT_WINDOW_SECONDS,
            enabled=self.REDIS_ENABLED,
        )

    @property
    def kafka(self) -> KafkaConfig:
        return KafkaConfig(
            bootstrap_servers=self.KAFKA_BOOTSTRAP_SERVERS,
            topic_order_checkout=self.KAFKA_TOPIC_ORDER_CHECKOUT,
            topic_payment_events=self.KAFKA_TOPIC_PAYMENT_EVENTS,
            topic_shipping_events=self.KAFKA_TOPIC_SHIPPING_EVENTS,
            topic_notification_events=self.KAFKA_TOPIC_NOTIFICATION_EVENTS,
            topic_audit=self.KAFKA_TOPIC_AUDIT,
            topic_dlq=self.KAFKA_TOPIC_DLQ,
            consumer_group=self.KAFKA_CONSUMER_GROUP,
            enabled=self.KAFKA_ENABLED,
        )

    @property
    def smtp(self) -> SmtpConfig:
        return SmtpConfig(
            host=self.SMTP_HOST,
            port=self.SMTP_PORT,
            username=self.SMTP_USERNAME,
            app_password=self.SMTP_APP_PASSWORD,
            from_address=self.SMTP_FROM_ADDRESS,
            from_name=self.SMTP_FROM_NAME,
            timeout_seconds=self.SMTP_TIMEOUT_SECONDS,
            starttls_required=self.SMTP_STARTTLS_REQUIRED,
        )


settings = Settings()
