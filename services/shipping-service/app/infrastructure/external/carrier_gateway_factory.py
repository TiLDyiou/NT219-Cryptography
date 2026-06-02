import time

from app.core.config import Settings
from app.domain.ports.carrier_gateway import CarrierGateway
from app.infrastructure.external.ghn_carrier_adapter import GHNCarrierAdapter
from app.infrastructure.external.mock_carrier_adapter import MockCarrierAdapter


class CarrierGatewayFactory:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._cache: dict[str, tuple[float, CarrierGateway]] = {}

    async def get(self, provider_code: str | None = None) -> CarrierGateway:
        code = provider_code or self._settings.CARRIER_PROVIDER
        # M-01: ở production KHÔNG ép dùng mock (label/tracking sẽ không bao giờ chạm
        # GHN thật nếu quên tắt cờ). Chỉ tôn trọng CARRIER_FORCE_MOCK ở dev/test, hoặc
        # khi caller chỉ định rõ provider "mock".
        force_mock = self._settings.CARRIER_FORCE_MOCK and not self._settings.is_production
        if force_mock or code == "mock":
            return MockCarrierAdapter()

        cached = self._cache.get(code)
        if cached and cached[0] > time.monotonic():
            return cached[1]

        if code == "ghn":
            adapter = GHNCarrierAdapter(
                self._settings.GHN_API_BASE_URL,
                self._settings.GHN_API_KEY or "",
                self._settings.GHN_WEBHOOK_SECRET,
            )
        else:
            adapter = MockCarrierAdapter()

        self._cache[code] = (time.monotonic() + 300, adapter)
        return adapter
