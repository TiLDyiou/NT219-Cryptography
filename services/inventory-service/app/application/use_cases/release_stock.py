import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.events import InventoryReleased
from app.domain.ports.outbox_repository import OutboxRepository
from app.domain.value_objects.reservation import ReleaseReason
from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository
from app.infrastructure.observability.metrics import inventory_release_total

logger = logging.getLogger(__name__)


class ReleaseStockUseCase:
    def __init__(
        self,
        repository: InventoryRepository,
        outbox_repository: OutboxRepository,
        session: AsyncSession,
    ):
        self._repo = repository
        self._outbox = outbox_repository
        self._session = session

    async def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        order_id = payload["order_id"]
        reason = payload.get("reason", ReleaseReason.SAGA_COMPENSATED.value)

        reservations = await self._repo.list_reservations_by_order(
            self._session, order_id, status="held"
        )
        if not reservations:
            all_res = await self._repo.list_reservations_by_order(self._session, order_id)
            if all_res and all(r.status == "released" for r in all_res):
                return {"order_id": order_id, "released": True, "released_count": 0}

        released_count = 0
        for reservation in reservations:
            await self._repo.release_reservation(self._session, reservation, reason)
            released_count += 1

        event = InventoryReleased(order_id=order_id, released_count=released_count)
        await self._outbox.save_event(
            aggregate_type="inventory",
            aggregate_id=order_id,
            event_type="inventory.released",
            payload=event.to_dict(),
            session=self._session,
        )

        response = event.to_dict()
        await self._session.commit()
        inventory_release_total.inc(released_count)
        return response
