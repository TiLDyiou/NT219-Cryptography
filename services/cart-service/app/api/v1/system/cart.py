from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, verify_internal_token
from app.crud.cart import cart as crud_cart
from app.schemas.cart import ExpireCartsResponse
from app.schemas.response import APIResponse

router = APIRouter()


@router.post("/expire", response_model=APIResponse[ExpireCartsResponse])
async def expire_due_carts(
    _authorized: None = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db),
):
    expired_count = await crud_cart.expire_due_carts(db)
    return APIResponse(success=True, data=ExpireCartsResponse(expired_count=expired_count))
