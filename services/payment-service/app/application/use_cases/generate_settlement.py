import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.ports.settlement_repository import SettlementRepository
from app.domain.ports.outbox_repository import OutboxRepository

logger = logging.getLogger(__name__)


class GenerateSettlementUseCase:
    def __init__(
        self,
        settlement_repository: SettlementRepository,
        outbox_repository: OutboxRepository,
        session: AsyncSession,
    ):
        self._settle_repo = settlement_repository
        self._outbox = outbox_repository
        self._session = session

    async def execute(self, merchant_id: str, commission_rate: float = 0.0500) -> str | None:
        logger.info("Generating weekly settlement for merchant %s", merchant_id)
        
        # Period: past 7 days
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=7)
        end_date = now

        # Get unsettled succeeded transactions
        txs = await self._settle_repo.get_unsettled_transactions(
            merchant_id=merchant_id,
            start_date=start_date,
            end_date=end_date,
            session=self._session,
        )
        if not txs:
            logger.info("No unsettled transactions found for merchant %s", merchant_id)
            return None

        # M-04: dùng Decimal thay vì float để tránh sai số làm tròn khi chi trả merchant.
        rate = Decimal(str(commission_rate))
        total_sales = Decimal("0")
        total_psp_fee = Decimal("0")
        items_payload = []

        for tx in txs:
            amount_val = Decimal(str(tx["amount"]))
            psp_fee_val = Decimal(str(tx["psp_fee"]))
            commission_val = amount_val * rate
            net_val = amount_val - commission_val - psp_fee_val

            total_sales += amount_val
            total_psp_fee += psp_fee_val

            items_payload.append({
                "order_id": tx["order_id"],
                "transaction_id": tx["transaction_id"],
                "amount": str(amount_val),
                "psp_fee": str(psp_fee_val),
                "commission": str(commission_val),
                "net": str(net_val),
            })

        commission_amount = total_sales * rate
        net_amount = total_sales - commission_amount - total_psp_fee

        settlement_id = await self._settle_repo.create_settlement(
            merchant_id=merchant_id,
            total_sales=total_sales,
            total_psp_fee=total_psp_fee,
            commission_rate=commission_rate,
            commission=commission_amount,
            net_amount=net_amount,
            items=items_payload,
            session=self._session,
        )

        # Ghi Outbox event
        await self._outbox.save_event(
            aggregate_type="settlement",
            aggregate_id=settlement_id,
            event_type="SettlementGenerated",
            payload={
                "settlement_id": settlement_id,
                "merchant_id": merchant_id,
                "net_amount": str(net_amount),
                "total_orders": len(items_payload),
            },
            session=self._session,
        )

        await self._session.commit()
        logger.info("Successfully generated settlement ID %s for merchant %s", settlement_id, merchant_id)
        return settlement_id
