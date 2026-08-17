import logging
from decimal import Decimal
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.value_objects.payment_status import PaymentStatus
from app.domain.ports.payment_repository import PaymentRepository
from app.domain.ports.outbox_repository import OutboxRepository
from app.domain.ports.stripe_gateway import StripeGateway
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.external.stripe_client import to_minor_units
from app.core.exceptions import (
    EntityNotFoundException,
    BusinessRuleException,
    ForbiddenException,
)

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
        requesting_user_id = payload.get("requesting_user_id")

        tx = await self._repo.get_transaction_by_id(payment_id, session=self._session)
        if not tx:
            raise EntityNotFoundException("PaymentTransaction", payment_id)

        # H-01: kiểm tra quyền sở hữu — caller phải là chủ giao dịch.
        if requesting_user_id and tx.user_id and requesting_user_id != tx.user_id:
            raise ForbiddenException("Not allowed to refund this payment.")

        # Validate status allows refund
        if not PaymentStatus.can_transition(tx.status, PaymentStatus.REFUND_PENDING):
            raise BusinessRuleException(f"Cannot refund a transaction in {tx.status.value} status.")

        if amount > tx.amount:
            raise BusinessRuleException("Refund amount cannot exceed original transaction amount.")

        is_partial = amount < tx.amount
        prev_status = tx.status.value

        try:
            # 1. Update state to refund_pending
            tx.status = PaymentStatus.REFUND_PENDING
            tx = await self._repo.save_transaction(tx, session=self._session)

            await self._audit.log_change(
                session=self._session,
                table_name="payment_transactions",
                record_id=tx.id,
                action="UPDATE",
                old_data={"id": tx.id, "status": prev_status},
                new_data={"id": tx.id, "status": "refund_pending"},
            )

            # 2. C-07: refund cần PaymentIntent (pi_). Nếu lưu Checkout Session (cs_),
            # tra cứu payment_intent thật trước khi gọi Stripe.
            refund_target = tx.psp_intent_id
            if refund_target and str(refund_target).startswith("cs_"):
                sess = await self._stripe.retrieve_checkout_session(refund_target)
                refund_target = sess.get("payment_intent") or refund_target

            # H-01: idempotency key TIỀN ĐỊNH theo (payment_id, số tiền minor-units)
            # để retry không tạo refund trùng. Trước đây dùng uuid ngẫu nhiên mỗi lần.
            refund_idemp_key = f"ref-{tx.id}-{to_minor_units(amount, tx.currency)}"
            stripe_ref = await self._stripe.create_refund(
                intent_id=refund_target,
                amount=amount,
                currency=tx.currency,
                reason=reason,
                idempotency_key=refund_idemp_key,
            )

            # M-07: refund một phần → PARTIALLY_REFUNDED (cho phép hoàn tiếp),
            # chỉ đánh dấu REFUNDED khi hoàn toàn bộ.
            new_status = PaymentStatus.PARTIALLY_REFUNDED if is_partial else PaymentStatus.REFUNDED
            tx.status = new_status
            tx = await self._repo.save_transaction(tx, session=self._session)

            await self._audit.log_change(
                session=self._session,
                table_name="payment_transactions",
                record_id=tx.id,
                action="UPDATE",
                old_data={"id": tx.id, "status": "refund_pending"},
                new_data={"id": tx.id, "status": new_status.value},
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
            return {"refund_id": event.refund_id, "status": new_status.value}

        except Exception:
            logger.exception("Refund execution failed")
            await self._session.rollback()
            raise
