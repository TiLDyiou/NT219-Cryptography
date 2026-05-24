from abc import ABC, abstractmethod
from typing import Any
from datetime import datetime


class SettlementRepository(ABC):
    @abstractmethod
    async def get_unsettled_transactions(
        self, merchant_id: str, start_date: datetime, end_date: datetime, session: Any = None
    ) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
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
        raise NotImplementedError

    @abstractmethod
    async def get_settlement_by_id(self, settlement_id: str, session: Any = None) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    async def update_settlement_status(
        self, settlement_id: str, status: str, payout_ref: str | None = None, session: Any = None
    ) -> None:
        raise NotImplementedError
