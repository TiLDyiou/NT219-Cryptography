import json
import logging
import ssl
import time
from uuid import uuid4

import httpx

from app.core.config import PaymentServiceConfig
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.payment_gateway import (
    PaymentChargeRequest,
    PaymentChargeResult,
    PaymentGateway,
    PaymentRefundRequest,
    PaymentRefundResult,
)

logger = logging.getLogger(__name__)


class PaymentHttpClient(PaymentGateway):
    def __init__(self, config: PaymentServiceConfig, crypto_service: CryptoService):
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

    async def charge(self, request: PaymentChargeRequest) -> PaymentChargeResult:
        path = "/api/v1/payments/charge"
        body = {
            "order_id": request.order_id,
            "user_id": request.user_id,
            "amount": str(request.amount),
            "currency": request.currency,
            "payment_method_type": request.payment_method_type,
            "idempotency_key": request.idempotency_key,
        }
        body_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
        response_data = await self._signed_post(path, body_bytes)
        return PaymentChargeResult(
            payment_id=response_data.get("payment_id", str(uuid4())),
            status=response_data.get("status", "succeeded"),
            transaction_ref=response_data.get("transaction_ref"),
        )

    async def refund(self, request: PaymentRefundRequest) -> PaymentRefundResult:
        path = "/api/v1/payments/refund"
        body = {
            "payment_id": request.payment_id,
            "order_id": request.order_id,
            "amount": str(request.amount),
            "reason": request.reason,
        }
        body_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
        response_data = await self._signed_post(path, body_bytes)
        return PaymentRefundResult(
            refund_id=response_data.get("refund_id", str(uuid4())),
            status=response_data.get("status", "succeeded"),
        )

    async def _signed_post(self, path: str, body: bytes) -> dict:
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
        try:
            response = await self._client.post(path, content=body, headers=headers)
            response.raise_for_status()
            return response.json().get("data", response.json())
        except httpx.HTTPError as exc:
            if self._config.dev_stub_on_failure:
                logger.warning("Payment service unavailable; using dev stub: %s", exc)
                return {"payment_id": str(uuid4()), "status": "succeeded"}
            raise

    async def close(self) -> None:
        await self._client.aclose()


class StubPaymentGateway(PaymentGateway):
    async def charge(self, request: PaymentChargeRequest) -> PaymentChargeResult:
        return PaymentChargeResult(
            payment_id=str(uuid4()),
            status="succeeded",
            transaction_ref=f"stub-{request.order_id[:8]}",
        )

    async def refund(self, request: PaymentRefundRequest) -> PaymentRefundResult:
        return PaymentRefundResult(refund_id=str(uuid4()), status="succeeded")
