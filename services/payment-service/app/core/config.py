import os
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class VaultConfig(BaseModel):
    vault_addr: str = "http://localhost:8200"
    token: str | None = None
    role_id: str | None = None
    secret_id: str | None = None
    renewal_interval_seconds: int = 1800
    fle_key_name: str = "payment-fle-key"
    sign_key_name: str = "payment-sign-key"
    hmac_key_name: str = "order-hmac-key"
    audit_key_name: str = "payment-audit-key"
    enabled: bool = True


class RedisConfig(BaseModel):
    url: str = "redis://localhost:6379/1"
    nonce_ttl_seconds: int = 600
    enabled: bool = True


class KafkaConfig(BaseModel):
    bootstrap_servers: str = "localhost:9094"
    topic_payments: str = "payment.events"
    topic_audit: str = "audit-logs"
    consumer_group: str = "payment-service"
    enabled: bool = True


class StripeConfig(BaseModel):
    api_key: str = "sk_test_mock"
    webhook_secret: str = "whsec_mock"
    publishable_key: str = "pk_test_mock"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Payment Service"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8004

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://payment_user:payment_dev_pass@localhost:5432/enmerce_payment",
    )
    DATABASE_SQLITE_FALLBACK_URL: str = os.getenv(
        "DATABASE_SQLITE_FALLBACK_URL",
        "sqlite+aiosqlite:///./payment_service.db",
    )
    ENABLE_SQLITE_FALLBACK: bool = os.getenv("ENABLE_SQLITE_FALLBACK", "true").lower() == "true"
    DATABASE_POOL_SIZE: int = int(os.getenv("DATABASE_POOL_SIZE", "10"))
    DATABASE_MAX_OVERFLOW: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))
    DATABASE_POOL_TIMEOUT: int = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
    DATABASE_POOL_RECYCLE: int = int(os.getenv("DATABASE_POOL_RECYCLE", "1800"))
    
    ALEMBIC_CHECK_ON_STARTUP: bool = os.getenv("ALEMBIC_CHECK_ON_STARTUP", "true").lower() == "true"

    INTERNAL_API_TOKEN: str = os.getenv("INTERNAL_API_TOKEN", "payment_internal_dev_token")

    TIMESTAMP_TOLERANCE_SECONDS: int = int(os.getenv("TIMESTAMP_TOLERANCE_SECONDS", "300"))
    REQUIRE_INBOUND_HMAC: bool = os.getenv("REQUIRE_INBOUND_HMAC", "false").lower() == "true"
    REQUIRE_NONCE_GUARD: bool = os.getenv("REQUIRE_NONCE_GUARD", "false").lower() == "true"

    VAULT_ADDR: str = os.getenv("VAULT_ADDR", "http://localhost:8200")
    VAULT_TOKEN: str | None = os.getenv("VAULT_TOKEN")
    VAULT_ROLE_ID: str | None = os.getenv("VAULT_ROLE_ID")
    VAULT_SECRET_ID: str | None = os.getenv("VAULT_SECRET_ID")
    VAULT_ENABLED: bool = os.getenv("VAULT_ENABLED", "true").lower() == "true"
    VAULT_FLE_KEY: str = os.getenv("VAULT_FLE_KEY", "payment-fle-key")
    VAULT_SIGN_KEY: str = os.getenv("VAULT_SIGN_KEY", "payment-sign-key")
    VAULT_HMAC_KEY: str = os.getenv("VAULT_HMAC_KEY", "order-hmac-key")
    VAULT_AUDIT_KEY: str = os.getenv("VAULT_AUDIT_KEY", "payment-audit-key")
    VAULT_RENEWAL_INTERVAL_SECONDS: int = int(os.getenv("VAULT_RENEWAL_INTERVAL_SECONDS", "1800"))

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/1")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "true").lower() == "true"
    REDIS_NONCE_TTL_SECONDS: int = int(os.getenv("REDIS_NONCE_TTL_SECONDS", "600"))

    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")
    KAFKA_TOPIC_PAYMENTS: str = os.getenv("KAFKA_TOPIC_PAYMENTS", "payment.events")
    KAFKA_TOPIC_AUDIT: str = os.getenv("KAFKA_TOPIC_AUDIT", "audit-logs")
    KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "payment-service")
    KAFKA_ENABLED: bool = os.getenv("KAFKA_ENABLED", "true").lower() == "true"

    STRIPE_API_KEY: str = os.getenv("STRIPE_API_KEY", "sk_test_mock")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_mock")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_mock")

    BANK_PAYOUT_STUB: bool = os.getenv("BANK_PAYOUT_STUB", "true").lower() == "true"

    LOCAL_CRYPTO_SECRET: str = os.getenv(
        "LOCAL_CRYPTO_SECRET", "local-dev-payment-crypto-key-32b!"
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
            topic_payments=self.KAFKA_TOPIC_PAYMENTS,
            topic_audit=self.KAFKA_TOPIC_AUDIT,
            consumer_group=self.KAFKA_CONSUMER_GROUP,
            enabled=self.KAFKA_ENABLED,
        )

    @property
    def stripe(self) -> StripeConfig:
        return StripeConfig(
            api_key=self.STRIPE_API_KEY,
            webhook_secret=self.STRIPE_WEBHOOK_SECRET,
            publishable_key=self.STRIPE_PUBLISHABLE_KEY,
        )


settings = Settings()
