import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.payment_transaction import PaymentTransaction
from app.domain.value_objects.payment_status import PaymentStatus
from app.domain.ports.payment_repository import PaymentRepository
from app.domain.ports.stripe_gateway import StripeGateway
from app.infrastructure.external.order_client import OrderHttpClient
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.persistence.models.base import generate_uuid
from app.core.exceptions import ForbiddenException, BusinessRuleException

logger = logging.getLogger(__name__)


class CreatePaymentIntentUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepository,
        stripe_gateway: StripeGateway,
        order_client: OrderHttpClient,
        audit_logger: KafkaAuditLogger,
        publishable_key: str,
        session: AsyncSession,
    ):
        self._repo = payment_repository
        self._stripe = stripe_gateway
        self._order_client = order_client
        self._audit = audit_logger
        self._publishable_key = publishable_key
        self._session = session

    async def execute(self, order_id: str, jwt_sub: str) -> dict[str, Any]:
        # 1. Fetch order from order-service — never trust amount from client (T1)
        order = await self._order_client.get_order(order_id)

        # 2. Verify ownership (T1 mitigation)
        if order.get("user_id") != jwt_sub:
            raise ForbiddenException("Order does not belong to this user")

        # 3. Verify order is in the right state
        if order.get("status") != "payment_processing":
            raise BusinessRuleException(
                f"Order must be in payment_processing state (current: {order.get('status')})"
            )

        amount = Decimal(str(order["total_amount"]))
        if amount <= 0:
            raise BusinessRuleException("Invalid order amount")

        currency = order.get("currency", "VND")

        # 4. Idempotency: return existing intent if already created for this order
        existing = await self._repo.get_transaction_by_order_id(order_id, session=self._session)
        if existing and existing.client_secret:
            logger.info("Returning existing intent for order %s", order_id)
            return {
                "payment_id": existing.id,
                "client_secret": existing.client_secret,
                "publishable_key": self._publishable_key,
                "status": existing.psp_status or "pending",
            }

        # 5. Create Stripe PaymentIntent (idempotency_key = order_id for Stripe replay safety)
        stripe_res = await self._stripe.create_payment_intent(
            amount=amount,
            currency=currency,
            idempotency_key=order_id,
            metadata={"order_id": order_id, "user_id": jwt_sub},
            automatic_payment_methods=True,
        )

        # 6. Persist transaction — client_secret is NOT written to any log
        tx = PaymentTransaction(
            id=generate_uuid(),
            order_id=order_id,
            user_id=jwt_sub,
            merchant_id=order.get("merchant_id", "m_default"),
            amount=amount,
            currency=currency,
            status=PaymentStatus.PENDING,
            psp_intent_id=stripe_res.get("id"),
            psp_status=stripe_res.get("status"),
            client_secret=stripe_res.get("client_secret"),
            idempotency_key=order_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        tx = await self._repo.save_transaction(tx, session=self._session)
        await self._session.commit()

        logger.info("PaymentIntent created for order %s (intent_id=%s)", order_id, stripe_res.get("id"))

        return {
            "payment_id": tx.id,
            "client_secret": tx.client_secret,
            "publishable_key": self._publishable_key,
            "status": tx.psp_status or "pending",
        }
