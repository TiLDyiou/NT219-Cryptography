from typing import Any, Optional

from pydantic import BaseModel, Field


class WarehouseCreate(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    address: Optional[str] = None
    city: Optional[str] = None
    country_code: str = Field(..., min_length=2, max_length=2)
    is_active: bool = True
    priority: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    metadata: Optional[dict[str, Any]] = None


class WarehouseResponse(BaseModel):
    id: str
    merchant_id: str
    code: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country_code: str
    is_active: bool
    priority: int
    metadata: dict[str, Any]
    created_at: str
    updated_at: str


class InventoryItemCreate(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    warehouse_id: str
    sku: str
    quantity_on_hand: int = 0
    is_track_inventory: bool = True


class InventoryStockUpdate(BaseModel):
    quantity_on_hand: Optional[int] = None
    delta: Optional[int] = None
    is_track_inventory: Optional[bool] = None
    version: int


class InventoryItemResponse(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str] = None
    warehouse_id: str
    merchant_id: str
    sku: str
    quantity_on_hand: int
    quantity_reserved: int
    quantity_available: int
    is_track_inventory: bool
    version: int
    created_at: str
    updated_at: str


class ReserveLineItem(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    merchant_id: str
    sku: str
    quantity: int = Field(..., gt=0)


class ReserveRequest(BaseModel):
    order_id: str
    saga_id: Optional[str] = None
    idempotency_key: str
    items: list[ReserveLineItem]
    correlation_id: Optional[str] = None


class ReleaseRequest(BaseModel):
    order_id: str
    saga_id: Optional[str] = None
    reason: str = "saga_compensated"


class ConfirmRequest(BaseModel):
    order_id: str
    saga_id: Optional[str] = None


class AvailabilityQueryItem(BaseModel):
    product_id: str
    variant_id: Optional[str] = None


class AvailabilityResponse(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    total_available: int
    in_stock: bool


class ExpireReservationsResponse(BaseModel):
    expired_count: int
