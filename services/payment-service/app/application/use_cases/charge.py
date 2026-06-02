import hashlib
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.payment_transaction import PaymentTransaction
from app.domain.value_objects.payment_status import PaymentStatus
from app.domain.ports.payment_repository import PaymentRepository
from app.domain.ports.idempotency_store import IdempotencyStore, IdempotencyClaimStatus
from app.domain.ports.outbox_repository import OutboxRepository
from app.domain.ports.stripe_gateway import StripeGateway
from app.domain.ports.crypto_service import CryptoService
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.core.config import settings

logger = logging.getLogger(__name__)


class ChargeUseCase:
    def __init__(
        self,
        payment_repository: PaymentRepository,
        idempotency_store: IdempotencyStore,
        outbox_repository: OutboxRepository,
        stripe_gateway: StripeGateway,
        crypto_service: CryptoService,
        audit_logger: KafkaAuditLogger,
        session: AsyncSession,
    ):
        self._repo = payment_repository
        self._idemp = idempotency_store
        self._outbox = outbox_repository
        self._stripe = stripe_gateway
        self._crypto = crypto_service
        self._audit = audit_logger
        self._session = session

    async def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        user_id = payload["user_id"]
        order_id = payload["order_id"]
        amount = Decimal(str(payload["amount"]))
        currency = payload.get("currency", "VND")
        payment_method_type = payload["payment_method_type"]
        idempotency_key = payload["idempotency_key"]
        line_items = payload.get("line_items") or []

        # Calculate payload hash for idempotency lock
        raw_payload = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        payload_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

        # 1. Atomic Idempotency check
        claim_status, cached_res = await self._idemp.claim_or_wait(
            user_id=user_id, key=idempotency_key, request_hash=payload_hash
        )
        if claim_status == IdempotencyClaimStatus.CACHED and cached_res:
            logger.info("Idempotency key hit. Replaying cached response.")
            return cached_res

        existing = await self._repo.get_transaction_by_order_id(order_id, session=self._session)
        if existing and existing.client_secret:
            response = {
                "payment_id": existing.id,
                "status": existing.status.value,
                "checkout_url": existing.client_secret,
                "transaction_ref": existing.psp_intent_id,
            }
            await self._idemp.save_response(
                user_id=user_id, key=idempotency_key, request_hash=payload_hash, response=response
            )
            return response

        # 2. Start transaction
        tx_id = f"tx-{hashlib.mdxdigest(idempotency_key.encode()) if False else idempotency_key[:12]}-{order_id[:8]}"
        # Ensure unique id format
        from app.infrastructure.persistence.models.base import generate_uuid
        tx_id = generate_uuid()

        tx = PaymentTransaction(
            id=tx_id,
            order_id=order_id,
            user_id=user_id,
            merchant_id=payload.get("merchant_id", "m_default"),
            amount=amount,
            currency=currency,
            status=PaymentStatus.PENDING,
            idempotency_key=idempotency_key,
        )

        try:
            # Insert initial pending record
            tx = await self._repo.save_transaction(tx, session=self._session)
            await self._audit.log_change(
                session=self._session,
                table_name="payment_transactions",
                record_id=tx.id,
                action="INSERT",
                old_data=None,
                new_data={"id": tx.id, "status": tx.status.value, "amount": str(tx.amount)},
            )
            
            # Execute Stripe Checkout creation for card payments. Webhook is the source of truth.
            stripe_res = {}
            try:
                if payment_method_type == "credit_card":
                    stripe_res = await self._stripe.create_checkout_session(
                        order_id=order_id,
                        amount=amount,
                        currency=currency,
                        line_items=line_items,
                        idempotency_key=idempotency_key,
                        metadata={"order_id": order_id, "user_id": user_id},
                    )
                    session_id = stripe_res.get("id")
                    checkout_url = stripe_res.get("url")

                    tx.psp_intent_id = session_id
                    tx.psp_status = stripe_res.get("payment_status") or stripe_res.get("status")
                    tx.client_secret = checkout_url
                    tx.status = PaymentStatus.PROCESSING

                    response = {
                        "payment_id": tx.id,
                        "status": "processing",
                        "checkout_url": checkout_url,
                        "transaction_ref": session_id,
                    }
                else:
                    stripe_res = await self._stripe.create_payment_intent(
                        amount=amount,
                        currency=currency,
                        idempotency_key=idempotency_key,
                        metadata={"order_id": order_id, "user_id": user_id},
                    )

                    intent_id = stripe_res.get("id")
                    intent_status = stripe_res.get("status")
                    client_secret = stripe_res.get("client_secret")

                    tx.psp_intent_id = intent_id
                    tx.psp_status = intent_status
                    tx.client_secret = client_secret

                    if intent_status == "succeeded":
                        tx.status = PaymentStatus.SUCCEEDED
                        tx.paid_at = datetime.now(timezone.utc)

                        from app.domain.events import PaymentCompleted
                        event = PaymentCompleted(
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
                            payload=event.to_dict(),
                            session=self._session,
                        )

                        response = {"payment_id": tx.id, "status": "succeeded", "transaction_ref": intent_id}
                    elif intent_status == "requires_action":
                        tx.status = PaymentStatus.PROCESSING

                        response = {
                            "payment_id": tx.id,
                            "status": "processing",
                            "client_secret": client_secret,
                            "next_action": stripe_res.get("next_action"),
                        }
                    else:
                        tx.status = PaymentStatus.PROCESSING
                        response = {"payment_id": tx.id, "status": "processing", "transaction_ref": intent_id}

            except Exception as stripe_err:
                logger.warning("Stripe payment declined or errored: %s", stripe_err)
                tx.status = PaymentStatus.FAILED
                tx.failed_at = datetime.now(timezone.utc)
                tx.error_code = getattr(stripe_err, "code", "stripe_charge_error")
                tx.error_message = str(stripe_err)

                # Outbox event for failure
                from app.domain.events import PaymentFailed
                event = PaymentFailed(
                    payment_id=tx.id,
                    order_id=tx.order_id,
                    failure_code=tx.error_code,
                    failure_message=tx.error_message,
                )
                await self._outbox.save_event(
                    aggregate_type="payment",
                    aggregate_id=tx.id,
                    event_type="PaymentFailed",
                    payload=event.to_dict(),
                    session=self._session,
                )

                response = {"payment_id": tx.id, "status": "failed", "error": tx.error_message}

            # 4. Save updated transaction record
            tx = await self._repo.save_transaction(tx, session=self._session)
            await self._audit.log_change(
                session=self._session,
                table_name="payment_transactions",
                record_id=tx.id,
                action="UPDATE",
                old_data={"id": tx.id, "status": "pending"},
                new_data={"id": tx.id, "status": tx.status.value, "psp_intent_id": tx.psp_intent_id},
            )

            # Commit the transaction
            await self._session.commit()
            
            # Save to idempotency store cache
            await self._idemp.save_response(
                user_id=user_id, key=idempotency_key, request_hash=payload_hash, response=response
            )
            return response

        except Exception as e:
            logger.exception("Critical error during charge use case")
            await self._session.rollback()
            raise
