from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "Catalog Service"
    API_V1_STR: str = "/api/v1"

    # Database
    # Dùng aiosqlite in memory cho demo testing errors, hoặc dùng postgres cho production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./catalog.db")

    # Auth Mock (Keycloak)
    # Lấy keycloak public key ở đây cho verification, nhưng ở đây mock
    # Khi deploy thật, dùng một Token hoặc Role đặc quyền để gọi API sang Vault, kéo AUTH_SECRET_KEY về RAM.
    AUTH_SECRET_KEY: str = "super_secret_mock_key_for_jwt"

    # Vault
    # Sau này khi deploy thì sẽ dùng Vault Agent Injector.
    VAULT_ADDR: str = os.getenv("VAULT_ADDR", "http://127.0.0.1:8200")
    VAULT_TOKEN: str = os.getenv("VAULT_TOKEN", "mock_token")

    # Admin token để tạo merchant (đổi trong .env khi deploy)
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "admin_secret_dev")

    # Keycloak
    KEYCLOAK_URL: str = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
    KEYCLOAK_REALM: str = os.getenv("KEYCLOAK_REALM", "nt219")
    KC_ADMIN_USER: str = os.getenv("KC_ADMIN_USER", "admin")
    KC_ADMIN_PASSWORD: str = os.getenv("KC_ADMIN_PASSWORD", "admin123")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/1")

    # M-14: CORS — danh sách origin được phép (KHÔNG dùng regex .* + credentials).
    CORS_ALLOWED_ORIGINS: str = os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080"
    )

    # Product image uploads (filesystem; production → object storage)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    PUBLIC_MEDIA_PREFIX: str = "/api/v1/catalog/public/media"
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
