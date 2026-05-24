import logging
from datetime import datetime, timezone
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.value_objects.payment_status import PaymentStatus
from app.domain.ports.payment_repository import PaymentRepository
from app.domain.ports.webhook_log_repository import WebhookLogRepository
from app.domain.ports.outbox_repository import OutboxRepository
from app.domain.ports.stripe_gateway import StripeGateway
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.core.exceptions import EntityNotFoundException, BusinessRuleException

logger = logging.getLogger(__name__)


class HandleWebhookUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepository,
        webhook_log_repository: WebhookLogRepository,
        outbox_repository: OutboxRepository,
        stripe_gateway: StripeGateway,
        audit_logger: KafkaAuditLogger,
        session: AsyncSession,
    ):
        self._repo = payment_repository
        self._wh_log = webhook_log_repository
        self._outbox = outbox_repository
        self._stripe = stripe_gateway
        self._audit = audit_logger
        self._session = session

    async def execute(self, payload_bytes: bytes, sig_header: str) -> dict[str, Any]:
        # 1. Verify signature and construct event
        event = self._stripe.verify_webhook_signature(payload_bytes, sig_header)
        event_id = event["id"]
        event_type = event["type"]
        
        logger.info("Processing Stripe Webhook event: %s (ID: %s)", event_type, event_id)

        # 2. Enforce atomic deduplication (R2)
        log_id = await self._wh_log.insert_if_new(
            event_id=event_id,
            psp_provider="stripe",
            payload=event,
            signature=sig_header,
            session=self._session,
        )
        if not log_id:
            logger.info("Duplicate Stripe webhook event detected (ID: %s). Skipping silently.", event_id)
            return {"success": True, "reason": "duplicate"}

        # Commit insert log immediately to ensure locking/deduplication works between parallel threads
        await self._session.commit()

        # Extract Stripe object
        data_object = event["data"]["object"]
        intent_id = data_object.get("id")

        if not intent_id:
            logger.warning("Stripe event has no payment intent ID associated. Skipping.")
            return {"success": True, "reason": "no_intent_id"}

        # 3. Retrieve canonical Stripe state (R6)
        # Webhook payload might be stale. Re-fetching ensures we have the latest truth.
        stripe_state = await self._stripe.retrieve_payment_intent(intent_id)
        canonical_status = stripe_state.get("status")
        
        # Mapping Stripe status
        target_status = self._map_stripe_status(canonical_status)

        # 4. Row locking and state machine execution (R1, R3)
        # Re-open session and transaction for business updates
        try:
            # SELECT FOR UPDATE to lock the payment transaction row (R1)
            # SQLAlchemy session.get with with_for_update or custom select query:
            # We get transaction by intent_id using database locks
            from sqlalchemy import select
            from app.infrastructure.persistence.models.payment_transaction import PaymentTransactionModel
            
            stmt = (
                select(PaymentTransactionModel)
                .where(PaymentTransactionModel.psp_transaction_id == intent_id)
                .with_for_update()
            )
            result = await self._session.execute(stmt)
            db_obj = result.scalars().first()

            if not db_obj:
                raise EntityNotFoundException("PaymentTransaction", intent_id)

            current_status = PaymentStatus(db_obj.status)

            # R3: Guard illegal state transitions (e.g., succeeded -> requires_action)
            if PaymentStatus.can_transition(current_status, target_status):
                logger.info("Transitioning payment %s from %s to %s", db_obj.id, current_status, target_status)
                
                # Fetch entity to mutate
                tx = await self._repo.get_transaction_by_id(db_obj.id, session=self._session)
                if not tx:
                    raise EntityNotFoundException("PaymentTransaction", db_obj.id)
                    
                tx.status = target_status
                tx.psp_status = canonical_status

                # If transitions to succeeded
                if target_status == PaymentStatus.SUCCEEDED:
                    tx.paid_at = datetime.now(timezone.utc)
                    from app.domain.events import PaymentCompleted
                    event_out = PaymentCompleted(
                        payment_id=tx.id,
                        order_id=tx.order_id,
                        amount=tx.amount,
                        currency=tx.currency,
                        paid_at=tx.paid_at.isoformat(),
                    )
                    await self._outbox.save_event(
                        aggregate_type="payment",
                        aggregate_id=tx.id,
                        event_type="PaymentCompleted",
                        payload=event_out.to_dict(),
                        session=self._session,
                    )
                    
                # If transitions to failed
                elif target_status == PaymentStatus.FAILED:
                    tx.failed_at = datetime.now(timezone.utc)
                    tx.error_code = stripe_state.get("last_payment_error", {}).get("code", "stripe_webhook_decline")
                    tx.error_message = stripe_state.get("last_payment_error", {}).get("message", "Stripe async failure")
                    
                    from app.domain.events import PaymentFailed
                    event_out = PaymentFailed(
                        payment_id=tx.id,
                        order_id=tx.order_id,
                        failure_code=tx.error_code,
                        failure_message=tx.error_message,
                    )
                    await self._outbox.save_event(
                        aggregate_type="payment",
                        aggregate_id=tx.id,
                        event_type="PaymentFailed",
                        payload=event_out.to_dict(),
                        session=self._session,
                    )

                # Save transaction
                await self._repo.save_transaction(tx, session=self._session)
                
                # Log audit
                await self._audit.log_change(
                    session=self._session,
                    table_name="payment_transactions",
                    record_id=tx.id,
                    action="UPDATE",
                    old_data={"id": tx.id, "status": current_status.value},
                    new_data={"id": tx.id, "status": tx.status.value},
                )
            else:
                logger.info(
                    "Stale or illegal webhook transition rejected (from %s to %s) silently for %s (R3)",
                    current_status,
                    target_status,
                    db_obj.id,
                )

            # 5. Mark webhook processed
            await self._wh_log.mark_as_processed(log_id, session=self._session)
            
            await self._session.commit()
            return {"success": True, "status": target_status.value}

        except Exception as e:
            logger.exception("Failed to process webhook transaction log")
            await self._session.rollback()
            raise

    def _map_stripe_status(self, stripe_status: str) -> PaymentStatus:
        mapping = {
            "succeeded": PaymentStatus.SUCCEEDED,
            "requires_payment_method": PaymentStatus.FAILED,
            "requires_action": PaymentStatus.REQUIRES_ACTION,
            "processing": PaymentStatus.PROCESSING,
            "canceled": PaymentStatus.CANCELLED,
        }
        return mapping.get(stripe_status, PaymentStatus.PROCESSING)
