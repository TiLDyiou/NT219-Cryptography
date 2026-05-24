from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class MerchantRatesUseCase:
    def __init__(self, session: AsyncSession, repository: ShipmentRepository):
        self._session = session
        self._repo = repository

    async def list(self, merchant_id: str) -> list[dict]:
        rows = await self._repo.list_rates(self._session, merchant_id)
        return [self._serialize(row) for row in rows]

    async def create(self, merchant_id: str, data: dict) -> dict:
        row = await self._repo.create_rate(self._session, merchant_id, data)
        await self._session.commit()
        return self._serialize(row)

    async def update(self, merchant_id: str, rate_id: str, data: dict) -> dict:
        row = await self._repo.update_rate(self._session, rate_id, merchant_id, data)
        await self._session.commit()
        return self._serialize(row)

    def _serialize(self, row) -> dict:
        return {
            "id": row.id,
            "merchant_id": row.merchant_id,
            "provider_id": row.provider_id,
            "name": row.name,
            "base_fee": row.base_fee,
            "per_kg_fee": row.per_kg_fee,
            "currency": row.currency,
            "is_active": row.is_active,
        }
