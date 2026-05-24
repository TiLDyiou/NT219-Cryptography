import pytest

from app.infrastructure.external.ghn_carrier_adapter import GHNCarrierAdapter


@pytest.mark.asyncio
async def test_ghn_create_label_with_httpx_mock(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": {"order_code": "GHN123", "label_url": "https://label"}}

    class Client:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, headers, json):
            assert url == "https://ghn.test/shiip/public-api/v2/shipping-order/create"
            assert headers["Token"] == "token"
            return Response()

    monkeypatch.setattr("app.infrastructure.external.ghn_carrier_adapter.httpx.AsyncClient", Client)

    class Shipment:
        id = "ship-1"
        order_id = "order-1"
        city = "HCM"
        state = "HCM"
        dimensions_cm = {"weight_grams": 500}

    adapter = GHNCarrierAdapter("https://ghn.test", "token", "secret")
    label = await adapter.create_label(Shipment())
    assert label.provider_shipment_id == "GHN123"
    assert label.tracking_number == "GHN123"
