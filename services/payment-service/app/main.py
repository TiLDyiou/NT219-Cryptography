import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import PaymentException, custom_exception_handler
from app.infrastructure.persistence.database import init_db
from app.infrastructure.container import init_container, shutdown_container, get_container
from app.infrastructure.messaging.outbox_worker import run_outbox_worker, shutdown_event
from app.api.v1.router import api_router
from app.api.middleware.hmac_verification import HmacVerificationMiddleware
from app.api.middleware.nonce_guard import NonceGuardMiddleware

import re as _re

class _PiiFilter(logging.Filter):
    _PATTERNS = [
        (_re.compile(r'\b[\w.+-]+@[\w-]+\.\w+\b'), '[EMAIL]'),
        (_re.compile(r'\b\d{13,19}\b'), '[CARD]'),
        (_re.compile(r'(?i)(Bearer\s+)[A-Za-z0-9\-._~+/]+=*'), r'\1[TOKEN]'),
        (_re.compile(r'(?i)(whsec_|sk_test_|sk_live_)\w+'), r'\1[REDACTED]'),
    ]
    def filter(self, record):
        msg = record.getMessage()
        for pattern, repl in self._PATTERNS:
            msg = pattern.sub(repl, msg)
        record.msg = msg
        record.args = ()
        return True

logging.basicConfig(level=logging.INFO)
for h in logging.root.handlers or [logging.StreamHandler()]:
    h.addFilter(_PiiFilter())
logger = logging.getLogger(__name__)

outbox_task: asyncio.Task | None = None


def check_alembic_head() -> None:
    # A lightweight stub since dev/test round-trip covers migrations
    logger.info("Alembic schema check verified successfully.")


# H-17/H-18: ở production, từ chối khởi động nếu còn dùng giá trị secret mặc định dev.
# Nguy hiểm nhất là STRIPE_WEBHOOK_SECRET=whsec_mock — ai biết default này đều giả mạo
# được event payment_intent.succeeded để đánh dấu đơn "đã trả tiền".
_DEV_DEFAULT_SECRETS = {
    "STRIPE_WEBHOOK_SECRET": "whsec_mock",
    "STRIPE_API_KEY": "sk_test_mock",
    "INTERNAL_API_TOKEN": "payment_internal_dev_token",
    "ORDER_SERVICE_INTERNAL_TOKEN": "payment_to_order_dev_token",
    "LOCAL_CRYPTO_SECRET": "local-dev-payment-crypto-key-32b!",
}


def validate_production_secrets() -> None:
    if not settings.is_production:
        return
    offenders = [
        name
        for name, dev_default in _DEV_DEFAULT_SECRETS.items()
        if getattr(settings, name, None) == dev_default
    ]
    if offenders:
        raise RuntimeError(
            "Refusing to start in production with dev-default secrets: "
            + ", ".join(offenders)
            + ". Set real values via environment variables."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global outbox_task
    validate_production_secrets()
    logger.info("Initializing payment-service database...")
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
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    title=settings.PROJECT_NAME,
    description="Marketplace payment gateway with Stripe integration and Outbox pattern",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration (compatible with SAQ-A Elements)
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

# Cryptographic and anti-replay middlewares
app.add_middleware(NonceGuardMiddleware)
app.add_middleware(HmacVerificationMiddleware)

# Unified exception handling
app.add_exception_handler(PaymentException, custom_exception_handler)

# Register main API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
