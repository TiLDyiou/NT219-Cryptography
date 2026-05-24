from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.ports.crypto_service import CryptoService
from app.infrastructure.persistence.repositories.shipment_repository import ShipmentRepository


class GetShipmentUseCase:
    def __init__(self, session: AsyncSession, repository: ShipmentRepository, crypto_service: CryptoService):
        self._session = session
        self._repo = repository
        self._crypto = crypto_service

    async def execute(self, shipment_id: str, merchant_id: str) -> dict:
        row = await self._repo.get_for_merchant(self._session, shipment_id, merchant_id)
        return {
            "id": row.id,
            "order_id": row.order_id,
            "merchant_id": row.merchant_id,
            "status": row.status,
            "tracking_number": row.tracking_number,
            "recipient_name": await self._crypto.decrypt_field(row.recipient_name_encrypted),
            "recipient_phone": await self._crypto.decrypt_field(row.recipient_phone_encrypted),
            "address_line1": await self._crypto.decrypt_field(row.address_line1_encrypted),
            "address_line2": await self._crypto.decrypt_field(row.address_line2_encrypted),
            "city": row.city,
            "state": row.state,
            "postal_code": row.postal_code,
            "country_code": row.country_code,
            "version": row.version,
        }
