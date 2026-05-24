from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_current_merchant_id, get_db
from app.infrastructure.container import get_container
from app.schemas.response import APIResponse
from app.schemas.shipment import ShipmentListResponse, ShipmentMerchantResponse

router = APIRouter()


@router.get("/shipments", response_model=APIResponse[list[ShipmentListResponse]])
async def list_shipments(
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    usecase = get_container().merchant_shipments_use_case(db)
    data = await usecase.list(merchant_id, status, limit)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.get("/shipments/{shipment_id}", response_model=APIResponse[ShipmentMerchantResponse])
async def get_shipment(
    shipment_id: str,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    usecase = get_container().get_shipment_use_case(db)
    data = await usecase.execute(shipment_id, merchant_id)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.post("/shipments/{shipment_id}/cancel", response_model=APIResponse[dict])
async def cancel_shipment(
    shipment_id: str,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    usecase = get_container().cancel_shipment_use_case(db)
    data = await usecase.execute(shipment_id, merchant_id)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
