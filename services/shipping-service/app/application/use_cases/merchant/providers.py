from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class ProvidersUseCase:
    def __init__(self, session: AsyncSession, repository: ShipmentRepository):
        self._session = session
        self._repo = repository

    async def list(self, active_only: bool = False) -> list[dict]:
        rows = await self._repo.list_providers(self._session, active_only)
        return [self._serialize(row) for row in rows]

    async def create(self, data: dict) -> dict:
        row = await self._repo.create_provider(self._session, data)
        await self._session.commit()
        return self._serialize(row)

    async def update(self, provider_id: str, data: dict) -> dict:
        row = await self._repo.update_provider(self._session, provider_id, data)
        await self._session.commit()
        return self._serialize(row)

    def _serialize(self, row) -> dict:
        return {
            "id": row.id,
            "code": row.code,
            "name": row.name,
            "api_base_url": row.api_base_url,
            "logo_url": row.logo_url,
            "is_active": row.is_active,
            "supported_countries": row.supported_countries,
            "capabilities": row.capabilities,
        }
