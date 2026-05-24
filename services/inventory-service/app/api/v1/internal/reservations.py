from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_db, get_idempotency_key
from app.infrastructure.container import get_container
from app.schemas.inventory import ConfirmRequest, ReleaseRequest, ReserveRequest
from app.schemas.response import APIResponse

router = APIRouter()


@router.post("/reservations/reserve", response_model=APIResponse[dict[str, Any]])
async def reserve_stock(
    request: ReserveRequest,
    db: AsyncSession = Depends(get_db),
    idempotency_key: str = Depends(get_idempotency_key),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    payload = request.model_dump()
    payload["idempotency_key"] = idempotency_key
    payload["correlation_id"] = correlation_id
    usecase = container.reserve_stock_use_case(db)
    result = await usecase.execute(payload)
    return APIResponse(success=True, data=result, correlation_id=correlation_id)


@router.post("/reservations/release", response_model=APIResponse[dict[str, Any]])
async def release_stock(
    request: ReleaseRequest,
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.release_stock_use_case(db)
    result = await usecase.execute(request.model_dump())
    return APIResponse(success=True, data=result, correlation_id=correlation_id)


@router.post("/reservations/confirm", response_model=APIResponse[dict[str, Any]])
async def confirm_reservation(
    request: ConfirmRequest,
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.confirm_reservation_use_case(db)
    result = await usecase.execute(request.model_dump())
    return APIResponse(success=True, data=result, correlation_id=correlation_id)
