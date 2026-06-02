from fastapi import APIRouter

from app.api.v1.user import order as user_order
from app.api.v1.system import orders as system_orders
from app.api.v1.merchant import order as merchant_order

api_router = APIRouter()
api_router.include_router(user_order.router, prefix="/user/orders", tags=["User Orders"])
api_router.include_router(system_orders.router, prefix="/system", tags=["System Internal"])
api_router.include_router(merchant_order.router, prefix="/merchant/orders", tags=["Merchant Orders"])

