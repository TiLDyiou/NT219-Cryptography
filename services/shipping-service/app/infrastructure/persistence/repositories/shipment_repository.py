from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException, OptimisticLockException, RLSViolationException
from app.domain.value_objects.shipment_status import ShipmentStatus, assert_transition
from app.infrastructure.persistence.models import (
    ShipmentModel,
    ShippingProviderModel,
    ShippingRateModel,
    TrackingEventModel,
)


class ShipmentRepository:
    async def get_provider_by_code(
        self, session: AsyncSession, code: str
    ) -> ShippingProviderModel | None:
        result = await session.execute(
            select(ShippingProviderModel).where(ShippingProviderModel.code == code)
        )
        return result.scalar_one_or_none()

    async def get_default_provider(self, session: AsyncSession) -> ShippingProviderModel:
        result = await session.execute(
            select(ShippingProviderModel)
            .where(ShippingProviderModel.is_active.is_(True))
            .order_by(ShippingProviderModel.code.asc())
            .limit(1)
        )
        provider = result.scalar_one_or_none()
        if not provider:
            raise EntityNotFoundException("ShippingProvider", "default")
        return provider

    async def create_provider(
        self, session: AsyncSession, data: dict[str, Any]
    ) -> ShippingProviderModel:
        provider = ShippingProviderModel(
            code=data["code"],
            name=data["name"],
            api_base_url=data.get("api_base_url"),
            logo_url=data.get("logo_url"),
            is_active=data.get("is_active", True),
            supported_countries=data.get("supported_countries") or ["VN"],
            capabilities=data.get("capabilities") or {},
        )
        session.add(provider)
        await session.flush()
        return provider

    async def update_provider(
        self, session: AsyncSession, provider_id: str, data: dict[str, Any]
    ) -> ShippingProviderModel:
        provider = await session.get(ShippingProviderModel, provider_id)
        if not provider:
            raise EntityNotFoundException("ShippingProvider", provider_id)
        for field in ("code", "name", "api_base_url", "logo_url", "is_active"):
            if field in data and data[field] is not None:
                setattr(provider, field, data[field])
        if "supported_countries" in data and data["supported_countries"] is not None:
            provider.supported_countries = data["supported_countries"]
        if "capabilities" in data and data["capabilities"] is not None:
            provider.capabilities = data["capabilities"]
        provider.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return provider

    async def list_providers(self, session: AsyncSession, active_only: bool = False):
        stmt = select(ShippingProviderModel).order_by(ShippingProviderModel.code.asc())
        if active_only:
            stmt = stmt.where(ShippingProviderModel.is_active.is_(True))
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def create_rate(
        self, session: AsyncSession, merchant_id: str, data: dict[str, Any]
    ) -> ShippingRateModel:
        rate = ShippingRateModel(
            merchant_id=merchant_id,
            provider_id=data["provider_id"],
            name=data["name"],
            base_fee=Decimal(str(data["base_fee"])),
            per_kg_fee=Decimal(str(data["per_kg_fee"])),
            currency=data.get("currency", "VND"),
            is_active=data.get("is_active", True),
            metadata_json=data.get("metadata") or {},
        )
        session.add(rate)
        await session.flush()
        return rate

    async def list_rates(self, session: AsyncSession, merchant_id: str):
        result = await session.execute(
            select(ShippingRateModel)
            .where(ShippingRateModel.merchant_id == merchant_id)
            .order_by(ShippingRateModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_rate(
        self, session: AsyncSession, rate_id: str, merchant_id: str, data: dict[str, Any]
    ) -> ShippingRateModel:
        rate = await session.get(ShippingRateModel, rate_id)
        if not rate:
            raise EntityNotFoundException("ShippingRate", rate_id)
        if rate.merchant_id != merchant_id:
            raise RLSViolationException(merchant_id, rate_id)
        for field in ("name", "currency", "is_active"):
            if field in data and data[field] is not None:
                setattr(rate, field, data[field])
        if "base_fee" in data and data["base_fee"] is not None:
            rate.base_fee = Decimal(str(data["base_fee"]))
        if "per_kg_fee" in data and data["per_kg_fee"] is not None:
            rate.per_kg_fee = Decimal(str(data["per_kg_fee"]))
        if "metadata" in data and data["metadata"] is not None:
            rate.metadata_json = data["metadata"]
        rate.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return rate

    async def create_from_order(
        self,
        session: AsyncSession,
        order: dict[str, Any],
        encrypted: dict[str, bytes | None],
        provider_id: str,
    ) -> tuple[ShipmentModel, bool]:
        existing = await self.get_by_order_id(session, order["order_id"])
        if existing:
            return existing, False

        recipient = order.get("recipient") or order.get("shipping_address") or {}
        dimensions = order.get("dimensions_cm") or order.get("dimensions") or {
            "length": 10,
            "width": 10,
            "height": 10,
            "weight_grams": order.get("weight_grams", 500),
        }
        shipment = ShipmentModel(
            order_id=order["order_id"],
            merchant_id=order["merchant_id"],
            provider_id=provider_id,
            recipient_name_encrypted=encrypted.get("recipient_name"),
            recipient_phone_encrypted=encrypted.get("recipient_phone"),
            address_line1_encrypted=encrypted.get("address_line1"),
            address_line2_encrypted=encrypted.get("address_line2"),
            city=recipient.get("city"),
            state=recipient.get("state"),
            postal_code=recipient.get("postal_code"),
            country_code=recipient.get("country_code", "VN"),
            dimensions_cm=dimensions,
            metadata_json={"source_event_id": order.get("event_id")},
        )
        session.add(shipment)
        try:
            await session.flush()
        except IntegrityError:
            await session.rollback()
            async with session.begin():
                existing = await self.get_by_order_id(session, order["order_id"])
                if existing:
                    return existing, False
            raise
        return shipment, True

    async def get_by_order_id(self, session: AsyncSession, order_id: str) -> ShipmentModel | None:
        result = await session.execute(select(ShipmentModel).where(ShipmentModel.order_id == order_id))
        return result.scalar_one_or_none()

    async def get(self, session: AsyncSession, shipment_id: str) -> ShipmentModel:
        shipment = await session.get(ShipmentModel, shipment_id)
        if not shipment:
            raise EntityNotFoundException("Shipment", shipment_id)
        return shipment

    async def get_for_merchant(
        self, session: AsyncSession, shipment_id: str, merchant_id: str
    ) -> ShipmentModel:
        shipment = await self.get(session, shipment_id)
        if shipment.merchant_id != merchant_id:
            raise RLSViolationException(merchant_id, shipment_id)
        return shipment

    async def list_for_merchant(
        self,
        session: AsyncSession,
        merchant_id: str,
        status: str | None = None,
        limit: int = 50,
    ) -> list[ShipmentModel]:
        stmt = select(ShipmentModel).where(ShipmentModel.merchant_id == merchant_id)
        if status:
            stmt = stmt.where(ShipmentModel.status == status)
        stmt = stmt.order_by(ShipmentModel.created_at.desc()).limit(min(limit, 200))
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_tracking_number(
        self, session: AsyncSession, tracking_number: str
    ) -> ShipmentModel:
        result = await session.execute(
            select(ShipmentModel).where(ShipmentModel.tracking_number == tracking_number)
        )
        shipment = result.scalar_one_or_none()
        if not shipment:
            raise EntityNotFoundException("Shipment", tracking_number)
        return shipment

    async def attach_label(
        self,
        session: AsyncSession,
        shipment: ShipmentModel,
        *,
        tracking_number: str,
        provider_shipment_id: str,
        provider_label_url: str | None,
        provider_response: dict[str, Any],
    ) -> ShipmentModel:
        assert_transition(shipment.status, ShipmentStatus.LABEL_CREATED)
        shipment.tracking_number = tracking_number
        shipment.provider_shipment_id = provider_shipment_id
        shipment.provider_label_url = provider_label_url
        shipment.provider_response = provider_response
        shipment.status = ShipmentStatus.LABEL_CREATED.value
        shipment.version += 1
        shipment.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return shipment

    async def update_status(
        self,
        session: AsyncSession,
        shipment: ShipmentModel,
        status: str,
        *,
        max_retries: int = 3,
    ) -> ShipmentModel:
        target = ShipmentStatus(status)
        assert_transition(shipment.status, target)

        for attempt in range(max_retries):
            current_version = shipment.version
            stmt = (
                update(ShipmentModel)
                .where(ShipmentModel.id == shipment.id, ShipmentModel.version == current_version)
                .values(
                    status=target.value,
                    version=ShipmentModel.version + 1,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            result = await session.execute(stmt)
            if result.rowcount == 1:
                await session.refresh(shipment)
                return shipment
            await session.refresh(shipment)
            if attempt == max_retries - 1:
                raise OptimisticLockException(current_version, shipment.version)
        raise OptimisticLockException(shipment.version, shipment.version)

    async def add_tracking_event(
        self,
        session: AsyncSession,
        shipment: ShipmentModel,
        event: dict[str, Any],
    ) -> TrackingEventModel:
        occurred_at = event.get("occurred_at") or datetime.now(timezone.utc)
        row = TrackingEventModel(
            shipment_id=shipment.id,
            provider_event_id=event.get("provider_event_id"),
            status=event["status"],
            description=event.get("description") or event["status"],
            location=event.get("location"),
            raw_payload=event.get("raw_payload") or event,
            occurred_at=occurred_at,
        )
        session.add(row)
        await session.flush()
        return row

    async def list_tracking_events(
        self, session: AsyncSession, shipment_id: str
    ) -> list[TrackingEventModel]:
        result = await session.execute(
            select(TrackingEventModel)
            .where(TrackingEventModel.shipment_id == shipment_id)
            .order_by(TrackingEventModel.occurred_at.asc())
        )
        return list(result.scalars().all())
