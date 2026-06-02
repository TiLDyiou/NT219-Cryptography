from abc import ABC, abstractmethod
from typing import Any
from decimal import Decimal


class StripeGateway(ABC):
    @abstractmethod
    async def create_checkout_session(
        self,
        order_id: str,
        amount: Decimal,
        currency: str,
        line_items: list[dict[str, Any]],
        idempotency_key: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def create_payment_intent(
        self,
        amount: Decimal,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def confirm_payment_intent(
        self,
        intent_id: str,
        payment_method_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def retrieve_payment_intent(self, intent_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def retrieve_checkout_session(self, session_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def create_refund(
        self,
        intent_id: str,
        amount: Decimal,
        currency: str = "vnd",
        reason: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def verify_webhook_signature(
        self,
        payload: bytes,
        sig_header: str,
    ) -> dict[str, Any]:
        raise NotImplementedError
