import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import custom_exception_handler, CatalogException
from app.core.database import init_db
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)

_db_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db_ready
    try:
        await init_db()
        _db_ready = True
    except Exception as exc:
        logger.critical("init_db failed: %s — service degraded, DB unreachable", exc)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Product Catalog Service API with Security & Opt-Locking",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # M-14: chỉ cho phép các origin cấu hình rõ ràng (không dùng regex .* + credentials).
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_exception_handler(CatalogException, custom_exception_handler)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health_check():
    if not _db_ready:
        return Response(
            content='{"status":"degraded","db":"unreachable","service":"' + settings.PROJECT_NAME + '"}',
            status_code=503,
            media_type="application/json",
        )
    return {"status": "ok", "service": settings.PROJECT_NAME}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
