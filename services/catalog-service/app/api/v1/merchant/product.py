from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.dependencies import get_current_merchant_id, get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.response import APIResponse
from app.crud.product import product as crud_product
from app.core.exceptions import EntityNotFoundException

router = APIRouter()

@router.post("", response_model=APIResponse[ProductResponse], status_code=201)
async def create_product_for_merchant(
    *,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    product_in: ProductCreate
):
    """
    Tạo một product mới. MerchantID tự động lấy từ Token.
    Giúp chống việc tạo sản phẩm gắn cho merchant khác (RLS).
    """
    # Gắn cứng merchant_id vào dữ liệu tạo
    product = await crud_product.create(db, obj_in=product_in, ext_data={"merchant_id": merchant_id})
    return APIResponse(success=True, data=ProductResponse.model_validate(product))

@router.put("/{product_id}", response_model=APIResponse[ProductResponse])
async def update_product_for_merchant(
    *,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    product_id: str,
    product_in: ProductUpdate
):
    """
    Sửa product với Optimistic Locking (`version` required).
    Chỉ sửa được sản phẩm do chính mình tạo (RLS).
    """
    product = await crud_product.update_with_lock(
        db, merchant_id=merchant_id, product_id=product_id, obj_in=product_in
    )
    return APIResponse(success=True, data=ProductResponse.model_validate(product))

@router.delete("/{product_id}", response_model=APIResponse[None])
async def soft_delete_product_for_merchant(
    *,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    product_id: str
):
    """Soft delete product."""
    await crud_product.soft_delete(db, merchant_id=merchant_id, product_id=product_id)
    return APIResponse(success=True, message="Product deleted successfully")
