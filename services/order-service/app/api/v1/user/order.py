from typing import List, Optional

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_current_user_id, get_db, get_idempotency_key
from app.crud.order import order as crud_order
from app.schemas.order import CheckoutRequest, CheckoutResponse, OrderSummaryResponse
from app.schemas.response import APIResponse

router = APIRouter()


@router.post("/checkout", response_model=APIResponse[CheckoutResponse])
async def checkout(
    payload: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    idempotency_key: str = Depends(get_idempotency_key),
    correlation_id: Optional[str] = Depends(get_correlation_id),
    x_forwarded_for: Optional[str] = Header(None, alias="X-Forwarded-For"),
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
):
    result = await crud_order.checkout(
        db=db,
        user_id=user_id,
        idempotency_key=idempotency_key,
        correlation_id=correlation_id,
        ip_address=x_forwarded_for,
        user_agent=user_agent,
        payload=payload,
    )
    return APIResponse(success=True, data=result, correlation_id=correlation_id)


@router.get("", response_model=APIResponse[List[OrderSummaryResponse]])
async def list_my_orders(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    orders = await crud_order.list_user_orders(db=db, user_id=user_id)
    return APIResponse(
        success=True,
        data=[OrderSummaryResponse.model_validate(order) for order in orders],
        correlation_id=correlation_id,
    )


@router.get("/{order_id}", response_model=APIResponse[OrderSummaryResponse])
async def get_my_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    result = await crud_order.get_user_order(db=db, user_id=user_id, order_id=order_id)
    return APIResponse(
        success=True,
        data=OrderSummaryResponse.model_validate(result),
        correlation_id=correlation_id,
    )

