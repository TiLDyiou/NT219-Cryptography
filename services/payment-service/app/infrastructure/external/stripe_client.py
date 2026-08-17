import asyncio
import logging
from decimal import Decimal
from typing import Any
import stripe
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import StripeConfig
from app.domain.ports.stripe_gateway import StripeGateway

logger = logging.getLogger(__name__)


ZERO_DECIMAL_CURRENCIES = {"vnd", "jpy", "krw"}


def to_minor_units(amount: Decimal, currency: str) -> int:
    if currency.lower() in ZERO_DECIMAL_CURRENCIES:
        return int(amount)
    return int(amount * 100)


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
    async def create_checkout_session(
        self,
        order_id: str,
        amount: Decimal,
        currency: str,
        line_items: list[dict[str, Any]],
        idempotency_key: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        currency_code = currency.lower()
        stripe_line_items = []
        for item in line_items:
            quantity = int(item.get("quantity", 1))
            unit_amount = to_minor_units(Decimal(str(item["unit_amount"])), currency_code)
            stripe_line_items.append(
                {
                    "quantity": quantity,
                    "price_data": {
                        "currency": currency_code,
                        "unit_amount": unit_amount,
                        "product_data": {"name": str(item["name"])[:500]},
                    },
                }
            )

        if not stripe_line_items:
            stripe_line_items.append(
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": currency_code,
                        "unit_amount": to_minor_units(amount, currency_code),
                        "product_data": {"name": f"Order {order_id}"},
                    },
                }
            )

        metadata = metadata or {}
        success_url = self._config.checkout_success_url.replace("{ORDER_ID}", order_id)
        cancel_url = self._config.checkout_cancel_url.replace("{ORDER_ID}", order_id)

        logger.info("Calling Stripe Checkout Session.create (order_id=%s)", order_id)
        res = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="payment",
            line_items=stripe_line_items,
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=order_id,
            metadata=metadata,
            payment_intent_data={"metadata": metadata},
            idempotency_key=idempotency_key,
        )
        return mask_psp_response(res.to_dict())

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
        amount_cents = to_minor_units(amount, currency)

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
    async def retrieve_checkout_session(self, session_id: str) -> dict[str, Any]:
        logger.info("Calling Stripe checkout.Session.retrieve (session_id=%s)", session_id)
        res = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
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
        currency: str = "vnd",
        reason: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        # C-06: dùng to_minor_units để xử lý đúng tiền tệ 0 chữ số thập phân (VND/JPY/KRW);
        # int(amount*100) trước đây làm hoàn dư gấp 100 lần với VND.
        amount_minor = to_minor_units(amount, currency)
        # C-07: Stripe yêu cầu payment_intent dạng pi_. Nếu đây là Checkout Session (cs_),
        # phải tra cứu payment_intent thật trước khi gọi (xử lý ở RefundUseCase).
        params = {
            "payment_intent": intent_id,
            "amount": amount_minor,
            "reason": reason,
        }
        logger.info("Calling Stripe Refund.create (intent_id=%s, amount_minor=%s)", intent_id, amount_minor)
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
