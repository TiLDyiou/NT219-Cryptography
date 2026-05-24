from abc import ABC, abstractmethod
from typing import Any
from app.domain.entities.payment_transaction import PaymentTransaction


class PaymentRepository(ABC):
    @abstractmethod
    async def save_transaction(self, tx: PaymentTransaction, session: Any = None) -> PaymentTransaction:
        raise NotImplementedError

    @abstractmethod
    async def get_transaction_by_id(self, tx_id: str, session: Any = None) -> PaymentTransaction | None:
        raise NotImplementedError

    @abstractmethod
    async def get_transaction_by_intent_id(self, intent_id: str, session: Any = None) -> PaymentTransaction | None:
        raise NotImplementedError

    @abstractmethod
    async def save_payment_method(self, pm_data: dict[str, Any], session: Any = None) -> None:
        raise NotImplementedError
