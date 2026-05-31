from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException
from app.domain.entities.order_item import (
    EncryptedAddressFields,
    OrderAddressEntity,
    OrderEntity,
    OrderItemEntity,
)
from app.domain.entities.saga import SagaStateEntity, SagaStatus
from app.domain.ports.order_repository import CheckoutPersistenceResult, OrderRepository
from app.domain.value_objects.order_status import OrderStatus
from app.infrastructure.persistence.models.order_address_model import OrderAddressModel
from app.infrastructure.persistence.models.order_item_model import OrderItemModel
from app.infrastructure.persistence.models.order_model import OrderModel
from app.infrastructure.persistence.models.order_status_history_model import OrderStatusHistoryModel
from app.infrastructure.persistence.models.saga_state_model import SagaStateModel


def _to_entity(model: OrderModel, include_relations: bool = True) -> OrderEntity:
    items: list[OrderItemEntity] = []
    addresses: list[OrderAddressEntity] = []

    if include_relations:
        items = [
            OrderItemEntity(
                id=item.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                merchant_id=item.merchant_id,
                sku=item.sku,
                product_name=item.product_name,
                variant_label=item.variant_label,
                image_url=item.image_url,
                quantity=item.quantity,
                unit_price=Decimal(str(item.unit_price)),
                line_total=Decimal(str(item.line_total)),
                fulfilled_qty=item.fulfilled_qty,
                status=item.status,
                metadata=item.metadata_json or {},
            )
            for item in model.items
        ]
        addresses = [
            OrderAddressEntity(
                id=addr.id,
                address_type=addr.address_type,
                encrypted=EncryptedAddressFields(
                    full_name=bytes(addr.full_name_encrypted),
                    phone=bytes(addr.phone_encrypted),
                    email=bytes(addr.email_encrypted) if addr.email_encrypted else None,
                    address_line1=bytes(addr.address_line1_encrypted),
                    address_line2=(
                        bytes(addr.address_line2_encrypted)
                        if addr.address_line2_encrypted
                        else None
                    ),
                ),
                city=addr.city,
                district=addr.district,
                state_province=addr.state_province,
                postal_code=addr.postal_code,
            )
            for addr in model.addresses
        ]

    return OrderEntity(
        id=model.id,
        order_group_id=model.order_group_id,
        parent_order_id=model.parent_order_id,
        order_number=model.order_number,
        user_id=model.user_id,
        merchant_id=model.merchant_id,
        status=OrderStatus(model.status),
        subtotal=Decimal(str(model.subtotal)),
        shipping_fee=Decimal(str(model.shipping_fee)),
        total_amount=Decimal(str(model.total_amount)),
        item_count=model.item_count,
        payment_method_type=model.payment_method_type,
        idempotency_key=model.idempotency_key,
        idempotency_fingerprint=model.idempotency_fingerprint,
        fraud_status=model.fraud_status,
        payment_id=model.payment_id,
        customer_note=model.customer_note,
        ip_address=model.ip_address,
        user_agent=model.user_agent,
        metadata=model.metadata_json or {},
        items=items,
        addresses=addresses,
        created_at=model.created_at,
    )


def _saga_to_entity(model: SagaStateModel) -> SagaStateEntity:
    return SagaStateEntity(
        id=model.id,
        order_id=model.order_id,
        saga_type=model.saga_type,
        current_step=model.current_step,
        status=SagaStatus(model.status),
        steps_completed=list(model.steps_completed or []),
        steps_remaining=list(model.steps_remaining or []),
        compensation_log=list(model.compensation_log or []),
        error_details=model.error_details,
        retry_count=model.retry_count,
        max_retries=model.max_retries,
        started_at=model.started_at,
        completed_at=model.completed_at,
    )


