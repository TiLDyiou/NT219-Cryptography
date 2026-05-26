from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.dependencies import get_db
from app.schemas.merchant import MerchantCreate, MerchantResponse
from app.schemas.response import APIResponse
from app.crud.merchant import merchant as crud_merchant
from app.core.config import settings

router = APIRouter()


async def get_admin(x_admin_token: Optional[str] = Header(None)) -> str:
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token",
        )
    return x_admin_token


@router.post("", response_model=APIResponse[MerchantResponse], status_code=201)
async def create_merchant(
    *,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin),
    merchant_in: MerchantCreate,
):
    """Tạo tài khoản merchant mới. Yêu cầu header X-Admin-Token."""
    existing = await crud_merchant.get_by_code(db, code=merchant_in.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Merchant với code '{merchant_in.code}' đã tồn tại.",
        )
    merchant_obj = await crud_merchant.create(db, obj_in=merchant_in)
    return APIResponse(success=True, data=MerchantResponse.model_validate(merchant_obj))


@router.get("/{merchant_id}", response_model=APIResponse[MerchantResponse])
async def get_merchant(
    merchant_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin),
):
    """Lấy thông tin merchant theo ID."""
    merchant_obj = await crud_merchant.get(db, id=merchant_id)
    if not merchant_obj:
        raise HTTPException(status_code=404, detail="Merchant không tồn tại.")
    return APIResponse(success=True, data=MerchantResponse.model_validate(merchant_obj))
