from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from sqlalchemy import select
import uuid
from pathlib import Path

from app.api.dependencies import get_current_merchant_id, get_db
from app.core.config import settings
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.media import UploadImageResponse
from app.schemas.response import APIResponse
from app.crud.product import product as crud_product
from app.core.exceptions import EntityNotFoundException
from app.models.product import Product
from app.models.merchant import Merchant

router = APIRouter()

_ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

def _merchant_name(merchant: Merchant | None) -> str:
    if merchant:
        shop_name = (merchant.metadata_json or {}).get("shop_name")
        if shop_name:
            return shop_name
        if merchant.code:
            return merchant.code
    return "Nhà bán hàng UIT Store"

async def _current_merchant(db: AsyncSession, merchant_id: str) -> Merchant | None:
    return await db.get(Merchant, merchant_id)

def _product_response(product: Product, merchant: Merchant | None) -> ProductResponse:
    row = ProductResponse.model_validate(product)
    row.merchant_name = _merchant_name(merchant)
    return row

@router.get("", response_model=APIResponse[List[ProductResponse]])
async def list_products_for_merchant(
    *,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
):
    result = await db.execute(
        select(Product)
        .filter(
            Product.merchant_id == merchant_id,
            Product.deleted_at.is_(None),
        )
        .order_by(Product.created_at.desc())
    )
    products = result.scalars().all()
    merchant = await _current_merchant(db, merchant_id)
    return APIResponse(success=True, data=[_product_response(p, merchant) for p in products])

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
    merchant = await _current_merchant(db, merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản chưa đăng ký cửa hàng. Vui lòng hoàn tất đăng ký người bán trước khi thêm sản phẩm.",
        )

    # Gắn cứng merchant_id và publish ngay cho flow Seller Center demo.
    product = await crud_product.create(
        db,
        obj_in=product_in,
        ext_data={"merchant_id": merchant_id, "status": "active", "is_active": True},
    )
    return APIResponse(success=True, data=_product_response(product, merchant))

@router.post("/upload-image", response_model=APIResponse[UploadImageResponse], status_code=201)
async def upload_product_image(
    *,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    file: UploadFile = File(...),
):
    """
    Upload ảnh sản phẩm (multipart). Trả về URL công khai — dùng trong product.images[].url.
    Không nhúng base64 vào JSON sản phẩm.
    """
    merchant = await _current_merchant(db, merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản chưa đăng ký cửa hàng.",
        )

    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    ext = _ALLOWED_IMAGE_TYPES.get(content_type)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File rỗng.")
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ảnh vượt quá {settings.MAX_UPLOAD_BYTES // (1024 * 1024)}MB.",
        )

    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = Path(settings.UPLOAD_DIR) / merchant_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(data)

    public_url = f"{settings.PUBLIC_MEDIA_PREFIX}/{merchant_id}/{filename}"
    return APIResponse(success=True, data=UploadImageResponse(url=public_url))

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
    merchant = await _current_merchant(db, merchant_id)
    return APIResponse(success=True, data=_product_response(product, merchant))

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
