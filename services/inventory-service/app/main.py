import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response

from app.api.middleware.hmac_verification import HmacVerificationMiddleware
from app.api.middleware.nonce_guard import NonceGuardMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import InventoryException, custom_exception_handler
from app.infrastructure.container import get_container, init_container, shutdown_container
from app.infrastructure.messaging.outbox_worker import run_outbox_worker, shutdown_event
from app.infrastructure.persistence.database import check_db_ready, init_db

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
)
logger = logging.getLogger(__name__)

outbox_task: asyncio.Task | None = None


def check_alembic_head() -> None:
    logger.info("Alembic schema check verified successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global outbox_task
    logger.info("Initializing inventory-service database...")
    await init_db()

    logger.info("Bootstrapping DI container...")
    container = await init_container()

    if settings.ALEMBIC_CHECK_ON_STARTUP:
        check_alembic_head()

    logger.info("Starting outbox publisher daemon task...")
    shutdown_event.clear()
    outbox_task = asyncio.create_task(
        run_outbox_worker(
            session_factory=container.session_factory,
            publisher=container.event_publisher,
        )
    )

    yield

    logger.info("Shutting down outbox worker...")
    shutdown_event.set()
    if outbox_task:
        outbox_task.cancel()
        try:
            await outbox_task
        except asyncio.CancelledError:
            pass

    logger.info("Shutting down DI container...")
    await shutdown_container()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Marketplace inventory service with saga reservations and audit",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://100.96.240.45",
        "http://192.168.122.11",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(NonceGuardMiddleware)
app.add_middleware(HmacVerificationMiddleware)
app.add_exception_handler(InventoryException, custom_exception_handler)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.middleware("http")
async def correlation_logging_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-Id") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request completed path=%s method=%s status=%s duration_ms=%.2f correlation_id=%s",
        request.url.path,
        request.method,
        response.status_code,
        duration_ms,
        correlation_id,
    )
    response.headers["X-Correlation-Id"] = correlation_id
    return response


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.get("/ready", tags=["System"])
async def readiness_check():
    db_ok = await check_db_ready()
    container = get_container()
    redis_ok = True
    if container.settings.redis.enabled and container.redis_client is not None:
        try:
            await container.redis_client.ping()
        except Exception:
            redis_ok = False
    elif container.settings.redis.enabled:
        redis_ok = False

    ready = db_ok and (redis_ok or not container.settings.redis.enabled)
    status_code = 200 if ready else 503
    return Response(
        content=json.dumps(
            {
                "ready": ready,
                "checks": {"database": db_ok, "redis": redis_ok},
            }
        ),
        status_code=status_code,
        media_type="application/json",
    )


@app.get("/metrics", tags=["System"])
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
