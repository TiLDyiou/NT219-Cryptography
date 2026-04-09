from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


ACTIVE_DATABASE_URL = settings.DATABASE_URL


def _build_engine(database_url: str):
    if database_url.startswith("sqlite+aiosqlite://"):
        return create_async_engine(
            database_url,
            echo=False,
            future=True,
        )

    if database_url.startswith("postgresql+asyncpg://"):
        return create_async_engine(
            database_url,
            echo=False,
            future=True,
            pool_pre_ping=True,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            pool_timeout=settings.DATABASE_POOL_TIMEOUT,
            pool_recycle=settings.DATABASE_POOL_RECYCLE,
        )

    raise ValueError(
        "Unsupported DATABASE_URL. Use postgresql+asyncpg:// or sqlite+aiosqlite://."
    )


engine = _build_engine(ACTIVE_DATABASE_URL)


def _build_sessionmaker():
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


AsyncSessionLocal = _build_sessionmaker()


def _switch_to_sqlite_fallback() -> None:
    global engine, AsyncSessionLocal, ACTIVE_DATABASE_URL
    ACTIVE_DATABASE_URL = settings.DATABASE_SQLITE_FALLBACK_URL
    engine = _build_engine(ACTIVE_DATABASE_URL)
    AsyncSessionLocal = _build_sessionmaker()


async def init_db() -> None:
    from app.models.base import Base
    from app.models.order import Order  # noqa: F401
    from app.models.order_address import OrderAddress  # noqa: F401
    from app.models.order_item import OrderItem  # noqa: F401
    from app.models.order_status_history import OrderStatusHistory  # noqa: F401
    from app.models.saga_state import SagaState  # noqa: F401

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        if not settings.ENABLE_SQLITE_FALLBACK:
            raise
        if ACTIVE_DATABASE_URL.startswith("sqlite+aiosqlite://"):
            raise

        _switch_to_sqlite_fallback()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

