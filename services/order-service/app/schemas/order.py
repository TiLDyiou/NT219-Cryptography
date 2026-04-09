from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AddressPayload(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    address_line1: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state_province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)


class CheckoutItem(BaseModel):
    product_id: str = Field(..., min_length=1, max_length=36)
    variant_id: Optional[str] = Field(None, max_length=36)
    merchant_id: str = Field(..., min_length=1, max_length=36)
    sku: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=500)
    variant_label: Optional[str] = Field(None, max_length=255)
    image_url: Optional[str] = None
    quantity: int = Field(..., ge=1, le=999)
    unit_price: Decimal = Field(..., ge=0)


class CheckoutRequest(BaseModel):
    cart_id: str = Field(..., min_length=1, max_length=36)
    payment_method_type: str = Field(..., min_length=3, max_length=50)
    shipping_fee: Decimal = Field(default=0, ge=0)
    customer_note: Optional[str] = None
    items: List[CheckoutItem] = Field(..., min_length=1)
    shipping_address: AddressPayload

    @model_validator(mode="after")
    def validate_payment_method(self):
        allowed = {"credit_card", "e_wallet", "cod"}
        if self.payment_method_type not in allowed:
            raise ValueError("Unsupported payment_method_type.")
        return self


class CheckoutOrderSummary(BaseModel):
    order_id: str
    order_number: str
    merchant_id: str
    status: str
    total_amount: Decimal


class CheckoutResponse(BaseModel):
    order_group_id: str
    parent_order_number: str
    status: str
    orders: List[CheckoutOrderSummary]


class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str]
    merchant_id: str
    sku: str
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)


class OrderSummaryResponse(BaseModel):
    id: str
    order_group_id: str
    parent_order_id: Optional[str]
    order_number: str
    user_id: str
    merchant_id: str
    status: str
    subtotal: Decimal
    shipping_fee: Decimal
    total_amount: Decimal
    item_count: int
    payment_method_type: Optional[str]
    fraud_status: str
    created_at: datetime
    items: List[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)

