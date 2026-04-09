from fastapi import APIRouter

from app.api.v1.user import order as user_order

api_router = APIRouter()
api_router.include_router(user_order.router, prefix="/user/orders", tags=["User Orders"])

