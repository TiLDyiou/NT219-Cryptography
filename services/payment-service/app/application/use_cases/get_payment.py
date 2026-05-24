import logging
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.ports.payment_repository import PaymentRepository
from app.core.exceptions import EntityNotFoundException

logger = logging.getLogger(__name__)


class GetPaymentUseCase:
    def __init__(self, payment_repository: PaymentRepository, session: AsyncSession):
        self._repo = payment_repository
        self._session = session

    async def execute(self, payment_id: str) -> dict[str, Any]:
        tx = await self._repo.get_transaction_by_id(payment_id, session=self._session)
        if not tx:
            raise EntityNotFoundException("PaymentTransaction", payment_id)

        return {
            "payment_id": tx.id,
            "order_id": tx.order_id,
            "user_id": tx.user_id,
            "merchant_id": tx.merchant_id,
            "amount": str(tx.amount),
            "currency": tx.currency,
            "status": tx.status.value,
            "psp_intent_id": tx.psp_intent_id,
            "error_code": tx.error_code,
            "error_message": tx.error_message,
            "paid_at": tx.paid_at.isoformat() if tx.paid_at else None,
        }
