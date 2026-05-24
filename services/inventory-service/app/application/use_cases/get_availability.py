from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository


class GetAvailabilityUseCase:
    def __init__(self, repository: InventoryRepository, session: AsyncSession):
        self._repo = repository
        self._session = session

    async def execute(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return await self._repo.bulk_availability(self._session, items)
