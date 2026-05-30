from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_merchant_id, get_db
from app.schemas.merchant import MerchantResponse
from app.schemas.response import APIResponse
from app.crud.merchant import merchant as crud_merchant
from app.models.merchant import Merchant

router = APIRouter()

class MerchantSelfRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)

@router.post("/register", response_model=APIResponse[MerchantResponse], status_code=201)
async def register_merchant(
    *,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    reg_in: MerchantSelfRegister
):
    """
    Cho phép một user đã đăng nhập tự đăng ký thành Merchant (Người bán).
    ID của merchant sẽ khớp với sub (UUID) của user từ Keycloak.
    """
    # Kiểm tra xem merchant đã tồn tại với ID này chưa
    existing_by_id = await crud_merchant.get(db, id=merchant_id)
    if existing_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản này đã được đăng ký làm người bán.",
        )

    # Kiểm tra xem code đã được dùng chưa
    existing_by_code = await crud_merchant.get_by_code(db, code=reg_in.code)
    if existing_by_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mã cửa hàng '{reg_in.code}' đã được sử dụng. Vui lòng chọn mã khác.",
        )

    # Tạo merchant mới trong DB với id = merchant_id
    db_obj = Merchant(
        id=merchant_id,
        code=reg_in.code,
        status="active",  # Tự động kích hoạt để demo nhanh gọn
        is_verified=True,
        is_active=True,
        metadata_json={"shop_name": reg_in.name}
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    return APIResponse(success=True, data=MerchantResponse.model_validate(db_obj))

@router.get("/me", response_model=APIResponse[MerchantResponse])
async def get_my_merchant_profile(
    *,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
):
    merchant_obj = await crud_merchant.get(db, id=merchant_id)
    if not merchant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản này chưa đăng ký làm người bán.",
        )
    return APIResponse(success=True, data=MerchantResponse.model_validate(merchant_obj))
