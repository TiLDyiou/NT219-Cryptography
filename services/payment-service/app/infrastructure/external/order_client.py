import logging
import httpx
from app.core.exceptions import EntityNotFoundException, BusinessRuleException

logger = logging.getLogger(__name__)


class OrderHttpClient:
    def __init__(
        self,
        base_url: str,
        internal_token: str,
        mtls_enabled: bool = False,
        client_cert_path: str | None = None,
        client_key_path: str | None = None,
        ca_cert_path: str | None = None,
    ):
        self._base_url = base_url.rstrip("/")
        self._token = internal_token
        self._mtls_enabled = mtls_enabled
        self._client_cert_path = client_cert_path
        self._client_key_path = client_key_path
        self._ca_cert_path = ca_cert_path

    async def get_order(self, order_id: str) -> dict:
        """Fetch order metadata from order-service via internal system endpoint."""
        url = f"{self._base_url}/api/v1/system/orders/{order_id}"
        kwargs = {"timeout": 10.0}
        if self._mtls_enabled:
            import ssl
            verify_ctx = True
            if self._ca_cert_path:
                verify_ctx = ssl.create_default_context(cafile=self._ca_cert_path)
                verify_ctx.check_hostname = False
                if self._client_cert_path and self._client_key_path:
                    verify_ctx.load_cert_chain(
                        certfile=self._client_cert_path,
                        keyfile=self._client_key_path,
                    )
            kwargs["verify"] = verify_ctx

        try:
            async with httpx.AsyncClient(**kwargs) as client:
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
