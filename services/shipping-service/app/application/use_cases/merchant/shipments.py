from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class MerchantShipmentsUseCase:
    def __init__(self, session: AsyncSession, repository: ShipmentRepository):
        self._session = session
        self._repo = repository

    async def list(self, merchant_id: str, status: str | None = None, limit: int = 50) -> list[dict]:
        rows = await self._repo.list_for_merchant(self._session, merchant_id, status, limit)
        return [
            {
                "id": row.id,
                "order_id": row.order_id,
                "merchant_id": row.merchant_id,
                "status": row.status,
                "tracking_number": row.tracking_number,
                "created_at": row.created_at,
            }
            for row in rows
        ]
