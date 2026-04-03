from fastapi import APIRouter

from app.api.v1.user import cart as user_cart
from app.api.v1.system import cart as system_cart

api_router = APIRouter()
api_router.include_router(user_cart.router, prefix="/user/carts", tags=["User Carts"])
api_router.include_router(system_cart.router, prefix="/system/carts", tags=["System Carts"])
