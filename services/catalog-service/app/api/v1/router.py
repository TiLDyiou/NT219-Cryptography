from fastapi import APIRouter
from app.api.v1.merchant import product as merchant_product
from app.api.v1.public import product as public_product

api_router = APIRouter()
api_router.include_router(public_product.router, prefix="/public/products", tags=["Public Products"])
api_router.include_router(merchant_product.router, prefix="/merchant/products", tags=["Merchant Products"])
