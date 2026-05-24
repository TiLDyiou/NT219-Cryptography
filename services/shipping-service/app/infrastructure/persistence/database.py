from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

ACTIVE_DATABASE_URL = settings.DATABASE_URL


def _build_engine(database_url: str):
    if database_url.startswith("sqlite+aiosqlite://"):
        return create_async_engine(database_url, echo=False, future=True)

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

    raise ValueError("Unsupported DATABASE_URL. Use postgresql+asyncpg:// or sqlite+aiosqlite://.")


engine = _build_engine(ACTIVE_DATABASE_URL)


def _build_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)


AsyncSessionLocal = _build_sessionmaker()


def _switch_to_sqlite_fallback() -> None:
    global engine, AsyncSessionLocal, ACTIVE_DATABASE_URL
    ACTIVE_DATABASE_URL = settings.DATABASE_SQLITE_FALLBACK_URL
    engine = _build_engine(ACTIVE_DATABASE_URL)
    AsyncSessionLocal = _build_sessionmaker()


async def init_db() -> None:
    from app.infrastructure.persistence.models import Base

    try:
        if ACTIVE_DATABASE_URL.startswith("sqlite+aiosqlite://"):
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


async def check_db_ready() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return True
    except Exception:
        return False
