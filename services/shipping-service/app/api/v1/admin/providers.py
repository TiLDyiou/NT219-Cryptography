from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_admin_user, get_correlation_id, get_db
from app.infrastructure.container import get_container
from app.schemas.provider import ProviderCreate, ProviderResponse, ProviderUpdate
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("/providers", response_model=APIResponse[list[ProviderResponse]])
async def list_providers(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_admin_user),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().providers_use_case(db).list()
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.post("/providers", response_model=APIResponse[ProviderResponse], status_code=201)
async def create_provider(
    body: ProviderCreate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_admin_user),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().providers_use_case(db).create(body.model_dump())
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.put("/providers/{provider_id}", response_model=APIResponse[ProviderResponse])
async def update_provider(
    provider_id: str,
    body: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_admin_user),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    data = await get_container().providers_use_case(db).update(
        provider_id, body.model_dump(exclude_unset=True)
    )
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
