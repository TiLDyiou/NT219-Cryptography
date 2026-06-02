import hashlib
import json
import random
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from app.application.dto.checkout_dto import (
    CheckoutContext,
    CheckoutInput,
    CheckoutItemDTO,
    CheckoutOrderSummaryDTO,
    CheckoutOutput,
)
from app.domain.entities.order_item import (
    EncryptedAddressFields,
    OrderAddressEntity,
    OrderEntity,
    OrderItemEntity,
)
from app.domain.entities.saga import CHECKOUT_STEPS, SagaStateEntity, SagaStatus
from app.domain.events import order_created, order_status_changed, payment_requested
from app.domain.ports.audit_logger import AuditEvent, AuditLogger
from app.domain.ports.crypto_service import CryptoService
from app.domain.ports.event_publisher import EventPublisher
from app.domain.ports.order_repository import OrderRepository
from app.domain.ports.payment_gateway import PaymentChargeRequest, PaymentGateway
from app.domain.value_objects.order_status import OrderStatus, status_for_payment_method
from app.application.saga.orchestrator import CheckoutSagaOrchestrator


def make_fingerprint(payload: CheckoutInput) -> str:
    canonical = {
        "cart_id": payload.cart_id,
        "payment_method_type": payload.payment_method_type,
        "shipping_fee": str(payload.shipping_fee),
        "items": sorted(
            [
                {
                    "product_id": item.product_id,
                    "variant_id": item.variant_id,
                    "merchant_id": item.merchant_id,
                    "sku": item.sku,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                }
                for item in payload.items
            ],
            key=lambda row: (row["merchant_id"], row["product_id"], row["variant_id"] or ""),
        ),
    }
    raw = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _new_order_number() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    suffix = random.randint(1000, 9999)
    return f"ORD-{timestamp}-{suffix}"


