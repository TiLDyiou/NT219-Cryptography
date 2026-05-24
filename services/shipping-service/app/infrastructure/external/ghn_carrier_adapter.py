from decimal import Decimal
from typing import Any

import httpx
try:
    from tenacity import retry, stop_after_attempt, wait_exponential
except ModuleNotFoundError:
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator

    def stop_after_attempt(_attempts):
        return None

    def wait_exponential(**_kwargs):
        return None

from app.domain.ports.carrier_gateway import CarrierGateway, LabelResult, RateQuote
from app.infrastructure.external.ghn_webhook_verifier import GHNWebhookVerifier


class GHNCarrierAdapter(CarrierGateway):
    def __init__(self, api_base_url: str, api_key: str, webhook_secret: str):
        self._base_url = api_base_url.rstrip("/")
        self._api_key = api_key
        self._verifier = GHNWebhookVerifier(webhook_secret)

    def _headers(self) -> dict[str, str]:
        return {"Token": self._api_key, "Content-Type": "application/json"}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True)
    async def quote(self, rate_request: dict[str, Any]) -> RateQuote:
        weight = Decimal(str(rate_request.get("weight_grams", 500))) / Decimal("1000")
        return RateQuote(
            provider_code="ghn",
            service_name="GHN Sandbox",
            amount=Decimal("20000") + weight * Decimal("4500"),
            estimated_days=2,
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True)
    async def create_label(self, shipment: Any) -> LabelResult:
        payload = {
            "client_order_code": shipment.order_id,
            "to_name": "encrypted",
            "to_phone": "encrypted",
            "to_address": "encrypted",
            "to_ward_name": shipment.city or "",
            "to_district_name": shipment.state or "",
            "weight": (shipment.dimensions_cm or {}).get("weight_grams", 500),
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{self._base_url}/shiip/public-api/v2/shipping-order/create",
                headers=self._headers(),
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
        data = body.get("data") or body
        order_code = data.get("order_code") or data.get("provider_shipment_id") or shipment.id
        return LabelResult(
            provider_shipment_id=str(order_code),
            tracking_number=str(data.get("tracking_number") or order_code),
            provider_label_url=data.get("label_url"),
            raw_response=body,
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True)
    async def cancel(self, provider_shipment_id: str) -> bool:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{self._base_url}/shiip/public-api/v2/switch-status/cancel",
                headers=self._headers(),
                json={"order_codes": [provider_shipment_id]},
            )
            response.raise_for_status()
        return True

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), reraise=True)
    async def fetch_tracking(self, tracking_number: str) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{self._base_url}/shiip/public-api/v2/shipping-order/detail",
                headers=self._headers(),
                json={"order_code": tracking_number},
            )
            response.raise_for_status()
            body = response.json()
        return body.get("data", {}).get("log", [])

    async def verify_webhook(self, payload: bytes, headers: dict[str, str]) -> dict[str, Any]:
        return self._verifier.verify(payload, headers)
