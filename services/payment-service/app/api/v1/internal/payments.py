from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_db,
    get_idempotency_key,
    get_correlation_id,
    get_current_user_id,
    verify_internal_token,
)
from app.schemas.payment import ChargeRequest, RefundRequest
from app.schemas.response import APIResponse
from app.infrastructure.container import get_container

# H-02: endpoint internal (order→payment) phải kèm X-Internal-Token hợp lệ — lớp bảo
# vệ thứ 2 cạnh HMAC, để không hở khi REQUIRE_INBOUND_HMAC bị tắt/cấu hình sai.
router = APIRouter(dependencies=[Depends(verify_internal_token)])


@router.post("/charge", response_model=APIResponse[dict[str, Any]])
async def charge(
    request: ChargeRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    idempotency_key: str = Depends(get_idempotency_key),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()

    payload = request.model_dump()
    payload["user_id"] = user_id
    payload["idempotency_key"] = idempotency_key
    payload["correlation_id"] = correlation_id

    usecase = container.charge_use_case(db)
    result = await usecase.execute(payload)

    return APIResponse(success=True, data=result, correlation_id=correlation_id)


@router.post("/refund", response_model=APIResponse[dict[str, Any]])
async def refund(
    request: RefundRequest,
    db: AsyncSession = Depends(get_db),
    requesting_user_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.refund_use_case(db)

    payload = request.model_dump()
    payload["requesting_user_id"] = requesting_user_id
    result = await usecase.execute(payload)

    return APIResponse(success=True, data=result, correlation_id=correlation_id)


@router.get("/{payment_id}", response_model=APIResponse[dict[str, Any]])
async def get_payment(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    requesting_user_id: str = Depends(get_current_user_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.get_payment_use_case(db)

    result = await usecase.execute(payment_id)

    # Verify caller owns this payment
    if result.get("user_id") and result["user_id"] != requesting_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return APIResponse(success=True, data=result, correlation_id=correlation_id)
