from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_current_merchant_id, get_db
from app.infrastructure.container import get_container
from app.schemas.rate import ShippingRateCreate, ShippingRateResponse, ShippingRateUpdate
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("/rates", response_model=APIResponse[list[ShippingRateResponse]])
async def list_rates(
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().merchant_rates_use_case(db).list(merchant_id)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.post("/rates", response_model=APIResponse[ShippingRateResponse], status_code=201)
async def create_rate(
    body: ShippingRateCreate,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().merchant_rates_use_case(db).create(merchant_id, body.model_dump())
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.put("/rates/{rate_id}", response_model=APIResponse[ShippingRateResponse])
async def update_rate(
    rate_id: str,
    body: ShippingRateUpdate,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().merchant_rates_use_case(db).update(
        merchant_id, rate_id, body.model_dump(exclude_unset=True)
    )
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
