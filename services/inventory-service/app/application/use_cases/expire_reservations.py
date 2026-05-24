from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository
from app.infrastructure.observability.metrics import reservation_expire_total


class ExpireReservationsUseCase:
    def __init__(self, repository: InventoryRepository, session: AsyncSession):
        self._repo = repository
        self._session = session

    async def execute(self) -> dict[str, int]:
        expired = await self._repo.list_expired_held_reservations(self._session)
        count = 0
        for reservation in expired:
            await self._repo.expire_reservation(self._session, reservation)
            count += 1

        await self._session.commit()
        if count:
            reservation_expire_total.inc(count)
        return {"expired_count": count}
