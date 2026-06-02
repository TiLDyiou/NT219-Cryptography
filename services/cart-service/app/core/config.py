from pydantic_settings import BaseSettings, SettingsConfigDict
import os


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


settings = Settings()
