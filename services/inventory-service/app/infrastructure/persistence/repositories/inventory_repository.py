from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import EntityNotFoundException, OptimisticLockException, OutOfStockException, RLSViolationException
from app.domain.value_objects.reservation import ReleaseReason, ReservationStatus
from app.infrastructure.persistence.models import (
    InventoryItemModel,
    InventoryReservationModel,
    WarehouseModel,
)


class InventoryRepository:
    async def get_warehouse(
        self, session: AsyncSession, warehouse_id: str, merchant_id: str
    ) -> WarehouseModel:
        row = await session.get(WarehouseModel, warehouse_id)
        if not row or row.merchant_id != merchant_id:
            raise EntityNotFoundException("Warehouse", warehouse_id)
        return row

    async def list_warehouses(
        self, session: AsyncSession, merchant_id: str
    ) -> list[WarehouseModel]:
        stmt = (
            select(WarehouseModel)
            .where(WarehouseModel.merchant_id == merchant_id)
            .order_by(WarehouseModel.priority.desc(), WarehouseModel.created_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def create_warehouse(
        self, session: AsyncSession, merchant_id: str, data: dict[str, Any], address_encrypted: bytes | None
    ) -> WarehouseModel:
        row = WarehouseModel(
            merchant_id=merchant_id,
            code=data["code"],
            name=data["name"],
            address_encrypted=address_encrypted,
            city=data.get("city"),
            country_code=data["country_code"],
            is_active=data.get("is_active", True),
            priority=data.get("priority", 0),
            metadata_json=data.get("metadata") or {},
        )
        session.add(row)
        await session.flush()
        return row

    async def update_warehouse(
        self,
        session: AsyncSession,
        warehouse_id: str,
        merchant_id: str,
        data: dict[str, Any],
        address_encrypted: bytes | None = None,
    ) -> WarehouseModel:
        row = await self.get_warehouse(session, warehouse_id, merchant_id)
        for field in ("name", "city", "country_code", "is_active", "priority"):
            if field in data and data[field] is not None:
                setattr(row, field, data[field])
        if "metadata" in data and data["metadata"] is not None:
            row.metadata_json = data["metadata"]
        if address_encrypted is not None:
            row.address_encrypted = address_encrypted
        row.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return row

    async def get_inventory_item(
        self, session: AsyncSession, item_id: str, merchant_id: str
    ) -> InventoryItemModel:
        row = await session.get(InventoryItemModel, item_id)
        if not row or row.merchant_id != merchant_id:
            raise EntityNotFoundException("InventoryItem", item_id)
        return row

    async def list_inventory_items(
        self, session: AsyncSession, merchant_id: str, warehouse_id: str | None = None
    ) -> list[InventoryItemModel]:
        stmt = select(InventoryItemModel).where(InventoryItemModel.merchant_id == merchant_id)
        if warehouse_id:
            stmt = stmt.where(InventoryItemModel.warehouse_id == warehouse_id)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def upsert_inventory_item(
        self, session: AsyncSession, merchant_id: str, data: dict[str, Any]
    ) -> InventoryItemModel:
        stmt = select(InventoryItemModel).where(
            InventoryItemModel.product_id == data["product_id"],
            InventoryItemModel.warehouse_id == data["warehouse_id"],
            InventoryItemModel.variant_id.is_(None)
            if data.get("variant_id") is None
            else InventoryItemModel.variant_id == data["variant_id"],
        )
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            if row.merchant_id != merchant_id:
                raise RLSViolationException(merchant_id, row.id)
            row.sku = data["sku"]
            row.is_track_inventory = data.get("is_track_inventory", row.is_track_inventory)
            row.updated_at = datetime.now(timezone.utc)
            await session.flush()
            return row

        row = InventoryItemModel(
            product_id=data["product_id"],
            variant_id=data.get("variant_id"),
            warehouse_id=data["warehouse_id"],
            merchant_id=merchant_id,
            sku=data["sku"],
            quantity_on_hand=data.get("quantity_on_hand", 0),
            is_track_inventory=data.get("is_track_inventory", True),
        )
        session.add(row)
        await session.flush()
        return row

    async def update_stock(
        self,
        session: AsyncSession,
        item_id: str,
        merchant_id: str,
        *,
        quantity_on_hand: int | None = None,
        delta: int | None = None,
        is_track_inventory: bool | None = None,
        version: int,
    ) -> InventoryItemModel:
        row = await self.get_inventory_item(session, item_id, merchant_id)
        if row.version != version:
            raise OptimisticLockException(version, row.version)

        if quantity_on_hand is not None:
            row.quantity_on_hand = quantity_on_hand
        elif delta is not None:
            row.quantity_on_hand += delta

        if row.quantity_on_hand < 0:
            raise OutOfStockException(row.product_id, row.sku)
        if row.quantity_reserved > row.quantity_on_hand:
            raise OutOfStockException(row.product_id, row.sku)

        if is_track_inventory is not None:
            row.is_track_inventory = is_track_inventory

        row.version += 1
        row.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return row

    async def has_trackable_inventory(
        self,
        session: AsyncSession,
        *,
        product_id: str,
        variant_id: str | None,
        merchant_id: str,
    ) -> bool:
        variant_filter = (
            InventoryItemModel.variant_id.is_(None)
            if variant_id is None
            else InventoryItemModel.variant_id == variant_id
        )
        stmt = select(func.count()).select_from(InventoryItemModel).where(
            InventoryItemModel.product_id == product_id,
            variant_filter,
            InventoryItemModel.merchant_id == merchant_id,
            InventoryItemModel.is_track_inventory.is_(True),
        )
        count = (await session.execute(stmt)).scalar_one()
        return count > 0

    async def select_item_for_reserve(
        self,
        session: AsyncSession,
        *,
        product_id: str,
        variant_id: str | None,
        merchant_id: str,
        quantity: int,
    ) -> InventoryItemModel | None:
        variant_filter = (
            InventoryItemModel.variant_id.is_(None)
            if variant_id is None
            else InventoryItemModel.variant_id == variant_id
        )
        available_expr = InventoryItemModel.quantity_on_hand - InventoryItemModel.quantity_reserved

        stmt = (
            select(InventoryItemModel)
            .join(WarehouseModel, WarehouseModel.id == InventoryItemModel.warehouse_id)
            .where(
                InventoryItemModel.product_id == product_id,
                variant_filter,
                InventoryItemModel.merchant_id == merchant_id,
                InventoryItemModel.is_track_inventory.is_(True),
                WarehouseModel.is_active.is_(True),
                available_expr >= quantity,
            )
            .order_by(WarehouseModel.priority.desc(), WarehouseModel.created_at.asc())
            .limit(1)
            .with_for_update(of=InventoryItemModel)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def reserve_quantity(
        self,
        session: AsyncSession,
        item: InventoryItemModel,
        quantity: int,
        *,
        max_retries: int = 3,
    ) -> InventoryItemModel:
        for attempt in range(max_retries):
            available = item.quantity_on_hand - item.quantity_reserved
            if available < quantity:
                raise OutOfStockException(item.product_id, item.sku)

            current_version = item.version
            stmt = (
                update(InventoryItemModel)
                .where(
                    InventoryItemModel.id == item.id,
                    InventoryItemModel.version == current_version,
                    (InventoryItemModel.quantity_on_hand - InventoryItemModel.quantity_reserved)
                    >= quantity,
                )
                .values(
                    quantity_reserved=InventoryItemModel.quantity_reserved + quantity,
                    version=InventoryItemModel.version + 1,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            result = await session.execute(stmt)
            if result.rowcount == 1:
                await session.refresh(item)
                return item

            await session.refresh(item)
            if attempt == max_retries - 1:
                raise OptimisticLockException(current_version, item.version)

        raise OptimisticLockException(item.version, item.version)

    async def create_reservation(
        self,
        session: AsyncSession,
        *,
        inventory_item_id: str,
        order_id: str,
        saga_id: str | None,
        quantity: int,
    ) -> InventoryReservationModel:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESERVATION_TTL_MINUTES)
        row = InventoryReservationModel(
            inventory_item_id=inventory_item_id,
            order_id=order_id,
            saga_id=saga_id,
            quantity=quantity,
            status=ReservationStatus.HELD.value,
            expires_at=expires_at,
        )
        session.add(row)
        await session.flush()
        return row

    async def list_reservations_by_order(
        self, session: AsyncSession, order_id: str, status: str | None = None
    ) -> list[InventoryReservationModel]:
        stmt = select(InventoryReservationModel).where(
            InventoryReservationModel.order_id == order_id
        )
        if status:
            stmt = stmt.where(InventoryReservationModel.status == status)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def _get_item_for_update(
        self, session: AsyncSession, item_id: str
    ) -> InventoryItemModel | None:
        """M-17: khoá hàng tồn (FOR UPDATE) trước khi read-modify-write quantity,
        tránh đua confirm/release/expire làm mất cập nhật (Postgres; no-op trên SQLite)."""
        stmt = (
            select(InventoryItemModel)
            .where(InventoryItemModel.id == item_id)
            .with_for_update()
        )
        result = await session.execute(stmt)
        return result.scalars().first()

    async def release_reservation(
        self,
        session: AsyncSession,
        reservation: InventoryReservationModel,
        reason: str,
    ) -> None:
        if reservation.status != ReservationStatus.HELD.value:
            return

        item = await self._get_item_for_update(session, reservation.inventory_item_id)
        if item:
            item.quantity_reserved = max(0, item.quantity_reserved - reservation.quantity)
            item.version += 1
            item.updated_at = datetime.now(timezone.utc)

        reservation.status = ReservationStatus.RELEASED.value
        reservation.released_at = datetime.now(timezone.utc)
        reservation.release_reason = reason
        await session.flush()

    async def confirm_reservation(
        self, session: AsyncSession, reservation: InventoryReservationModel
    ) -> InventoryItemModel | None:
        if reservation.status != ReservationStatus.HELD.value:
            return None

        item = await self._get_item_for_update(session, reservation.inventory_item_id)
        if not item:
            return None

        item.quantity_on_hand -= reservation.quantity
        item.quantity_reserved -= reservation.quantity
        if item.quantity_on_hand < 0 or item.quantity_reserved < 0:
            raise OutOfStockException(item.product_id, item.sku)
        item.version += 1
        item.updated_at = datetime.now(timezone.utc)

        reservation.status = ReservationStatus.CONFIRMED.value
        reservation.confirmed_at = datetime.now(timezone.utc)
        await session.flush()
        return item

    async def expire_reservation(
        self, session: AsyncSession, reservation: InventoryReservationModel
    ) -> None:
        if reservation.status != ReservationStatus.HELD.value:
            return

        item = await self._get_item_for_update(session, reservation.inventory_item_id)
        if item:
            item.quantity_reserved = max(0, item.quantity_reserved - reservation.quantity)
            item.version += 1
            item.updated_at = datetime.now(timezone.utc)

        reservation.status = ReservationStatus.EXPIRED.value
        reservation.released_at = datetime.now(timezone.utc)
        reservation.release_reason = ReleaseReason.EXPIRED.value
        await session.flush()

    async def list_expired_held_reservations(
        self, session: AsyncSession, limit: int = 200
    ) -> list[InventoryReservationModel]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(InventoryReservationModel)
            .where(
                InventoryReservationModel.status == ReservationStatus.HELD.value,
                InventoryReservationModel.expires_at < now,
            )
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def bulk_availability(
        self, session: AsyncSession, items: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for entry in items:
            product_id = entry["product_id"]
            variant_id = entry.get("variant_id")
            variant_filter = (
                InventoryItemModel.variant_id.is_(None)
                if variant_id is None
                else InventoryItemModel.variant_id == variant_id
            )
            available_expr = func.sum(
                InventoryItemModel.quantity_on_hand - InventoryItemModel.quantity_reserved
            )
            stmt = select(available_expr).where(
                InventoryItemModel.product_id == product_id,
                variant_filter,
                InventoryItemModel.is_track_inventory.is_(True),
            )
            total = (await session.execute(stmt)).scalar_one_or_none() or 0
            results.append(
                {
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "total_available": int(total),
                    "in_stock": int(total) > 0,
                }
            )
        return results
