from fastapi import APIRouter

from app.api.v1.user import order as user_order
from app.api.v1.system import orders as system_orders

api_router = APIRouter()
api_router.include_router(user_order.router, prefix="/user/orders", tags=["User Orders"])
api_router.include_router(system_orders.router, prefix="/system", tags=["System Internal"])

