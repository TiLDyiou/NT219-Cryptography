from fastapi import APIRouter
from app.api.v1.internal import payments
from app.api.v1.public import webhooks
from app.api.v1.admin import settlements

api_router = APIRouter()

# Mount routes under corresponding sub-prefixes
api_router.include_router(payments.router, prefix="/payments", tags=["Internal Payments"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Public Stripe Webhooks"])
api_router.include_router(settlements.router, prefix="/admin/settlements", tags=["Admin Settlements"])
