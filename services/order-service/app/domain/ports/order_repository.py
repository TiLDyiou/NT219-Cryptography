from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.domain.entities.order_item import OrderEntity
from app.domain.entities.saga import SagaStateEntity


@dataclass
class CheckoutPersistenceResult:
    parent: OrderEntity
    children: list[OrderEntity]
    sagas: list[SagaStateEntity]


class OrderRepository(ABC):
    @abstractmethod
    async def find_parent_by_idempotency(
        self, user_id: str, idempotency_key: str
    ) -> OrderEntity | None:
        raise NotImplementedError

    @abstractmethod
    async def find_children_by_parent(self, parent_order_id: str) -> list[OrderEntity]:
        raise NotImplementedError

    @abstractmethod
    async def save_checkout(
        self,
        parent: OrderEntity,
        children: list[OrderEntity],
        sagas: list[SagaStateEntity],
    ) -> CheckoutPersistenceResult:
        raise NotImplementedError

    @abstractmethod
    async def list_user_orders(self, user_id: str) -> list[OrderEntity]:
        raise NotImplementedError

    @abstractmethod
    async def get_user_order(self, user_id: str, order_id: str) -> OrderEntity:
        raise NotImplementedError

    @abstractmethod
    async def list_merchant_orders(self, merchant_id: str) -> list[OrderEntity]:
        raise NotImplementedError

    @abstractmethod
    async def get_merchant_order(self, merchant_id: str, order_id: str) -> OrderEntity:
        raise NotImplementedError

    @abstractmethod
    async def update_order(self, order: OrderEntity) -> OrderEntity:
        raise NotImplementedError

    @abstractmethod
    async def update_saga(self, saga: SagaStateEntity) -> SagaStateEntity:
        raise NotImplementedError

    @abstractmethod
    async def get_saga_by_order(self, order_id: str) -> SagaStateEntity | None:
        raise NotImplementedError
