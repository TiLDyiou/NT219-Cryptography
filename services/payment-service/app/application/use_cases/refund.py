import logging
from decimal import Decimal
from typing import Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.value_objects.payment_status import PaymentStatus
from app.domain.ports.payment_repository import PaymentRepository
from app.domain.ports.outbox_repository import OutboxRepository
from app.domain.ports.stripe_gateway import StripeGateway
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.core.exceptions import EntityNotFoundException, BusinessRuleException

logger = logging.getLogger(__name__)


class RefundUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepository,
        outbox_repository: OutboxRepository,
        stripe_gateway: StripeGateway,
        audit_logger: KafkaAuditLogger,
        session: AsyncSession,
    ):
        self._repo = payment_repository
        self._outbox = outbox_repository
        self._stripe = stripe_gateway
        self._audit = audit_logger
        self._session = session

    async def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        payment_id = payload["payment_id"]
        amount = Decimal(str(payload["amount"]))
        reason = payload.get("reason", "Customer request")

        tx = await self._repo.get_transaction_by_id(payment_id, session=self._session)
        if not tx:
            raise EntityNotFoundException("PaymentTransaction", payment_id)

        # Validate status allows refund
        if not PaymentStatus.can_transition(tx.status, PaymentStatus.REFUND_PENDING):
            raise BusinessRuleException(f"Cannot refund a transaction in {tx.status.value} status.")

        if amount > tx.amount:
            raise BusinessRuleException("Refund amount cannot exceed original transaction amount.")

        try:
            # 1. Update state to refund_pending
            tx.status = PaymentStatus.REFUND_PENDING
            tx = await self._repo.save_transaction(tx, session=self._session)

            await self._audit.log_change(
                session=self._session,
                table_name="payment_transactions",
                record_id=tx.id,
                action="UPDATE",
                old_data={"id": tx.id, "status": "succeeded"},
                new_data={"id": tx.id, "status": "refund_pending"},
            )

            # 2. Trigger Stripe Refund
            import uuid
            refund_idemp_key = f"ref-{tx.id}-{uuid.uuid4().hex[:8]}"
            stripe_ref = await self._stripe.create_refund(
                intent_id=tx.psp_intent_id,
                amount=amount,
                reason=reason,
                idempotency_key=refund_idemp_key,
            )

            # Stripe refund succeeds immediately in sandbox
            tx.status = PaymentStatus.REFUNDED
            tx = await self._repo.save_transaction(tx, session=self._session)
            
            await self._audit.log_change(
                session=self._session,
                table_name="payment_transactions",
                record_id=tx.id,
                action="UPDATE",
                old_data={"id": tx.id, "status": "refund_pending"},
                new_data={"id": tx.id, "status": "refunded"},
            )

            # 3. Save RefundCompleted Event in Outbox
            from app.domain.events import RefundCompleted
            event = RefundCompleted(
                payment_id=tx.id,
                order_id=tx.order_id,
                refund_id=stripe_ref.get("id", "mock_ref_id"),
                refund_amount=amount,
                is_full=(amount == tx.amount),
            )
            await self._outbox.save_event(
                aggregate_type="payment",
                aggregate_id=tx.id,
                event_type="RefundCompleted",
                payload=event.to_dict(),
                session=self._session,
            )

            await self._session.commit()
            return {"refund_id": event.refund_id, "status": "refunded"}

        except Exception:
            logger.exception("Refund execution failed")
            await self._session.rollback()
            raise
