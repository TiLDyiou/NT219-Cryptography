from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, verify_internal_token
from app.crud.cart import cart as crud_cart
from app.schemas.cart import CartResponse, ExpireCartsResponse
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("/{cart_id}", response_model=APIResponse[CartResponse])
async def get_active_cart(
    cart_id: str,
    user_id: str = Query(..., min_length=1),
    _authorized: None = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db),
):
    cart = await crud_cart.get_active_cart_for_user(
        db, cart_id=cart_id, user_id=user_id
    )
    return APIResponse(success=True, data=CartResponse.model_validate(cart))


@router.post("/expire", response_model=APIResponse[ExpireCartsResponse])
async def expire_due_carts(
    _authorized: None = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db),
):
    expired_count = await crud_cart.expire_due_carts(db)
    return APIResponse(success=True, data=ExpireCartsResponse(expired_count=expired_count))
