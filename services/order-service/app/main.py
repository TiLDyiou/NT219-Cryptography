import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware.hmac_verification import HmacVerificationMiddleware
from app.api.middleware.nonce_guard import NonceGuardMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import OrderException, custom_exception_handler
from app.infrastructure.container import init_container, shutdown_container
from app.infrastructure.persistence.database import init_db

logger = logging.getLogger(__name__)

_payment_consumer_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _payment_consumer_task
    await init_db()
    container = await init_container()

    if settings.KAFKA_ENABLED:
        try:
            from app.infrastructure.messaging.payment_event_consumer import build_payment_event_consumer
            consumer = await build_payment_event_consumer(settings.kafka, container.payment_event_verifier)
            _payment_consumer_task = asyncio.create_task(consumer.start())
            logger.info("Payment event consumer started (topic=%s)", settings.KAFKA_TOPIC_PAYMENT_EVENTS)
        except Exception:
            logger.warning("Payment event consumer failed to start", exc_info=True)

    yield

    if _payment_consumer_task is not None:
        _payment_consumer_task.cancel()
        try:
            await _payment_consumer_task
        except asyncio.CancelledError:
            pass

    await shutdown_container()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Order Service API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
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
app.add_middleware(HmacVerificationMiddleware)
app.add_middleware(NonceGuardMiddleware)

app.add_exception_handler(OrderException, custom_exception_handler)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8003, reload=True)
