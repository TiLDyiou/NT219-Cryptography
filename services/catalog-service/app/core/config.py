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

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/1")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
