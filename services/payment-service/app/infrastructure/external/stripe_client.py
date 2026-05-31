import asyncio
import logging
from decimal import Decimal
from typing import Any
import stripe
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import StripeConfig
from app.domain.ports.stripe_gateway import StripeGateway

logger = logging.getLogger(__name__)


def mask_psp_response(response: dict[str, Any]) -> dict[str, Any]:
    """
    Mask sensitive cards data, PAN fingerprint, card numbers, or tokens
    before storing/logging according to STRIDE and PCI SAQ-A.
    """
    if not response:
        return response
    masked = dict(response)
    
    # Redact customer / source specifics if nested
    if "charges" in masked and "data" in masked["charges"]:
        for ch in masked["charges"]["data"]:
            if "payment_method_details" in ch and "card" in ch["payment_method_details"]:
                card = ch["payment_method_details"]["card"]
                if "fingerprint" in card:
                    card["fingerprint"] = "[REDACTED_FINGERPRINT]"
                    
    if "payment_method" in masked and isinstance(masked["payment_method"], dict):
        pm = masked["payment_method"]
        if "card" in pm:
            card = pm["card"]
            if "fingerprint" in card:
                card["fingerprint"] = "[REDACTED_FINGERPRINT]"

    return masked


class StripeClient(StripeGateway):
    def __init__(self, config: StripeConfig):
        self._config = config
        stripe.api_key = config.api_key

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, Any] | None = None,
        automatic_payment_methods: bool = False,
    ) -> dict[str, Any]:
        amount_cents = int(amount * 100)

        if automatic_payment_methods:
            # Decoupled flow: FE uses PaymentElement + stripe.confirmPayment
            params: dict[str, Any] = {
                "amount": amount_cents,
                "currency": currency.lower(),
                "metadata": metadata or {},
                "automatic_payment_methods": {"enabled": True},
            }
        else:
            # Legacy server-side confirm flow
            params = {
                "amount": amount_cents,
                "currency": currency.lower(),
                "metadata": metadata or {},
                "payment_method_options": {
                    "card": {"request_three_d_secure": "any"}
                },
            }

        logger.info("Calling Stripe PaymentIntent.create (amount_cents=%s)", amount_cents)
        res = await asyncio.to_thread(
            stripe.PaymentIntent.create,
            idempotency_key=idempotency_key,
            **params
        )
        return mask_psp_response(res.to_dict())

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def confirm_payment_intent(
        self,
        intent_id: str,
        payment_method_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        logger.info("Calling Stripe PaymentIntent.confirm (intent_id=%s)", intent_id)
        res = await asyncio.to_thread(
            stripe.PaymentIntent.confirm,
            intent_id,
            payment_method=payment_method_id,
            idempotency_key=idempotency_key
        )
        return mask_psp_response(res.to_dict())

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def retrieve_payment_intent(self, intent_id: str) -> dict[str, Any]:
        logger.info("Calling Stripe PaymentIntent.retrieve (intent_id=%s)", intent_id)
        res = await asyncio.to_thread(
            stripe.PaymentIntent.retrieve,
            intent_id
        )
        return mask_psp_response(res.to_dict())

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def create_refund(
        self,
        intent_id: str,
        amount: Decimal,
        reason: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        amount_cents = int(amount * 100)
        params = {
            "payment_intent": intent_id,
            "amount": amount_cents,
            "reason": reason
        }
        logger.info("Calling Stripe Refund.create (intent_id=%s, amount_cents=%s)", intent_id, amount_cents)
        res = await asyncio.to_thread(
            stripe.Refund.create,
            idempotency_key=idempotency_key,
            **params
        )
        return mask_psp_response(res.to_dict())

    def verify_webhook_signature(
        self,
        payload: bytes,
        sig_header: str,
    ) -> dict[str, Any]:
        try:
            logger.info("Verifying Stripe webhook signature")
            event = stripe.Webhook.construct_event(
                payload, sig_header, self._config.webhook_secret, tolerance=300
            )
            return event.to_dict()
        except stripe.error.SignatureVerificationError as e:
            logger.error("Stripe signature verification failed: %s", e)
            from app.core.exceptions import InvalidSignatureError
            raise InvalidSignatureError("Stripe Webhook Signature Verification Failed")
