import logging
from datetime import datetime, timezone
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.ports.settlement_repository import SettlementRepository
from app.domain.ports.outbox_repository import OutboxRepository
from app.domain.ports.bank_payout_gateway import BankPayoutGateway
from app.core.exceptions import EntityNotFoundException, BusinessRuleException

logger = logging.getLogger(__name__)


class ProcessSettlementUseCase:
    def __init__(
        self,
        settlement_repository: SettlementRepository,
        outbox_repository: OutboxRepository,
        payout_gateway: BankPayoutGateway,
        session: AsyncSession,
    ):
        self._settle_repo = settlement_repository
        self._outbox = outbox_repository
        self._payout = payout_gateway
        self._session = session

    async def execute(self, settlement_id: str) -> dict[str, Any]:
        settlement = await self._settle_repo.get_settlement_by_id(settlement_id, session=self._session)
        if not settlement:
            raise EntityNotFoundException("MerchantSettlement", settlement_id)

        if settlement["status"] != "pending":
            raise BusinessRuleException(f"Settlement is already in status: {settlement['status']}")

        try:
            # 1. Update status to processing
            await self._settle_repo.update_settlement_status(settlement_id, "processing", session=self._session)
            await self._session.flush()

            # 2. Call Bank Payout Stub
            payout_ref = await self._payout.transfer_to_merchant(
                merchant_id=settlement["merchant_id"],
                amount=float(settlement["net_amount"]),
                currency=settlement["currency_code"],
                settlement_id=settlement_id,
            )

            # 3. Update status to paid
            await self._settle_repo.update_settlement_status(
                settlement_id=settlement_id,
                status="paid",
                payout_ref=payout_ref,
                session=self._session,
            )

            # 4. Ghi Outbox Event
            from app.domain.events import SettlementPaid
            event = SettlementPaid(
                settlement_id=settlement_id,
                merchant_id=settlement["merchant_id"],
                net_amount=settlement["net_amount"],
                currency=settlement["currency_code"],
                paid_at=datetime.now(timezone.utc).isoformat(),
            )
            await self._outbox.save_event(
                aggregate_type="settlement",
                aggregate_id=settlement_id,
                event_type="SettlementPaid",
                payload=event.to_dict(),
                session=self._session,
            )

            await self._session.commit()
            logger.info("Successfully completed bank transfer payout for settlement ID %s", settlement_id)
            return {"settlement_id": settlement_id, "status": "paid", "payout_ref": payout_ref}

        except Exception:
            logger.exception("Failed to process payout bank transfer")
            await self._session.rollback()
            raise
