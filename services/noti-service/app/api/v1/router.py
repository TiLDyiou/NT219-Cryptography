from fastapi import APIRouter

from app.api.v1.admin.router import router as admin_router

api_router = APIRouter()
api_router.include_router(admin_router)
