from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.dependencies import get_db
from app.schemas.product import ProductResponse
from app.schemas.response import APIResponse, Pagination
from app.crud.product import product as crud_product
from app.core.exceptions import EntityNotFoundException

router = APIRouter()

# Note: Trong production, ta có thể viết 1 Dependency decorator Cache
# @cache(ttl=60)
@router.get("", response_model=APIResponse[List[ProductResponse]])
async def list_public_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str = Query('active'),
    db: AsyncSession = Depends(get_db)
):
    """
    Public Read: Lấy danh sách sản phẩm.
    Có pagination để đáp ứng lượng request lớn.
    """
    skip = (page - 1) * size
    products, total = await crud_product.get_public_list(db, skip=skip, limit=size, status=status)
    
    return APIResponse(
        success=True,
        data=[ProductResponse.model_validate(p) for p in products],
        pagination=Pagination(total=total, page=page, size=size)
    )

@router.get("/{product_id}", response_model=APIResponse[ProductResponse])
async def get_public_product(product_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy chi tiết sản phẩm dành cho Public Read."""
    product = await crud_product.get(db, id=product_id)
    if not product or product.deleted_at is not None or not product.is_active:
        raise EntityNotFoundException(entity="Product", id=product_id)
        
    return APIResponse(success=True, data=ProductResponse.model_validate(product))
