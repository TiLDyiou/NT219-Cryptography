from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class ShippingRateCreate(BaseModel):
    provider_id: str
    name: str
    base_fee: Decimal = Field(ge=0)
    per_kg_fee: Decimal = Field(ge=0)
    currency: str = "VND"
    is_active: bool = True
    metadata: dict[str, Any] | None = None


class ShippingRateUpdate(BaseModel):
    name: str | None = None
    base_fee: Decimal | None = Field(default=None, ge=0)
    per_kg_fee: Decimal | None = Field(default=None, ge=0)
    currency: str | None = None
    is_active: bool | None = None
    metadata: dict[str, Any] | None = None


class ShippingRateResponse(BaseModel):
    id: str
    merchant_id: str
    provider_id: str
    name: str
    base_fee: Decimal
    per_kg_fee: Decimal
    currency: str
    is_active: bool
