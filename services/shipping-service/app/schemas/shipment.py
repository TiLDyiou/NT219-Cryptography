from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class AddressIn(BaseModel):
    name: str | None = None
    phone: str | None = None
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country_code: str = "VN"


class QuoteRateRequest(BaseModel):
    provider_code: str | None = None
    weight_grams: int = Field(gt=0)
    dimensions_cm: dict[str, Any] | None = None
    from_postal_code: str | None = None
    to_postal_code: str | None = None


class QuoteRateResponse(BaseModel):
    provider_code: str
    service_name: str
    amount: Decimal
    currency: str
    estimated_days: int | None = None


class ShipmentListResponse(BaseModel):
    id: str
    order_id: str
    merchant_id: str
    status: str
    tracking_number: str | None = None
    created_at: datetime


class ShipmentMerchantResponse(BaseModel):
    id: str
    order_id: str
    merchant_id: str
    status: str
    tracking_number: str | None = None
    recipient_name: str | None = None
    recipient_phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country_code: str
    version: int


class TrackingEventResponse(BaseModel):
    status: str
    description: str
    location: str | None = None
    occurred_at: datetime | None = None


class ShipmentPublicResponse(BaseModel):
    tracking_number: str | None
    status: str
    address: dict[str, str | None]
    events: list[TrackingEventResponse]


class TrackingWebhookEvent(BaseModel):
    tracking_number: str
    status: str
    description: str | None = None
    location: str | None = None
    raw_payload: dict[str, Any] | None = None
