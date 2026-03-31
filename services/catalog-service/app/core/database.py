from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import AsyncGenerator
from fastapi import Request
from sqlalchemy import event

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True để debug SQL queries
    future=True,
    pool_recycle=3600
)

# SQLite in-memory / file db requires specific pragma for foreign keys if we use sqlite
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def init_db():
    from app.models.base import Base
    # import các model cần tạo bảng 
    from app.models.merchant import Merchant
    from app.models.product import Product
    
    async with engine.begin() as conn:
        # Trong production nên chạy alembic, đây là cho test/dev setup nhanh
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection for database session"""
    async with AsyncSessionLocal() as session:
        yield session
