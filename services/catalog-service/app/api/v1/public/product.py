from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.api.dependencies import get_db
from app.schemas.product import ProductResponse
from app.schemas.response import APIResponse, Pagination
from app.crud.product import product as crud_product
from app.core.exceptions import EntityNotFoundException
from app.models.merchant import Merchant

router = APIRouter()

def _merchant_name(merchant: Merchant | None, merchant_id: str) -> str:
    if merchant:
        shop_name = (merchant.metadata_json or {}).get("shop_name")
        if shop_name:
            return shop_name
        if merchant.code:
            return merchant.code
    return "Nhà bán hàng UIT Store"

async def _attach_merchant_names(db: AsyncSession, products: List) -> List[ProductResponse]:
    merchant_ids = {p.merchant_id for p in products if p.merchant_id}
    merchants = {}
    if merchant_ids:
        result = await db.execute(select(Merchant).filter(Merchant.id.in_(merchant_ids)))
        merchants = {m.id: m for m in result.scalars().all()}

    rows = []
    for p in products:
        row = ProductResponse.model_validate(p)
        row.merchant_name = _merchant_name(merchants.get(p.merchant_id), p.merchant_id)
        rows.append(row)
    return rows

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
        data=await _attach_merchant_names(db, products),
        pagination=Pagination(total=total, page=page, size=size)
    )

@router.get("/{product_id}", response_model=APIResponse[ProductResponse])
async def get_public_product(product_id: str, db: AsyncSession = Depends(get_db)):
    """Lấy chi tiết sản phẩm dành cho Public Read."""
    product = await crud_product.get(db, id=product_id)
    # M-13: chặn truy cập sản phẩm chưa publish (draft/pending/inactive/archived) qua ID.
    # Trước đây chỉ kiểm is_active nên hàng 'draft' (ẩn khỏi list) vẫn xem được qua ID.
    if (
        not product
        or product.deleted_at is not None
        or not product.is_active
        or product.status != "active"
    ):
        raise EntityNotFoundException(entity="Product", id=product_id)

    data = (await _attach_merchant_names(db, [product]))[0]
    return APIResponse(success=True, data=data)
