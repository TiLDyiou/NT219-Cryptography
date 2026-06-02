import os
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class CatalogServiceConfig(BaseModel):
    base_url: str = "http://localhost:8001"
    timeout_seconds: int = 10
    mtls_enabled: bool = False
    client_cert_path: str | None = None
    client_key_path: str | None = None
    ca_cert_path: str | None = None
    dev_stub_on_failure: bool = False
    internal_token: str = ""


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cart Service"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Keycloak — service tự verify JWT RS256 (không còn tin header X-User-Id).
    KEYCLOAK_URL: str = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
    KEYCLOAK_REALM: str = os.getenv("KEYCLOAK_REALM", "nt219")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cart.db")
    CART_TTL_DAYS: int = int(os.getenv("CART_TTL_DAYS", "7"))

    # Shared secret for internal scheduler/worker endpoints.
    INTERNAL_API_TOKEN: str = os.getenv("INTERNAL_API_TOKEN", "cart_internal_dev_token")

    # Catalog service — dùng để lấy giá sản phẩm phía server (không tin giá từ client).
    CATALOG_SERVICE_URL: str = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8001")
    CATALOG_REQUEST_TIMEOUT_SECONDS: int = int(
        os.getenv("CATALOG_REQUEST_TIMEOUT_SECONDS", "10")
    )
    CATALOG_MTLS_ENABLED: bool = os.getenv("CATALOG_MTLS_ENABLED", "false").lower() == "true"
    CATALOG_CLIENT_CERT: str | None = os.getenv("CATALOG_CLIENT_CERT")
    CATALOG_CLIENT_KEY: str | None = os.getenv("CATALOG_CLIENT_KEY")
    CATALOG_CA_CERT: str | None = os.getenv("CATALOG_CA_CERT")
    CATALOG_DEV_STUB_ON_FAILURE: bool = os.getenv("CATALOG_DEV_STUB_ON_FAILURE", "false").lower() == "true"
    CATALOG_INTERNAL_API_TOKEN: str = os.getenv("CATALOG_INTERNAL_API_TOKEN", "catalog_internal_dev_token")

    # M-14: CORS — danh sách origin được phép (KHÔNG dùng regex .* + credentials).
    CORS_ALLOWED_ORIGINS: str = os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080"
    )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in ("production", "prod", "staging")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def catalog(self) -> CatalogServiceConfig:
        return CatalogServiceConfig(
            base_url=self.CATALOG_SERVICE_URL,
            timeout_seconds=self.CATALOG_REQUEST_TIMEOUT_SECONDS,
            mtls_enabled=self.CATALOG_MTLS_ENABLED,
            client_cert_path=self.CATALOG_CLIENT_CERT,
            client_key_path=self.CATALOG_CLIENT_KEY,
            ca_cert_path=self.CATALOG_CA_CERT,
            dev_stub_on_failure=self.CATALOG_DEV_STUB_ON_FAILURE,
            internal_token=self.CATALOG_INTERNAL_API_TOKEN,
        )

settings = Settings()
