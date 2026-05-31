from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.payment_transaction import PaymentTransaction
from app.domain.ports.payment_repository import PaymentRepository
from app.infrastructure.persistence.models.payment_transaction import PaymentTransactionModel
from app.infrastructure.persistence.models.payment_method import PaymentMethodModel
from app.domain.value_objects.payment_status import PaymentStatus


class PgPaymentRepository(PaymentRepository):
    async def save_transaction(self, tx: PaymentTransaction, session: Any = None) -> PaymentTransaction:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
            
        # Get existing record
        db_obj = await session.get(PaymentTransactionModel, tx.id)
        if db_obj:
            # Optimistic Locking Check
            if db_obj.version != tx.version:
                from app.core.exceptions import OptimisticLockException
                raise OptimisticLockException(expected_version=tx.version, current_version=db_obj.version)
                
            db_obj.status = tx.status.value
            db_obj.psp_transaction_id = tx.psp_intent_id
            db_obj.psp_status = tx.psp_status
            db_obj.payment_method_id = tx.payment_method_id
            db_obj.failure_code = tx.error_code
            db_obj.failure_message = tx.error_message
            db_obj.client_secret = tx.client_secret
            db_obj.version = tx.version + 1
            db_obj.paid_at = tx.paid_at
            db_obj.failed_at = tx.failed_at
            db_obj.updated_at = tx.updated_at
            
            await session.flush()
            tx.version = db_obj.version
            return tx
        else:
            db_obj = PaymentTransactionModel(
                id=tx.id,
                order_id=tx.order_id,
                user_id=tx.user_id,
                merchant_id=tx.merchant_id,
                payment_method_id=tx.payment_method_id,
                transaction_type="charge",
                status=tx.status.value,
                amount=tx.amount,
                currency_code=tx.currency,
                psp_provider="stripe",
                psp_transaction_id=tx.psp_intent_id,
                psp_status=tx.psp_status,
                client_secret=tx.client_secret,
                idempotency_key=tx.idempotency_key or tx.id,
                version=1,
                created_at=tx.created_at,
                updated_at=tx.updated_at,
            )
            session.add(db_obj)
            await session.flush()
            tx.version = db_obj.version
            return tx

    async def get_transaction_by_id(self, tx_id: str, session: Any = None) -> PaymentTransaction | None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
        db_obj = await session.get(PaymentTransactionModel, tx_id)
        if not db_obj:
            return None
        return self._to_entity(db_obj)

    async def get_transaction_by_intent_id(self, intent_id: str, session: Any = None) -> PaymentTransaction | None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
        stmt = select(PaymentTransactionModel).where(PaymentTransactionModel.psp_transaction_id == intent_id)
        result = await session.execute(stmt)
        db_obj = result.scalars().first()
        if not db_obj:
            return None
        return self._to_entity(db_obj)

    async def get_transaction_by_order_id(self, order_id: str, session: Any = None) -> PaymentTransaction | None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
        stmt = select(PaymentTransactionModel).where(PaymentTransactionModel.order_id == order_id).limit(1)
        result = await session.execute(stmt)
        db_obj = result.scalars().first()
        if not db_obj:
            return None
        return self._to_entity(db_obj)

    async def save_payment_method(self, pm_data: dict[str, Any], session: Any = None) -> None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")
        
        # Check if already exists
        stmt = select(PaymentMethodModel).where(
            PaymentMethodModel.psp_payment_method_id == pm_data["psp_payment_method_id"]
        )
        result = await session.execute(stmt)
        existing = result.scalars().first()
        if existing:
            return
            
        db_obj = PaymentMethodModel(
            user_id=pm_data["user_id"],
            method_type=pm_data["method_type"],
            psp_provider=pm_data.get("psp_provider", "stripe"),
            psp_payment_method_id=pm_data["psp_payment_method_id"],
            psp_customer_id=pm_data.get("psp_customer_id"),
            card_last4=pm_data.get("card_last4"),
            card_brand=pm_data.get("card_brand"),
            card_fingerprint=pm_data.get("card_fingerprint"),
            billing_name_encrypted=pm_data.get("billing_name_encrypted"),
            billing_email_encrypted=pm_data.get("billing_email_encrypted"),
            is_default=pm_data.get("is_default", False),
            is_verified=pm_data.get("is_verified", True),
            status="active"
        )
        session.add(db_obj)
        await session.flush()

    def _to_entity(self, db_obj: PaymentTransactionModel) -> PaymentTransaction:
        return PaymentTransaction(
            id=db_obj.id,
            order_id=db_obj.order_id,
            user_id=db_obj.user_id,
            merchant_id=db_obj.merchant_id,
            amount=db_obj.amount,
            currency=db_obj.currency_code,
            status=PaymentStatus(db_obj.status),
            psp_intent_id=db_obj.psp_transaction_id,
            psp_status=db_obj.psp_status,
            payment_method_id=db_obj.payment_method_id,
            error_code=db_obj.failure_code,
            error_message=db_obj.failure_message,
            client_secret=db_obj.client_secret,
            version=db_obj.version,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at,
            paid_at=db_obj.paid_at,
            failed_at=db_obj.failed_at,
        )
