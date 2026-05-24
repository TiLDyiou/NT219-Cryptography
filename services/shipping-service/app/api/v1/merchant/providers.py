from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_current_merchant_id, get_db
from app.infrastructure.container import get_container
from app.schemas.provider import ProviderResponse
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("/providers", response_model=APIResponse[list[ProviderResponse]])
async def list_providers(
    db: AsyncSession = Depends(get_db),
    _merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().providers_use_case(db).list(active_only=True)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