class PgOrderRepository(OrderRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def find_parent_by_idempotency(
        self, user_id: str, idempotency_key: str
    ) -> OrderEntity | None:
        stmt: Select[tuple[OrderModel]] = (
            select(OrderModel)
            .where(
                OrderModel.user_id == user_id,
                OrderModel.idempotency_key == idempotency_key,
                OrderModel.parent_order_id.is_(None),
                OrderModel.merchant_id.is_(None),
            )
            .limit(1)
        )
        result = await self._session.execute(stmt)
        row = result.scalars().first()
        return _to_entity(row, include_relations=False) if row else None

    async def find_children_by_parent(self, parent_order_id: str) -> list[OrderEntity]:
        stmt: Select[tuple[OrderModel]] = (
            select(OrderModel)
            .options(
                selectinload(OrderModel.items),
                selectinload(OrderModel.addresses)
            )
            .where(OrderModel.parent_order_id == parent_order_id)
            .order_by(OrderModel.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return [_to_entity(row) for row in result.scalars().all()]

    async def save_checkout(
        self,
        parent: OrderEntity,
        children: list[OrderEntity],
        sagas: list[SagaStateEntity],
    ) -> CheckoutPersistenceResult:
        parent_model = self._order_to_model(parent)
        self._session.add(parent_model)
        self._session.add(
            OrderStatusHistoryModel(
                order_id=parent.id,
                from_status=None,
                to_status=parent.status.value,
                actor_id=parent.user_id,
                actor_type="user",
                metadata_json={"event": "checkout_created"},
            )
        )

        saved_children: list[OrderEntity] = []
        saved_sagas: list[SagaStateEntity] = []

        for child, saga in zip(children, sagas):
            child_model = self._order_to_model(child)
            self._session.add(child_model)
            await self._session.flush()

            self._session.add(
                OrderStatusHistoryModel(
                    order_id=child.id,
                    from_status=None,
                    to_status=child.status.value,
                    actor_id=child.user_id,
                    actor_type="user",
                    metadata_json={"event": "checkout_created"},
                )
            )

            for address in child.addresses:
                self._session.add(
                    OrderAddressModel(
                        id=address.id,
                        order_id=child.id,
                        address_type=address.address_type,
                        full_name_encrypted=address.encrypted.full_name,
                        phone_encrypted=address.encrypted.phone,
                        email_encrypted=address.encrypted.email,
                        address_line1_encrypted=address.encrypted.address_line1,
                        address_line2_encrypted=address.encrypted.address_line2,
                        city=address.city,
                        district=address.district,
                        state_province=address.state_province,
                        postal_code=address.postal_code,
                    )
                )

            for item in child.items:
                self._session.add(
                    OrderItemModel(
                        id=item.id,
                        order_id=child.id,
                        product_id=item.product_id,
                        variant_id=item.variant_id,
                        merchant_id=item.merchant_id,
                        sku=item.sku,
                        product_name=item.product_name,
                        variant_label=item.variant_label,
                        image_url=item.image_url,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        line_total=item.line_total,
                        fulfilled_qty=item.fulfilled_qty,
                        status=item.status,
                        metadata_json=item.metadata,
                    )
                )

            saga_model = SagaStateModel(
                id=saga.id,
                order_id=child.id,
                saga_type=saga.saga_type,
                current_step=saga.current_step,
                status=saga.status.value,
                steps_completed=saga.steps_completed,
                steps_remaining=saga.steps_remaining,
                compensation_log=saga.compensation_log,
                error_details=saga.error_details,
                retry_count=saga.retry_count,
                max_retries=saga.max_retries,
                started_at=saga.started_at,
                completed_at=saga.completed_at,
            )
            self._session.add(saga_model)
            saved_children.append(child)
            saved_sagas.append(saga)

        await self._session.commit()
        return CheckoutPersistenceResult(
            parent=parent,
            children=saved_children,
            sagas=saved_sagas,
        )

    async def list_user_orders(self, user_id: str) -> list[OrderEntity]:
        stmt: Select[tuple[OrderModel]] = (
            select(OrderModel)
            .options(
                selectinload(OrderModel.items),
                selectinload(OrderModel.addresses)
            )
            .where(
                OrderModel.user_id == user_id,
                OrderModel.parent_order_id.is_not(None),
            )
            .order_by(OrderModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return [_to_entity(row) for row in result.scalars().all()]

    async def get_order_by_id(self, order_id: str) -> OrderEntity:
        """Fetch any order by ID — for internal use only (e.g. payment event consumer)."""
        stmt: Select[tuple[OrderModel]] = (
            select(OrderModel)
            .where(OrderModel.id == order_id)
            .limit(1)
        )
        result = await self._session.execute(stmt)
        row = result.scalars().first()
        if not row:
            raise EntityNotFoundException(entity="Order", entity_id=order_id)
        return _to_entity(row, include_relations=False)

    async def get_user_order(self, user_id: str, order_id: str) -> OrderEntity:
        stmt: Select[tuple[OrderModel]] = (
            select(OrderModel)
            .options(
                selectinload(OrderModel.items),
                selectinload(OrderModel.addresses)
            )
            .where(OrderModel.id == order_id, OrderModel.user_id == user_id)
            .limit(1)
        )
        result = await self._session.execute(stmt)
        row = result.scalars().first()
        if not row:
            raise EntityNotFoundException(entity="Order", entity_id=order_id)
        return _to_entity(row)

    async def update_order(self, order: OrderEntity) -> OrderEntity:
        stmt = select(OrderModel).where(OrderModel.id == order.id).limit(1)
        result = await self._session.execute(stmt)
        model = result.scalars().first()
        if not model:
            raise EntityNotFoundException(entity="Order", entity_id=order.id)

        model.status = order.status.value
        model.payment_id = order.payment_id
        model.fraud_status = order.fraud_status
        model.metadata_json = order.metadata
        await self._session.commit()
        return order

    async def update_saga(self, saga: SagaStateEntity) -> SagaStateEntity:
        stmt = select(SagaStateModel).where(SagaStateModel.id == saga.id).limit(1)
        result = await self._session.execute(stmt)
        model = result.scalars().first()
        if not model:
            raise EntityNotFoundException(entity="SagaState", entity_id=saga.id)

        model.current_step = saga.current_step
        model.status = saga.status.value
        model.steps_completed = saga.steps_completed
        model.steps_remaining = saga.steps_remaining
        model.compensation_log = saga.compensation_log
        model.error_details = saga.error_details
        model.completed_at = saga.completed_at
        await self._session.commit()
        return saga

    async def get_saga_by_order(self, order_id: str) -> SagaStateEntity | None:
        stmt = select(SagaStateModel).where(SagaStateModel.order_id == order_id).limit(1)
        result = await self._session.execute(stmt)
        row = result.scalars().first()
        return _saga_to_entity(row) if row else None

    @staticmethod
    def _order_to_model(order: OrderEntity) -> OrderModel:
        return OrderModel(
            id=order.id,
            order_group_id=order.order_group_id,
            parent_order_id=order.parent_order_id,
            order_number=order.order_number,
            user_id=order.user_id,
            merchant_id=order.merchant_id,
            status=order.status.value,
            subtotal=order.subtotal,
            shipping_fee=order.shipping_fee,
            total_amount=order.total_amount,
            item_count=order.item_count,
            payment_method_type=order.payment_method_type,
            idempotency_key=order.idempotency_key,
            idempotency_fingerprint=order.idempotency_fingerprint,
            fraud_status=order.fraud_status,
            payment_id=order.payment_id,
            customer_note=order.customer_note,
            ip_address=order.ip_address,
            user_agent=order.user_agent,
            metadata_json=order.metadata,
            created_at=order.created_at,
        )
