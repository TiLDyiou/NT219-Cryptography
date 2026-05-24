from decimal import Decimal
from typing import Any

from app.domain.ports.carrier_gateway import CarrierGateway, LabelResult, RateQuote


class MockCarrierAdapter(CarrierGateway):
    async def quote(self, rate_request: dict[str, Any]) -> RateQuote:
        weight = Decimal(str(rate_request.get("weight_grams", 500))) / Decimal("1000")
        return RateQuote(
            provider_code="mock",
            service_name="Mock Standard",
            amount=Decimal("15000") + weight * Decimal("3000"),
            estimated_days=3,
        )

    async def create_label(self, shipment: Any) -> LabelResult:
        suffix = shipment.id.split("-")[0]
        return LabelResult(
            provider_shipment_id=f"mock-{shipment.id}",
            tracking_number=f"MOCK{suffix.upper()}",
            provider_label_url=f"https://carrier.local/labels/{shipment.id}.pdf",
            raw_response={"provider": "mock", "shipment_id": shipment.id},
        )

    async def cancel(self, provider_shipment_id: str) -> bool:
        return bool(provider_shipment_id)

    async def fetch_tracking(self, tracking_number: str) -> list[dict[str, Any]]:
        return [
            {
                "status": "label_created",
                "description": "Mock label created",
                "location": "Mock Hub",
                "tracking_number": tracking_number,
            }
        ]

    async def verify_webhook(self, payload: bytes, headers: dict[str, str]) -> dict[str, Any]:
        return {"verified": True, "payload": payload.decode("utf-8"), "headers": headers}
