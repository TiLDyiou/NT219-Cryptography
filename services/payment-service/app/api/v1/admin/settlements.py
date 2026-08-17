from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_db, get_correlation_id, verify_internal_token
from app.schemas.response import APIResponse
from app.infrastructure.container import get_container

# C-08: API đối soát/chi trả merchant trước đây KHÔNG có xác thực — ai qua được
# tầng HMAC cũng tạo/đánh dấu "đã chi" được. Bắt buộc internal token cho cả router.
router = APIRouter(dependencies=[Depends(verify_internal_token)])


@router.post("/generate", response_model=APIResponse[dict[str, Any]])
async def generate_settlement(
    merchant_id: str = Query(...),
    commission_rate: float = Query(0.05),
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.generate_settlement_use_case(db)

    settlement_id = await usecase.execute(merchant_id, commission_rate)

    return APIResponse(
        success=True,
        data={"settlement_id": settlement_id, "status": "generated" if settlement_id else "no_unsettled_txs"},
        correlation_id=correlation_id,
    )


@router.post("/process/{settlement_id}", response_model=APIResponse[dict[str, Any]])
async def process_settlement(
    settlement_id: str,
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.process_settlement_use_case(db)

    result = await usecase.execute(settlement_id)

    return APIResponse(success=True, data=result, correlation_id=correlation_id)