class CheckoutUseCase:
    def __init__(
        self,
        order_repository: OrderRepository,
        crypto_service: CryptoService,
        event_publisher: EventPublisher,
        audit_logger: AuditLogger,
        payment_gateway: PaymentGateway,
        saga_orchestrator: CheckoutSagaOrchestrator,
    ):
        self._orders = order_repository
        self._crypto = crypto_service
        self._events = event_publisher
        self._audit = audit_logger
        self._payment = payment_gateway
        self._saga = saga_orchestrator

    async def execute(self, ctx: CheckoutContext) -> CheckoutOutput:
        fingerprint = make_fingerprint(ctx.payload)

        existing = await self._orders.find_parent_by_idempotency(
            ctx.user_id, ctx.idempotency_key
        )
        if existing:
            if existing.idempotency_fingerprint != fingerprint:
                from app.core.exceptions import IdempotencyConflictException

                raise IdempotencyConflictException()
            children = await self._orders.find_children_by_parent(existing.id)
            # H-10 (một phần): _to_output đã trả lại trạng thái thực (suy ra từ children)
            # và checkout_url lưu trong metadata, nên client thấy đúng tình trạng và có thể
            # tiếp tục thanh toán. Việc RESUME toàn bộ saga (vd đã giữ kho nhưng chưa thu
            # tiền) là hạng mục thiết kế lớn hơn — xem ghi chú trong báo cáo.
            return self._to_output(existing, children)

        parent, children, sagas = await self._build_orders(ctx, fingerprint)
        result = await self._orders.save_checkout(parent, children, sagas)

        for child in result.children:
            await self._events.publish(
                order_created(
                    order_id=child.id,
                    order_group_id=child.order_group_id,
                    user_id=child.user_id,
                    merchant_id=child.merchant_id,
                    status=child.status.value,
                    total_amount=str(child.total_amount),
                )
            )
            await self._audit.log(
                AuditEvent(
                    table_name="orders",
                    record_id=child.id,
                    action="INSERT",
                    old_data=None,
                    new_data={"status": child.status.value, "total_amount": str(child.total_amount)},
                    changed_fields=["status", "total_amount"],
                    actor_id=ctx.user_id,
                    actor_type="user",
                    ip_address=ctx.ip_address,
                    user_agent=ctx.user_agent,
                    correlation_id=ctx.correlation_id,
                )
            )

        for child, saga in zip(result.children, result.sagas):
            if ctx.payload.payment_method_type != "cod":
                await self._events.publish(
                    payment_requested(
                        order_id=child.id,
                        user_id=child.user_id,
                        amount=str(child.total_amount),
                        payment_method_type=child.payment_method_type or "",
                        idempotency_key=ctx.idempotency_key,
                    )
                )
                await self._saga.run(child, saga, ctx)

        checkout_url = None
        if ctx.payload.payment_method_type == "credit_card":
            payment_result = await self._payment.charge(
                PaymentChargeRequest(
                    order_id=result.parent.id,
                    user_id=result.parent.user_id,
                    amount=result.parent.total_amount,
                    payment_method_type="credit_card",
                    idempotency_key=ctx.idempotency_key,
                    line_items=self._to_payment_line_items(ctx),
                )
            )
            if payment_result.status == "failed":
                from app.core.exceptions import BusinessRuleException
                raise BusinessRuleException("Payment Gateway failed to create checkout session.")

            result.parent.payment_id = payment_result.payment_id
            result.parent.metadata["stripe_checkout_url"] = payment_result.checkout_url
            await self._orders.update_order(result.parent)
            checkout_url = payment_result.checkout_url

        return self._to_output(result.parent, result.children, checkout_url)

    async def _build_orders(
        self, ctx: CheckoutContext, fingerprint: str
    ) -> tuple[OrderEntity, list[OrderEntity], list[SagaStateEntity]]:
        grouped: dict[str, list[CheckoutItemDTO]] = defaultdict(list)
        for item in ctx.payload.items:
            grouped[item.merchant_id].append(item)

        parent_id = str(uuid4())
        order_group_id = str(uuid4())
        parent_number = _new_order_number()
        initial_status = status_for_payment_method(ctx.payload.payment_method_type)

        parent_subtotal = sum(
            (Decimal(item.quantity) * item.unit_price for item in ctx.payload.items),
            start=Decimal("0"),
        )
        parent_total = parent_subtotal + ctx.payload.shipping_fee
        child_shipping = (
            ctx.payload.shipping_fee / Decimal(max(len(grouped), 1))
            if grouped
            else Decimal("0")
        )

        parent = OrderEntity(
            id=parent_id,
            order_group_id=order_group_id,
            parent_order_id=None,
            order_number=parent_number,
            user_id=ctx.user_id,
            merchant_id=None,
            status=initial_status,
            subtotal=parent_subtotal,
            shipping_fee=ctx.payload.shipping_fee,
            total_amount=parent_total,
            item_count=sum(item.quantity for item in ctx.payload.items),
            payment_method_type=ctx.payload.payment_method_type,
            idempotency_key=ctx.idempotency_key,
            idempotency_fingerprint=fingerprint,
            customer_note=ctx.payload.customer_note,
            ip_address=ctx.ip_address,
            user_agent=ctx.user_agent,
            metadata={
                "group_role": "parent",
                "cart_id": ctx.payload.cart_id,
                "correlation_id": ctx.correlation_id,
            },
        )

        children: list[OrderEntity] = []
        sagas: list[SagaStateEntity] = []

        for idx, (merchant_id, merchant_items) in enumerate(grouped.items(), start=1):
            child_subtotal = sum(
                (Decimal(item.quantity) * item.unit_price for item in merchant_items),
                start=Decimal("0"),
            )
            child_total = child_subtotal + child_shipping
            child_id = str(uuid4())

            items = [
                OrderItemEntity(
                    id=str(uuid4()),
                    product_id=row.product_id,
                    variant_id=row.variant_id,
                    merchant_id=row.merchant_id,
                    sku=row.sku,
                    product_name=row.product_name,
                    variant_label=row.variant_label,
                    image_url=row.image_url,
                    quantity=row.quantity,
                    unit_price=row.unit_price,
                    line_total=Decimal(row.quantity) * row.unit_price,
                )
                for row in merchant_items
            ]

            addresses = await self._build_addresses(child_id, ctx.payload.shipping_address)

            child = OrderEntity(
                id=child_id,
                order_group_id=order_group_id,
                parent_order_id=parent_id,
                order_number=f"{parent_number}-{idx}",
                user_id=ctx.user_id,
                merchant_id=merchant_id,
                status=initial_status,
                subtotal=child_subtotal,
                shipping_fee=child_shipping,
                total_amount=child_total,
                item_count=sum(item.quantity for item in merchant_items),
                payment_method_type=ctx.payload.payment_method_type,
                idempotency_key=ctx.idempotency_key,
                idempotency_fingerprint=fingerprint,
                customer_note=ctx.payload.customer_note,
                ip_address=ctx.ip_address,
                user_agent=ctx.user_agent,
                metadata={
                    "group_role": "child",
                    "cart_id": ctx.payload.cart_id,
                    "correlation_id": ctx.correlation_id,
                },
                items=items,
                addresses=addresses,
            )
            children.append(child)

            if ctx.payload.payment_method_type == "cod":
                saga = SagaStateEntity(
                    id=str(uuid4()),
                    order_id=child_id,
                    current_step="completed",
                    status=SagaStatus.COMPLETED,
                    steps_completed=["reserve_inventory", "fraud_check"],
                    steps_remaining=[],
                )
            else:
                saga = SagaStateEntity(
                    id=str(uuid4()),
                    order_id=child_id,
                    current_step=CHECKOUT_STEPS[0],
                    status=SagaStatus.IN_PROGRESS,
                    steps_completed=[],
                    steps_remaining=list(CHECKOUT_STEPS),
                )
            sagas.append(saga)

        return parent, children, sagas

    async def _build_addresses(
        self, order_id: str, address
    ) -> list[OrderAddressEntity]:
        encrypted = EncryptedAddressFields(
            full_name=await self._crypto.encrypt_field(address.full_name) or b"",
            phone=await self._crypto.encrypt_field(address.phone) or b"",
            email=await self._crypto.encrypt_field(address.email),
            address_line1=await self._crypto.encrypt_field(address.address_line1) or b"",
            address_line2=await self._crypto.encrypt_field(address.address_line2),
        )
        shipping = OrderAddressEntity(
            id=str(uuid4()),
            address_type="shipping",
            encrypted=encrypted,
            city=address.city,
            district=address.city,
            state_province=address.state_province,
            postal_code=address.postal_code,
        )
        billing = OrderAddressEntity(
            id=str(uuid4()),
            address_type="billing",
            encrypted=encrypted,
            city=address.city,
            district=address.city,
            state_province=address.state_province,
            postal_code=address.postal_code,
        )
        return [shipping, billing]

    @staticmethod
    def _to_payment_line_items(ctx: CheckoutContext) -> list[dict]:
        items = [
            {
                "name": item.product_name,
                "quantity": item.quantity,
                "unit_amount": str(item.unit_price),
            }
            for item in ctx.payload.items
        ]
        if ctx.payload.shipping_fee > 0:
            items.append(
                {
                    "name": "Shipping fee",
                    "quantity": 1,
                    "unit_amount": str(ctx.payload.shipping_fee),
                }
            )
        return items

    @staticmethod
    def _to_output(
        parent: OrderEntity,
        children: list[OrderEntity],
        checkout_url: str | None = None,
    ) -> CheckoutOutput:
        status = parent.status.value
        if children and all(child.status == OrderStatus.CONFIRMED for child in children):
            status = OrderStatus.CONFIRMED.value
        elif children:
            status = children[0].status.value

        return CheckoutOutput(
            order_group_id=parent.order_group_id,
            parent_order_number=parent.order_number,
            status=status,
            checkout_url=checkout_url or parent.metadata.get("stripe_checkout_url"),
            orders=[
                CheckoutOrderSummaryDTO(
                    order_id=child.id,
                    order_number=child.order_number,
                    merchant_id=child.merchant_id or "",
                    status=child.status.value,
                    total_amount=child.total_amount,
                )
                for child in children
            ],
        )


