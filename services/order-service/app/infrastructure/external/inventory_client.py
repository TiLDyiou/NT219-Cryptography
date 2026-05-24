import json
import logging
import ssl
import time
from uuid import uuid4

import httpx

from app.core.config import InventoryServiceConfig
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.inventory_gateway import (
    InventoryConfirmRequest,
    InventoryGateway,
    InventoryReleaseRequest,
    InventoryReserveRequest,
    InventoryReserveResult,
)

logger = logging.getLogger(__name__)


class InventoryHttpClient(InventoryGateway):
    def __init__(self, config: InventoryServiceConfig, crypto_service: CryptoService):
        self._config = config
        self._crypto = crypto_service
        self._client = httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout_seconds,
            verify=self._build_ssl_context(),
        )

    def _build_ssl_context(self) -> ssl.SSLContext | bool:
        if not self._config.mtls_enabled:
            return True
        if not self._config.client_cert_path or not self._config.client_key_path:
            logger.warning("mTLS enabled but cert paths missing; falling back to verify=True")
            return True
        ctx = ssl.create_default_context(cafile=self._config.ca_cert_path)
        ctx.load_cert_chain(
            certfile=self._config.client_cert_path,
            keyfile=self._config.client_key_path,
        )
        return ctx

    async def reserve(self, request: InventoryReserveRequest) -> InventoryReserveResult:
        path = "/api/v1/internal/reservations/reserve"
        body = {
            "order_id": request.order_id,
            "saga_id": request.saga_id,
            "idempotency_key": request.idempotency_key,
            "items": request.items,
            "correlation_id": request.correlation_id,
        }
        body_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
        headers = {"Idempotency-Key": request.idempotency_key}
        if request.correlation_id:
            headers["X-Correlation-Id"] = request.correlation_id
        response_data = await self._signed_post(path, body_bytes, extra_headers=headers)
        return InventoryReserveResult(
            reserved=response_data.get("reserved", True),
            order_id=response_data.get("order_id", request.order_id),
            reservations=response_data.get("reservations", []),
        )

    async def release(self, request: InventoryReleaseRequest) -> dict:
        path = "/api/v1/internal/reservations/release"
        body = {
            "order_id": request.order_id,
            "saga_id": request.saga_id,
            "reason": request.reason,
        }
        body_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
        return await self._signed_post(path, body_bytes)

    async def confirm(self, request: InventoryConfirmRequest) -> dict:
        path = "/api/v1/internal/reservations/confirm"
        body = {"order_id": request.order_id, "saga_id": request.saga_id}
        body_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
        return await self._signed_post(path, body_bytes)

    async def _signed_post(
        self, path: str, body: bytes, extra_headers: dict[str, str] | None = None
    ) -> dict:
        timestamp = str(int(time.time()))
        nonce = str(uuid4())
        signature = await self._crypto.sign_request(
            method="POST",
            path=path,
            body=body,
            timestamp=timestamp,
            nonce=nonce,
        )
        headers = {
            "Content-Type": "application/json",
            "X-Signature": signature.value,
            "X-Timestamp": signature.timestamp,
            "X-Nonce": signature.nonce,
            "X-Key-Version": str(signature.key_version),
        }
        if extra_headers:
            headers.update(extra_headers)
        try:
            response = await self._client.post(path, content=body, headers=headers)
            response.raise_for_status()
            return response.json().get("data", response.json())
        except httpx.HTTPError as exc:
            if self._config.dev_stub_on_failure:
                logger.warning("Inventory service unavailable; using dev stub: %s", exc)
                return {"reserved": True, "order_id": "stub", "reservations": []}
            raise

    async def close(self) -> None:
        await self._client.aclose()


class StubInventoryGateway(InventoryGateway):
    async def reserve(self, request: InventoryReserveRequest) -> InventoryReserveResult:
        return InventoryReserveResult(
            reserved=True,
            order_id=request.order_id,
            reservations=[],
        )

    async def release(self, request: InventoryReleaseRequest) -> dict:
        return {"released": True, "order_id": request.order_id, "released_count": 0}

    async def confirm(self, request: InventoryConfirmRequest) -> dict:
        return {"confirmed": True, "order_id": request.order_id, "confirmed_count": 0}
