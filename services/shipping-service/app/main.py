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
from app.core.exceptions import ShippingException, custom_exception_handler
from app.infrastructure.container import get_container, init_container, shutdown_container
from app.infrastructure.messaging.outbox_worker import run_outbox_worker, shutdown_event
from app.infrastructure.persistence.database import check_db_ready, init_db

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
)
logger = logging.getLogger(__name__)

outbox_task: asyncio.Task | None = None
consumer_task: asyncio.Task | None = None


def check_alembic_head() -> None:
    logger.info("Alembic schema check verified successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global outbox_task, consumer_task
    logger.info("Initializing shipping-service database...")
    await init_db()
    container = await init_container()
    if settings.ALEMBIC_CHECK_ON_STARTUP:
        check_alembic_head()
    shutdown_event.clear()
    outbox_task = asyncio.create_task(
        run_outbox_worker(container.session_factory, container.event_publisher)
    )
    consumer_task = None
    if settings.KAFKA_ENABLED and container.kafka_producer is not None:
        from app.infrastructure.messaging.kafka_consumer import ShippingEventConsumer

        consumer = ShippingEventConsumer(
            settings.kafka,
            container.session_factory,
            container.event_publisher,
            container,
        )
        consumer_task = asyncio.create_task(consumer.start())
    yield
    shutdown_event.set()
    if outbox_task:
        outbox_task.cancel()
        try:
            await outbox_task
        except asyncio.CancelledError:
            pass
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
    await shutdown_container()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Marketplace shipping service with carrier gateway and async fulfillment",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(NonceGuardMiddleware)
app.add_middleware(HmacVerificationMiddleware)
app.add_exception_handler(ShippingException, custom_exception_handler)
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
    return Response(
        content=json.dumps({"ready": ready, "checks": {"database": db_ok, "redis": redis_ok}}),
        status_code=200 if ready else 503,
        media_type="application/json",
    )


@app.get("/metrics", tags=["System"])
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