class GetOrderUseCase:
    def __init__(self, order_repository: OrderRepository):
        self._orders = order_repository

    async def execute(self, user_id: str, order_id: str) -> OrderEntity:
        return await self._orders.get_user_order(user_id, order_id)


class ListOrdersUseCase:
    def __init__(self, order_repository: OrderRepository):
        self._orders = order_repository

    async def execute(self, user_id: str) -> list[OrderEntity]:
        return await self._orders.list_user_orders(user_id)


class CancelOrderUseCase:
    def __init__(
        self,
        order_repository: OrderRepository,
        event_publisher: EventPublisher,
        audit_logger: AuditLogger,
    ):
        self._orders = order_repository
        self._events = event_publisher
        self._audit = audit_logger

    async def execute(
        self,
        user_id: str,
        order_id: str,
        reason: str | None,
        correlation_id: str | None = None,
    ) -> OrderEntity:
        order = await self._orders.get_user_order(user_id, order_id)
        old_status = order.status.value
        order.transition_to(OrderStatus.CANCELLED)
        updated = await self._orders.update_order(order)

        await self._events.publish(
            order_status_changed(
                order_id=order.id,
                from_status=old_status,
                to_status=OrderStatus.CANCELLED.value,
                actor_id=user_id,
                actor_type="user",
            )
        )
        await self._audit.log(
            AuditEvent(
                table_name="orders",
                record_id=order.id,
                action="UPDATE",
                old_data={"status": old_status},
                new_data={"status": OrderStatus.CANCELLED.value, "reason": reason},
                changed_fields=["status"],
                actor_id=user_id,
                actor_type="user",
                correlation_id=correlation_id,
            )
        )
        return updated
