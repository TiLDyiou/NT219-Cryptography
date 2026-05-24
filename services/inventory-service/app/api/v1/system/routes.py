from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_db, verify_internal_token
from app.infrastructure.container import get_container
from app.schemas.inventory import AvailabilityQueryItem, AvailabilityResponse, ExpireReservationsResponse
from app.schemas.response import APIResponse

router = APIRouter()


@router.post("/availability", response_model=APIResponse[list[AvailabilityResponse]])
async def bulk_availability(
    items: list[AvailabilityQueryItem],
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.get_availability_use_case(db)
    payload = [item.model_dump() for item in items]
    data = await usecase.execute(payload)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.post("/reservations/expire", response_model=APIResponse[ExpireReservationsResponse])
async def expire_reservations(
    _authorized: None = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.expire_reservations_use_case(db)
    result = await usecase.execute()
    return APIResponse(success=True, data=result, correlation_id=correlation_id)
