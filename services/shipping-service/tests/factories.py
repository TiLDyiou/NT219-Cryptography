from datetime import datetime, timezone

from app.infrastructure.persistence.models import ShippingProviderModel, ShippingRateModel


def get_mock_provider_model(overrides: dict | None = None) -> ShippingProviderModel:
    data = {
        "id": "provider-mock",
        "code": "mock",
        "name": "Mock Carrier",
        "api_base_url": None,
        "is_active": True,
        "supported_countries": ["VN"],
        "capabilities": {"tracking": True},
    }
    data.update(overrides or {})
    return ShippingProviderModel(**data)


def get_mock_rate_model(overrides: dict | None = None) -> ShippingRateModel:
    data = {
        "id": "rate-1",
        "merchant_id": "m-1",
        "provider_id": "provider-mock",
        "name": "Standard",
        "base_fee": 15000,
        "per_kg_fee": 3000,
        "currency": "VND",
        "is_active": True,
    }
    data.update(overrides or {})
    return ShippingRateModel(**data)


def get_order_confirmed_envelope(overrides: dict | None = None) -> dict:
    payload = {
        "order_id": "order-1",
        "merchant_id": "m-1",
        "recipient": {
            "name": "Nguyen Van A",
            "phone": "0900000000",
            "line1": "1 Nguyen Hue",
            "line2": None,
            "city": "Ho Chi Minh City",
            "state": "HCM",
            "postal_code": "700000",
            "country_code": "VN",
        },
        "dimensions_cm": {"length": 10, "width": 10, "height": 10, "weight_grams": 500},
    }
    payload.update(overrides or {})
    return {
        "event_id": "evt-order-confirmed-1",
        "event_type": "order.confirmed",
        "aggregate_type": "order",
        "aggregate_id": payload["order_id"],
        "timestamp": int(datetime.now(timezone.utc).timestamp()),
        "payload": payload,
        "signature": {"value": "test"},
    }
