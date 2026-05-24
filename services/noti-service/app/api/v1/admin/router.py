from fastapi import APIRouter

from app.api.v1.admin.retry import router as retry_router
from app.api.v1.admin.templates import router as templates_router

router = APIRouter(prefix="/admin")
router.include_router(templates_router)
router.include_router(retry_router)
