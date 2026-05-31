from decimal import Decimal
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


class ChargeRequest(BaseModel):
    order_id: str = Field(..., min_length=1, max_length=36)
    amount: Decimal = Field(..., ge=0)
    currency: str = Field(default="VND", min_length=3, max_length=3)
    payment_method_type: str = Field(..., min_length=3, max_length=30)
    merchant_id: str = Field(default="m_default", min_length=1, max_length=36)

    @model_validator(mode="after")
    def validate_payment_method(self):
        allowed = {"credit_card", "e_wallet", "cod"}
        if self.payment_method_type not in allowed:
            raise ValueError("Unsupported payment_method_type.")
        return self


class RefundRequest(BaseModel):
    payment_id: str = Field(..., min_length=1, max_length=36)
    amount: Decimal = Field(..., ge=0)
    reason: Optional[str] = Field(default="Customer request")


class CreateIntentRequest(BaseModel):
    order_id: str = Field(..., min_length=1, max_length=36)


class PaymentIntentResponse(BaseModel):
    payment_id: str
    client_secret: str
    publishable_key: str
    status: str
