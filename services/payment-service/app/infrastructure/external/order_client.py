import logging
import httpx
from app.core.exceptions import EntityNotFoundException, BusinessRuleException

logger = logging.getLogger(__name__)


class OrderHttpClient:
    def __init__(self, base_url: str, internal_token: str):
        self._base_url = base_url.rstrip("/")
        self._token = internal_token

    async def get_order(self, order_id: str) -> dict:
        """Fetch order metadata from order-service via internal system endpoint."""
        url = f"{self._base_url}/api/v1/system/orders/{order_id}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    url,
                    headers={"X-Internal-Token": self._token},
                )
        except httpx.RequestError as exc:
            logger.error("Order service unreachable: %s", exc)
            raise BusinessRuleException("Order service unavailable")

        if resp.status_code == 404:
            raise EntityNotFoundException("Order", order_id)
        if resp.status_code != 200:
            logger.error("Order service returned %s for order %s", resp.status_code, order_id)
            raise BusinessRuleException(f"Order service error: {resp.status_code}")

        body = resp.json()
        return body.get("data") or body
