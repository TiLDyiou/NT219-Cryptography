from typing import Any
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.ports.settlement_repository import SettlementRepository
from app.infrastructure.persistence.models.settlement import MerchantSettlementModel, SettlementItemModel
from app.infrastructure.persistence.models.payment_transaction import PaymentTransactionModel


class PgSettlementRepository(SettlementRepository):
    async def get_unsettled_transactions(
        self, merchant_id: str, start_date: datetime, end_date: datetime, session: Any = None
    ) -> list[dict[str, Any]]:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")

        # In microservices, we settle based on paid_at interval inside payment-service
        # Join with existing settlement_items to avoid double settling
        stmt = (
            select(PaymentTransactionModel)
            .outerjoin(SettlementItemModel, PaymentTransactionModel.id == SettlementItemModel.transaction_id)
            .where(
                PaymentTransactionModel.merchant_id == merchant_id,
                PaymentTransactionModel.status == "succeeded",
                PaymentTransactionModel.paid_at >= start_date,
                PaymentTransactionModel.paid_at < end_date,
                SettlementItemModel.id.is_(None),  # not yet settled
            )
        )
        result = await session.execute(stmt)
        txs = result.scalars().all()
        return [
            {
                "transaction_id": tx.id,
                "order_id": tx.order_id,
                "amount": tx.amount,
                "psp_fee": tx.psp_fee or Decimal("0"),
            }
            for tx in txs
        ]

    async def create_settlement(
        self,
        merchant_id: str,
        total_sales: float,
        total_psp_fee: float,
        commission_rate: float,
        commission: float,
        net_amount: float,
        items: list[dict[str, Any]],
        session: Any = None,
    ) -> str:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")

        # Period calculation (defaults to current week)
        now = datetime.now(timezone.utc)
        period_start = now.date()  # simplified
        period_end = now.date()

        settlement_db = MerchantSettlementModel(
            merchant_id=merchant_id,
            period_start=period_start,
            period_end=period_end,
            total_orders=len(items),
            total_sales=Decimal(str(total_sales)),
            total_shipping_fee=Decimal("0"),  # Simplified
            total_psp_fee=Decimal(str(total_psp_fee)),
            commission_rate=Decimal(str(commission_rate)),
            commission_amount=Decimal(str(commission)),
            net_amount=Decimal(str(net_amount)),
            currency_code="VND",
            status="pending",
            created_at=now,
            updated_at=now,
        )
        session.add(settlement_db)
        await session.flush()

        for item in items:
            item_db = SettlementItemModel(
                settlement_id=settlement_db.id,
                order_id=item["order_id"],
                transaction_id=item["transaction_id"],
                order_amount=Decimal(str(item["amount"])),
                shipping_fee=Decimal("0"),
                psp_fee=Decimal(str(item["psp_fee"])),
                commission=Decimal(str(item["commission"])),
                merchant_payout=Decimal(str(item["net"])),
                created_at=now,
            )
            session.add(item_db)

        await session.flush()
        return settlement_db.id

    async def get_settlement_by_id(self, settlement_id: str, session: Any = None) -> dict[str, Any] | None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")

        db_obj = await session.get(MerchantSettlementModel, settlement_id)
        if not db_obj:
            return None
        return {
            "id": db_obj.id,
            "merchant_id": db_obj.merchant_id,
            "net_amount": db_obj.net_amount,
            "status": db_obj.status,
            "currency_code": db_obj.currency_code,
        }

    async def update_settlement_status(
        self, settlement_id: str, status: str, payout_ref: str | None = None, session: Any = None
    ) -> None:
        if not session or not isinstance(session, AsyncSession):
            raise ValueError("AsyncSession required")

        db_obj = await session.get(MerchantSettlementModel, settlement_id)
        if db_obj:
            db_obj.status = status
            db_obj.updated_at = datetime.now(timezone.utc)
            if payout_ref:
                db_obj.payment_reference = payout_ref
                db_obj.paid_at = datetime.now(timezone.utc)
            await session.flush()
