from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_db
from app.infrastructure.container import get_container
from app.schemas.response import APIResponse
from app.schemas.shipment import ShipmentPublicResponse

router = APIRouter()


@router.get("/track/{tracking_number}", response_model=APIResponse[ShipmentPublicResponse])
async def track_shipment(
    tracking_number: str,
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().track_shipment_public_use_case(db).execute(tracking_number)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
