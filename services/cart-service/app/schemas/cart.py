from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CartItemAddRequest(BaseModel):
    cart_version: int = Field(..., ge=1)
    product_id: str = Field(..., min_length=1, max_length=36)
    variant_id: Optional[str] = Field(None, max_length=36)
    quantity: int = Field(..., ge=1, le=999)
    unit_price_snapshot: Decimal = Field(..., ge=0)
    product_name_snapshot: str = Field(..., min_length=1, max_length=500)
    variant_label_snapshot: Optional[str] = Field(None, max_length=255)
    image_url_snapshot: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class CartItemUpdateRequest(BaseModel):
    cart_version: int = Field(..., ge=1)
    quantity: int = Field(..., ge=1, le=999)


class CartConvertRequest(BaseModel):
    cart_version: int = Field(..., ge=1)


class CartItemResponse(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str]
    merchant_id: str
    quantity: int
    unit_price_snapshot: Decimal
    product_name_snapshot: str
    variant_label_snapshot: Optional[str]
    image_url_snapshot: Optional[str]
    metadata_json: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    id: str
    user_id: str
    merchant_id: str
    status: str
    currency_code: str
    subtotal: Decimal
    item_count: int
    notes: Optional[str]
    metadata_json: Dict[str, Any]
    expires_at: datetime
    version: int
    items: List[CartItemResponse]

    model_config = ConfigDict(from_attributes=True)


class ExpireCartsResponse(BaseModel):
    expired_count: int
