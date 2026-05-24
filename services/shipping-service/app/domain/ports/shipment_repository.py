from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class ShipmentRepository(ABC):
    @abstractmethod
    async def create_from_order(
        self,
        session: AsyncSession,
        order: dict[str, Any],
        encrypted: dict[str, bytes | None],
        provider_id: str,
    ):
        raise NotImplementedError
