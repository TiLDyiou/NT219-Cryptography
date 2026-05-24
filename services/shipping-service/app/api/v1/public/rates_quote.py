from typing import Optional

from fastapi import APIRouter, Depends

from app.api.dependencies import get_correlation_id
from app.infrastructure.container import get_container
from app.schemas.response import APIResponse
from app.schemas.shipment import QuoteRateRequest, QuoteRateResponse

router = APIRouter()


@router.post("/rates/quote", response_model=APIResponse[QuoteRateResponse])
async def quote_rate(
    body: QuoteRateRequest,
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().quote_shipping_rate_use_case().execute(body.model_dump())
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
