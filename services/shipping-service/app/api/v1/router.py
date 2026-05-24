from fastapi import APIRouter

from app.api.v1.admin import overrides as admin_overrides
from app.api.v1.admin import providers as admin_providers
from app.api.v1.merchant import providers as merchant_providers
from app.api.v1.merchant import rates as merchant_rates
from app.api.v1.merchant import shipments as merchant_shipments
from app.api.v1.public import rates_quote, tracking, webhooks_ghn

api_router = APIRouter()
api_router.include_router(merchant_shipments.router, prefix="/merchant", tags=["Merchant Shipments"])
api_router.include_router(merchant_rates.router, prefix="/merchant", tags=["Merchant Rates"])
api_router.include_router(merchant_providers.router, prefix="/merchant", tags=["Merchant Providers"])
api_router.include_router(admin_providers.router, prefix="/admin", tags=["Admin Providers"])
api_router.include_router(admin_overrides.router, prefix="/admin", tags=["Admin Shipments"])
api_router.include_router(tracking.router, prefix="/public", tags=["Public Tracking"])
api_router.include_router(rates_quote.router, prefix="/public", tags=["Public Rates"])
api_router.include_router(webhooks_ghn.router, prefix="/public", tags=["Carrier Webhooks"])
