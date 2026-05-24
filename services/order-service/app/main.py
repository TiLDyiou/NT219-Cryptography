from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

<<<<<<< HEAD
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import OrderException, custom_exception_handler
=======
from app.api.middleware.hmac_verification import HmacVerificationMiddleware
from app.api.middleware.nonce_guard import NonceGuardMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import OrderException, custom_exception_handler
from app.infrastructure.container import init_container, shutdown_container
from app.infrastructure.persistence.database import init_db
>>>>>>> feat/order-service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
<<<<<<< HEAD
    yield
=======
    await init_container()
    yield
    await shutdown_container()
>>>>>>> feat/order-service


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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
<<<<<<< HEAD
=======
app.add_middleware(HmacVerificationMiddleware)
app.add_middleware(NonceGuardMiddleware)
>>>>>>> feat/order-service

app.add_exception_handler(OrderException, custom_exception_handler)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8003, reload=True)
