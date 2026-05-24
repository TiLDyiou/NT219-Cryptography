from fastapi import APIRouter

from app.api.v1.internal import reservations
from app.api.v1.merchant import routes as merchant_routes
from app.api.v1.system import routes as system_routes

api_router = APIRouter()
api_router.include_router(
    merchant_routes.router,
    prefix="/merchant",
    tags=["Merchant Inventory"],
)
api_router.include_router(
    system_routes.router,
    prefix="/system",
    tags=["System Inventory"],
)
api_router.include_router(
    reservations.router,
    prefix="/internal",
    tags=["Internal Reservations"],
)
