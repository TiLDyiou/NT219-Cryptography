import uuid
import logging
from app.domain.ports.bank_payout_gateway import BankPayoutGateway

logger = logging.getLogger(__name__)


class BankPayoutStub(BankPayoutGateway):
    async def transfer_to_merchant(
        self,
        merchant_id: str,
        amount: float,
        currency: str,
        settlement_id: str,
    ) -> str:
        logger.info(
            "Executing Stub Bank transfer payout for merchant %s, amount=%s %s, settlement_id=%s",
            merchant_id,
            amount,
            currency,
            settlement_id,
        )
        return f"bank-ref-{uuid.uuid4().hex[:12]}"
