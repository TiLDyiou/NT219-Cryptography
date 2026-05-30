from fastapi import APIRouter
from app.api.v1.merchant import product as merchant_product
from app.api.v1.public import product as public_product
from app.api.v1.admin import merchant as admin_merchant
from app.api.v1.auth import register as auth_register

api_router = APIRouter()
api_router.include_router(public_product.router,   prefix="/public/products",  tags=["Public Products"])
api_router.include_router(merchant_product.router, prefix="/merchant/products", tags=["Merchant Products"])
api_router.include_router(admin_merchant.router,   prefix="/admin/merchants",   tags=["Admin — Merchants"])
api_router.include_router(auth_register.router,    prefix="/auth/register",     tags=["Auth"])
