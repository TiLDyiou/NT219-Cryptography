from app.infrastructure.external.carrier_gateway_factory import CarrierGatewayFactory


class QuoteShippingRateUseCase:
    def __init__(self, carrier_factory: CarrierGatewayFactory):
        self._carrier_factory = carrier_factory

    async def execute(self, request: dict) -> dict:
        carrier = await self._carrier_factory.get(request.get("provider_code"))
        quote = await carrier.quote(request)
        return {
            "provider_code": quote.provider_code,
            "service_name": quote.service_name,
            "amount": quote.amount,
            "currency": quote.currency,
            "estimated_days": quote.estimated_days,
        }
