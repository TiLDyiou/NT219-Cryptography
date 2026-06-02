from fastapi import APIRouter, Depends

from app.api.dependencies import require_admin_token
from app.api.v1.admin.retry import router as retry_router
from app.api.v1.admin.templates import router as templates_router

# C-09: mọi route admin (template + retry) phải qua xác thực admin token.
router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin_token)])
router.include_router(templates_router)
router.include_router(retry_router)
