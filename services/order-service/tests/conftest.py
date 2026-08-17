import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_order_service.db")
os.environ.setdefault("VAULT_ENABLED", "false")
os.environ.setdefault("KAFKA_ENABLED", "false")
os.environ.setdefault("REDIS_ENABLED", "false")


pytest_plugins = ("pytest_asyncio",)
