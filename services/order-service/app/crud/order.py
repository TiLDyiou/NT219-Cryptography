import hashlib
import json
import random
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Iterable

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException, IdempotencyConflictException
from app.models.order import Order
from app.models.order_address import OrderAddress
from app.models.order_item import OrderItem
from app.models.order_status_history import OrderStatusHistory
from app.models.saga_state import SagaState
from app.schemas.order import CheckoutOrderSummary, CheckoutRequest, CheckoutResponse


def _encrypt_placeholder(value: str | None) -> bytes | None:
    if value is None:
        return None
    # This placeholder keeps DB contract with encrypted fields.
    return value.encode("utf-8")


def _make_fingerprint(payload: CheckoutRequest) -> str:
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


def _status_for_method(payment_method_type: str) -> str:
    return "payment_processing" if payment_method_type != "cod" else "confirmed"


class CRUDOrder:
    async def _get_parent_by_idempotency(
        self, db: AsyncSession, *, user_id: str, idempotency_key: str
    ) -> Order | None:
        stmt: Select[tuple[Order]] = (
            select(Order)
            .where(
                Order.user_id == user_id,
                Order.idempotency_key == idempotency_key,
                Order.parent_order_id.is_(None),
                Order.merchant_id.is_(None),
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def _get_children(self, db: AsyncSession, *, parent_order_id: str) -> list[Order]:
        stmt: Select[tuple[Order]] = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.parent_order_id == parent_order_id)
            .order_by(Order.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def _build_replay_response(self, db: AsyncSession, parent: Order) -> CheckoutResponse:
        children = await self._get_children(db, parent_order_id=parent.id)
        return CheckoutResponse(
            order_group_id=parent.order_group_id,
            parent_order_number=parent.order_number,
            status=parent.status,
            orders=[
                CheckoutOrderSummary(
                    order_id=order.id,
                    order_number=order.order_number,
                    merchant_id=order.merchant_id or "",
                    status=order.status,
                    total_amount=Decimal(order.total_amount),
                )
                for order in children
            ],
        )

    async def checkout(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        idempotency_key: str,
        correlation_id: str | None,
        ip_address: str | None,
        user_agent: str | None,
        payload: CheckoutRequest,
    ) -> CheckoutResponse:
        fingerprint = _make_fingerprint(payload)

        existing_parent = await self._get_parent_by_idempotency(
            db, user_id=user_id, idempotency_key=idempotency_key
        )
        if existing_parent:
            if existing_parent.idempotency_fingerprint != fingerprint:
                raise IdempotencyConflictException()
            return await self._build_replay_response(db, existing_parent)

        grouped: dict[str, list] = defaultdict(list)
        for item in payload.items:
            grouped[item.merchant_id].append(item)

        parent_order_id = self._create_order_id()
        order_group_id = self._create_order_id()
        parent_order_number = _new_order_number()
        child_status = _status_for_method(payload.payment_method_type)
        parent_subtotal = sum(
            (Decimal(item.quantity) * item.unit_price for item in payload.items),
            start=Decimal("0"),
        )
        parent_total = parent_subtotal + payload.shipping_fee
        child_shipping_fee = (
            payload.shipping_fee / Decimal(max(len(grouped), 1)) if grouped else Decimal("0")
        )

        parent = Order(
            id=parent_order_id,
            order_group_id=order_group_id,
            parent_order_id=None,
            order_number=parent_order_number,
            user_id=user_id,
            merchant_id=None,
            status=child_status,
            subtotal=parent_subtotal,
            shipping_fee=payload.shipping_fee,
            total_amount=parent_total,
            item_count=sum(item.quantity for item in payload.items),
            payment_method_type=payload.payment_method_type,
            idempotency_key=idempotency_key,
            idempotency_fingerprint=fingerprint,
            customer_note=payload.customer_note,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json={
                "group_role": "parent",
                "cart_id": payload.cart_id,
                "correlation_id": correlation_id,
            },
        )
        db.add(parent)

        db.add(
            OrderStatusHistory(
                order_id=parent.id,
                from_status=None,
                to_status=child_status,
                actor_id=user_id,
                actor_type="user",
                metadata_json={"event": "checkout_created"},
            )
        )

        order_summaries: list[CheckoutOrderSummary] = []

        for idx, (merchant_id, merchant_items) in enumerate(grouped.items(), start=1):
            child_subtotal = sum(
                (Decimal(item.quantity) * item.unit_price for item in merchant_items),
                start=Decimal("0"),
            )
            child_total = child_subtotal + child_shipping_fee
            child = Order(
                order_group_id=order_group_id,
                parent_order_id=parent_order_id,
                order_number=f"{parent_order_number}-{idx}",
                user_id=user_id,
                merchant_id=merchant_id,
                status=child_status,
                subtotal=child_subtotal,
                shipping_fee=child_shipping_fee,
                total_amount=child_total,
                item_count=sum(item.quantity for item in merchant_items),
                payment_method_type=payload.payment_method_type,
                idempotency_key=idempotency_key,
                idempotency_fingerprint=fingerprint,
                customer_note=payload.customer_note,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata_json={
                    "group_role": "child",
                    "cart_id": payload.cart_id,
                    "correlation_id": correlation_id,
                },
            )
            db.add(child)
            await db.flush()

            db.add(
                OrderStatusHistory(
                    order_id=child.id,
                    from_status=None,
                    to_status=child_status,
                    actor_id=user_id,
                    actor_type="user",
                    metadata_json={"event": "checkout_created"},
                )
            )

            saga_state = SagaState(
                order_id=child.id,
                current_step="process_payment" if payload.payment_method_type != "cod" else "completed",
                status="in_progress" if payload.payment_method_type != "cod" else "completed",
                steps_completed=[] if payload.payment_method_type != "cod" else ["reserve_inventory", "fraud_check"],
                steps_remaining=(
                    ["reserve_inventory", "fraud_check", "process_payment", "confirm_order"]
                    if payload.payment_method_type != "cod"
                    else []
                ),
            )
            db.add(saga_state)

            self._add_addresses(db=db, order_id=child.id, payload=payload)
            self._add_items(db=db, order_id=child.id, merchant_items=merchant_items)

            order_summaries.append(
                CheckoutOrderSummary(
                    order_id=child.id,
                    order_number=child.order_number,
                    merchant_id=merchant_id,
                    status=child.status,
                    total_amount=Decimal(child.total_amount),
                )
            )

        await db.commit()
        return CheckoutResponse(
            order_group_id=order_group_id,
            parent_order_number=parent_order_number,
            status=child_status,
            orders=order_summaries,
        )

    async def list_user_orders(self, db: AsyncSession, *, user_id: str) -> list[Order]:
        stmt: Select[tuple[Order]] = (
            select(Order)
            .options(selectinload(Order.items))
            .where(
                Order.user_id == user_id,
                Order.parent_order_id.is_not(None),
            )
            .order_by(Order.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_user_order(self, db: AsyncSession, *, user_id: str, order_id: str) -> Order:
        stmt: Select[tuple[Order]] = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id, Order.user_id == user_id)
            .limit(1)
        )
        result = await db.execute(stmt)
        order = result.scalars().first()
        if not order:
            raise EntityNotFoundException(entity="Order", entity_id=order_id)
        return order

    @staticmethod
    def _create_order_id() -> str:
        from app.models.base import generate_uuid

        return generate_uuid()

    @staticmethod
    def _add_items(db: AsyncSession, *, order_id: str, merchant_items: Iterable) -> None:
        for row in merchant_items:
            db.add(
                OrderItem(
                    order_id=order_id,
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
                    fulfilled_qty=0,
                    status="pending",
                    metadata_json={},
                )
            )

    @staticmethod
    def _add_addresses(db: AsyncSession, *, order_id: str, payload: CheckoutRequest) -> None:
        shipping = payload.shipping_address
        billing = payload.shipping_address
        db.add(
            OrderAddress(
                order_id=order_id,
                address_type="shipping",
                full_name_encrypted=_encrypt_placeholder(shipping.full_name) or b"",
                phone_encrypted=_encrypt_placeholder(shipping.phone) or b"",
                email_encrypted=_encrypt_placeholder(shipping.email),
                address_line1_encrypted=_encrypt_placeholder(shipping.address_line1) or b"",
                address_line2_encrypted=None,
                city=shipping.city,
                district=shipping.city,
                state_province=shipping.state_province,
                postal_code=shipping.postal_code,
            )
        )
        db.add(
            OrderAddress(
                order_id=order_id,
                address_type="billing",
                full_name_encrypted=_encrypt_placeholder(billing.full_name) or b"",
                phone_encrypted=_encrypt_placeholder(billing.phone) or b"",
                email_encrypted=_encrypt_placeholder(billing.email),
                address_line1_encrypted=_encrypt_placeholder(billing.address_line1) or b"",
                address_line2_encrypted=None,
                city=billing.city,
                district=billing.city,
                state_province=billing.state_province,
                postal_code=billing.postal_code,
            )
        )


order = CRUDOrder()

