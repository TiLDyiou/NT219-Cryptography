"""Client gọi catalog-service để lấy GIÁ và thông tin sản phẩm phía server.

C-11/M-12: cart KHÔNG được tin unit_price_snapshot / product_name / merchant_id do
client gửi (kẻ tấn công có thể đặt giá 0đ). Giá và chủ sở hữu lấy từ catalog.
"""
from decimal import Decimal
from typing import Optional

import httpx

from app.core.config import settings
from app.core.exceptions import BusinessRuleException, EntityNotFoundException


class CatalogProduct:
    def __init__(self, product_id: str, name: str, base_price: Decimal, merchant_id: str):
        self.product_id = product_id
        self.name = name
        self.base_price = base_price
        self.merchant_id = merchant_id


async def fetch_product(product_id: str) -> CatalogProduct:
    """Lấy sản phẩm public từ catalog. Raise nếu không tồn tại / catalog lỗi."""
    url = f"{settings.CATALOG_SERVICE_URL.rstrip('/')}/api/v1/public/products/{product_id}"
    try:
        async with httpx.AsyncClient(timeout=settings.CATALOG_REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.get(url)
    except httpx.HTTPError as exc:
        raise BusinessRuleException(f"Không xác minh được sản phẩm với Catalog Service: {exc}")

    if resp.status_code == 404:
        raise EntityNotFoundException(entity="Product", entity_id=product_id)
    if resp.status_code != 200:
        raise BusinessRuleException(f"Catalog Service trả lỗi: {resp.status_code}")

    data = resp.json().get("data") or {}
    base_price = data.get("base_price")
    merchant_id = data.get("merchant_id")
    name = data.get("name")
    if base_price is None or merchant_id is None:
        raise BusinessRuleException("Dữ liệu sản phẩm từ Catalog không hợp lệ.")
    return CatalogProduct(
        product_id=product_id,
        name=name or product_id,
        base_price=Decimal(str(base_price)),
        merchant_id=str(merchant_id),
    )
