from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class TrackShipmentPublicUseCase:
    def __init__(self, session: AsyncSession, repository: ShipmentRepository):
        self._session = session
        self._repo = repository

    async def execute(self, tracking_number: str) -> dict:
        shipment = await self._repo.get_by_tracking_number(self._session, tracking_number)
        events = await self._repo.list_tracking_events(self._session, shipment.id)
        return {
            "tracking_number": shipment.tracking_number,
            "status": shipment.status,
            "address": {
                "city": shipment.city,
                "state": shipment.state,
                "country_code": shipment.country_code,
            },
            "events": [
                {
                    "status": event.status,
                    "description": event.description,
                    "location": event.location,
                    "occurred_at": event.occurred_at,
                }
                for event in events
            ],
        }
