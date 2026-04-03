from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cart Service"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cart.db")
    CART_TTL_DAYS: int = int(os.getenv("CART_TTL_DAYS", "7"))

    # Shared secret for internal scheduler/worker endpoints.
    INTERNAL_API_TOKEN: str = os.getenv("INTERNAL_API_TOKEN", "cart_internal_dev_token")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
