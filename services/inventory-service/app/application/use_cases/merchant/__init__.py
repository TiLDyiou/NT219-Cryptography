from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.ports.crypto_service import CryptoService
from app.infrastructure.audit.kafka_audit_logger import KafkaAuditLogger
from app.infrastructure.persistence.repositories.inventory_repository import InventoryRepository


class MerchantWarehouseUseCase:
    def __init__(
        self,
        repository: InventoryRepository,
        crypto_service: CryptoService,
        audit_logger: KafkaAuditLogger,
        session: AsyncSession,
    ):
        self._repo = repository
        self._crypto = crypto_service
        self._audit = audit_logger
        self._session = session

    async def list(self, merchant_id: str) -> list[dict[str, Any]]:
        rows = await self._repo.list_warehouses(self._session, merchant_id)
        return [await self._to_response(row) for row in rows]

    async def create(self, merchant_id: str, data: dict[str, Any]) -> dict[str, Any]:
        address_encrypted = await self._crypto.encrypt_field(data.get("address"))
        row = await self._repo.create_warehouse(
            self._session, merchant_id, data, address_encrypted
        )
        await self._audit.log_change(
            session=self._session,
            table_name="warehouses",
            record_id=row.id,
            action="INSERT",
            old_data=None,
            new_data={"id": row.id, "code": row.code, "merchant_id": merchant_id},
            actor_id=merchant_id,
            actor_type="merchant",
        )
        await self._session.commit()
        return await self._to_response(row)

    async def update(
        self, merchant_id: str, warehouse_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        address_encrypted = None
        if "address" in data:
            address_encrypted = await self._crypto.encrypt_field(data.get("address"))
        row = await self._repo.update_warehouse(
            self._session, warehouse_id, merchant_id, data, address_encrypted
        )
        await self._audit.log_change(
            session=self._session,
            table_name="warehouses",
            record_id=row.id,
            action="UPDATE",
            old_data=None,
            new_data={"id": row.id, "code": row.code},
            actor_id=merchant_id,
            actor_type="merchant",
        )
        await self._session.commit()
        return await self._to_response(row)

    async def _to_response(self, row) -> dict[str, Any]:
        address = await self._crypto.decrypt_field(row.address_encrypted)
        return {
            "id": row.id,
            "merchant_id": row.merchant_id,
            "code": row.code,
            "name": row.name,
            "address": address,
            "city": row.city,
            "country_code": row.country_code,
            "is_active": row.is_active,
            "priority": row.priority,
            "metadata": row.metadata_json or {},
            "created_at": row.created_at.isoformat(),
            "updated_at": row.updated_at.isoformat(),
        }


class MerchantInventoryUseCase:
    def __init__(
        self,
        repository: InventoryRepository,
        audit_logger: KafkaAuditLogger,
        session: AsyncSession,
    ):
        self._repo = repository
        self._audit = audit_logger
        self._session = session

    async def list(
        self, merchant_id: str, warehouse_id: str | None = None
    ) -> list[dict[str, Any]]:
        rows = await self._repo.list_inventory_items(self._session, merchant_id, warehouse_id)
        return [self._to_response(row) for row in rows]

    async def upsert(self, merchant_id: str, data: dict[str, Any]) -> dict[str, Any]:
        await self._repo.get_warehouse(self._session, data["warehouse_id"], merchant_id)
        row = await self._repo.upsert_inventory_item(self._session, merchant_id, data)
        await self._audit.log_change(
            session=self._session,
            table_name="inventory_items",
            record_id=row.id,
            action="INSERT",
            old_data=None,
            new_data={"id": row.id, "sku": row.sku},
            actor_id=merchant_id,
            actor_type="merchant",
        )
        await self._session.commit()
        return self._to_response(row)

    async def update_stock(
        self, merchant_id: str, item_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        row = await self._repo.update_stock(
            self._session,
            item_id,
            merchant_id,
            quantity_on_hand=data.get("quantity_on_hand"),
            delta=data.get("delta"),
            is_track_inventory=data.get("is_track_inventory"),
            version=data["version"],
        )
        await self._audit.log_change(
            session=self._session,
            table_name="inventory_items",
            record_id=row.id,
            action="UPDATE",
            old_data=None,
            new_data={
                "quantity_on_hand": row.quantity_on_hand,
                "is_track_inventory": row.is_track_inventory,
            },
            actor_id=merchant_id,
            actor_type="merchant",
        )
        await self._session.commit()
        return self._to_response(row)

    def _to_response(self, row) -> dict[str, Any]:
        return {
            "id": row.id,
            "product_id": row.product_id,
            "variant_id": row.variant_id,
            "warehouse_id": row.warehouse_id,
            "merchant_id": row.merchant_id,
            "sku": row.sku,
            "quantity_on_hand": row.quantity_on_hand,
            "quantity_reserved": row.quantity_reserved,
            "quantity_available": row.quantity_on_hand - row.quantity_reserved,
            "is_track_inventory": row.is_track_inventory,
            "version": row.version,
            "created_at": row.created_at.isoformat(),
            "updated_at": row.updated_at.isoformat(),
        }
