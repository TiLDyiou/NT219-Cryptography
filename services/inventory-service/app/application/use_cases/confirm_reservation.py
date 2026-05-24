import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.events import InventoryConfirmed, StockUpdated
from app.domain.ports.outbox_repository import OutboxRepository
from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository
from app.infrastructure.observability.metrics import inventory_confirm_total

logger = logging.getLogger(__name__)


class ConfirmReservationUseCase:
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
        reservations = await self._repo.list_reservations_by_order(
            self._session, order_id, status="held"
        )

        confirmed_count = 0
        for reservation in reservations:
            item = await self._repo.confirm_reservation(self._session, reservation)
            if not item:
                continue
            confirmed_count += 1

            stock_event = StockUpdated(
                inventory_item_id=item.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                quantity_on_hand=item.quantity_on_hand,
                quantity_available=item.quantity_on_hand - item.quantity_reserved,
            )
            await self._outbox.save_event(
                aggregate_type="inventory",
                aggregate_id=item.id,
                event_type="stock.updated",
                payload=stock_event.to_dict(),
                session=self._session,
            )

        event = InventoryConfirmed(order_id=order_id, confirmed_count=confirmed_count)
        await self._outbox.save_event(
            aggregate_type="inventory",
            aggregate_id=order_id,
            event_type="inventory.confirmed",
            payload=event.to_dict(),
            session=self._session,
        )

        response = event.to_dict()
        await self._session.commit()
        inventory_confirm_total.inc(confirmed_count)
        return response
