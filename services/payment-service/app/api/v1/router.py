from fastapi import APIRouter
from app.api.v1.internal import payments
from app.api.v1.public import webhooks, intents
from app.api.v1.admin import settlements

api_router = APIRouter()

# Public endpoint: FE calls to get client_secret (JWT-authenticated, HMAC-excluded)
api_router.include_router(intents.router, prefix="/payments", tags=["Public Payment Intents"])
# Internal endpoint: order-service calls /charge
api_router.include_router(payments.router, prefix="/payments", tags=["Internal Payments"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Public Stripe Webhooks"])
api_router.include_router(settlements.router, prefix="/admin/settlements", tags=["Admin Settlements"])
