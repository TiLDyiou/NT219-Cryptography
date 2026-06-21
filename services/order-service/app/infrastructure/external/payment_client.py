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
        
        verify_ctx: ssl.SSLContext | bool | str = True
        if config.mtls_enabled:
            if config.ca_cert_path:
                import ssl
                verify_ctx = ssl.create_default_context(cafile=config.ca_cert_path)
                verify_ctx.check_hostname = False
                if config.client_cert_path and config.client_key_path:
                    verify_ctx.load_cert_chain(
                        certfile=config.client_cert_path,
                        keyfile=config.client_key_path,
                    )
                else:
                    logger.warning("mTLS enabled but cert paths missing")
            else:
                verify_ctx = False

        self._client = httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout_seconds,
            verify=verify_ctx,
        )

    async def charge(self, request: PaymentChargeRequest) -> PaymentChargeResult:
        path = "/api/v1/payments/charge"
        body = {
            "order_id": request.order_id,
            "user_id": request.user_id,
            "amount": str(request.amount),
            "currency": request.currency,
            "payment_method_type": request.payment_method_type,
            "idempotency_key": request.idempotency_key,
            "line_items": request.line_items,
        }
        body_bytes = json.dumps(body, separators=(",", ":")).encode("utf-8")
        response_data = await self._signed_post(
            path,
            body_bytes,
            user_id=request.user_id,
            idempotency_key=request.idempotency_key,
        )
        return PaymentChargeResult(
            payment_id=response_data.get("payment_id", str(uuid4())),
            status=response_data.get("status", "succeeded"),
            transaction_ref=response_data.get("transaction_ref"),
            checkout_url=response_data.get("checkout_url"),
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

    async def _signed_post(
        self,
        path: str,
        body: bytes,
        user_id: str | None = None,
        idempotency_key: str | None = None,
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
        # H-02: kèm internal token (lớp 2 cạnh HMAC) cho endpoint internal của payment.
        if getattr(self._config, "internal_token", ""):
            headers["X-Internal-Token"] = self._config.internal_token
        if user_id:
            headers["X-User-Id"] = user_id
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
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
            checkout_url=None,
        )

    async def refund(self, request: PaymentRefundRequest) -> PaymentRefundResult:
        return PaymentRefundResult(refund_id=str(uuid4()), status="succeeded")
