from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import BusinessRuleException, EntityNotFoundException, OptimisticLockException
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.schemas.cart import CartItemAddRequest


class CRUDCart:
    async def _get_cart_by_id(self, db: AsyncSession, *, cart_id: str) -> Optional[Cart]:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .where(Cart.id == cart_id)
            .execution_options(populate_existing=True)
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    def _new_expiry() -> datetime:
        return datetime.utcnow() + timedelta(days=settings.CART_TTL_DAYS)

    async def _mark_expired_if_needed(self, db: AsyncSession, cart: Cart) -> None:
        if cart.status == "active" and cart.expires_at < datetime.utcnow():
            cart.status = "expired"
            cart.updated_at = datetime.utcnow()
            cart.version += 1
            db.add(cart)
            await db.commit()

    async def _load_active_cart(
        self, db: AsyncSession, *, user_id: str, merchant_id: str
    ) -> Optional[Cart]:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .where(
                Cart.user_id == user_id,
                Cart.merchant_id == merchant_id,
                Cart.status == "active",
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        cart = result.scalars().first()
        if cart:
            await self._mark_expired_if_needed(db, cart)
            if cart.status != "active":
                return None
        return cart

    async def get_or_create_active_cart(
        self, db: AsyncSession, *, user_id: str, merchant_id: str, currency_code: str = "VND"
    ) -> Cart:
        cart = await self._load_active_cart(db, user_id=user_id, merchant_id=merchant_id)
        if cart:
            fresh = await self._get_cart_by_id(db, cart_id=cart.id)
            return fresh if fresh else cart

        cart = Cart(
            user_id=user_id,
            merchant_id=merchant_id,
            currency_code=currency_code,
            status="active",
            expires_at=self._new_expiry(),
        )
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
        fresh = await self._get_cart_by_id(db, cart_id=cart.id)
        return fresh if fresh else cart

    async def list_active_carts_of_user(self, db: AsyncSession, *, user_id: str) -> list[Cart]:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items))
            .where(Cart.user_id == user_id, Cart.status == "active")
            .order_by(Cart.updated_at.desc())
        )
        result = await db.execute(stmt)
        carts = list(result.scalars().all())
        active_carts: list[Cart] = []
        for cart in carts:
            await self._mark_expired_if_needed(db, cart)
            if cart.status == "active":
                active_carts.append(cart)
        return active_carts

    async def _assert_version(self, cart: Cart, expected_version: int) -> None:
        if cart.version != expected_version:
            raise OptimisticLockException(expected_version=cart.version, current_version=expected_version)

    async def _refresh_rollup(self, db: AsyncSession, cart: Cart) -> None:
        await db.flush()
        stmt = select(
            func.coalesce(func.sum(CartItem.quantity * CartItem.unit_price_snapshot), 0),
            func.coalesce(func.sum(CartItem.quantity), 0),
        ).where(CartItem.cart_id == cart.id)
        result = await db.execute(stmt)
        subtotal, item_count = result.one()

        cart.subtotal = Decimal(subtotal)
        cart.item_count = int(item_count)
        cart.expires_at = self._new_expiry()
        cart.updated_at = datetime.utcnow()
        cart.version += 1

    async def add_item(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        merchant_id: str,
        item_in: CartItemAddRequest,
    ) -> Cart:
        cart = await self.get_or_create_active_cart(db, user_id=user_id, merchant_id=merchant_id)
        await self._assert_version(cart, item_in.cart_version)

        variant_filter = (
            CartItem.variant_id.is_(None)
            if item_in.variant_id is None
            else CartItem.variant_id == item_in.variant_id
        )
        stmt = select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_id == item_in.product_id,
            variant_filter,
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()

        if existing:
            next_quantity = existing.quantity + item_in.quantity
            if next_quantity > 999:
                raise BusinessRuleException("Quantity cannot exceed 999 per item.")
            existing.quantity = next_quantity
            existing.updated_at = datetime.utcnow()
            db.add(existing)
        else:
            db_item = CartItem(
                cart_id=cart.id,
                product_id=item_in.product_id,
                variant_id=item_in.variant_id,
                merchant_id=merchant_id,
                quantity=item_in.quantity,
                unit_price_snapshot=item_in.unit_price_snapshot,
                product_name_snapshot=item_in.product_name_snapshot,
                variant_label_snapshot=item_in.variant_label_snapshot,
                image_url_snapshot=item_in.image_url_snapshot,
                metadata_json=item_in.metadata_json,
            )
            db.add(db_item)

        await self._refresh_rollup(db, cart)
        await db.commit()
        fresh = await self._get_cart_by_id(db, cart_id=cart.id)
        return fresh if fresh else cart

    async def update_item_quantity(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        merchant_id: str,
        item_id: str,
        expected_cart_version: int,
        quantity: int,
    ) -> Cart:
        cart = await self.get_or_create_active_cart(db, user_id=user_id, merchant_id=merchant_id)
        await self._assert_version(cart, expected_cart_version)

        stmt = select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
        result = await db.execute(stmt)
        item = result.scalars().first()
        if not item:
            raise EntityNotFoundException(entity="CartItem", entity_id=item_id)

        item.quantity = quantity
        item.updated_at = datetime.utcnow()
        db.add(item)

        await self._refresh_rollup(db, cart)
        await db.commit()
        fresh = await self._get_cart_by_id(db, cart_id=cart.id)
        return fresh if fresh else cart

    async def remove_item(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        merchant_id: str,
        item_id: str,
        expected_cart_version: int,
    ) -> Cart:
        cart = await self.get_or_create_active_cart(db, user_id=user_id, merchant_id=merchant_id)
        await self._assert_version(cart, expected_cart_version)

        stmt = select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
        result = await db.execute(stmt)
        item = result.scalars().first()
        if not item:
            raise EntityNotFoundException(entity="CartItem", entity_id=item_id)

        await db.delete(item)
        await self._refresh_rollup(db, cart)
        await db.commit()
        fresh = await self._get_cart_by_id(db, cart_id=cart.id)
        return fresh if fresh else cart

    async def clear_cart(
        self, db: AsyncSession, *, user_id: str, merchant_id: str, expected_cart_version: int
    ) -> Cart:
        cart = await self.get_or_create_active_cart(db, user_id=user_id, merchant_id=merchant_id)
        await self._assert_version(cart, expected_cart_version)

        await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
        await self._refresh_rollup(db, cart)
        await db.commit()
        fresh = await self._get_cart_by_id(db, cart_id=cart.id)
        return fresh if fresh else cart

    async def convert_cart(
        self, db: AsyncSession, *, user_id: str, merchant_id: str, expected_cart_version: int
    ) -> Cart:
        cart = await self.get_or_create_active_cart(db, user_id=user_id, merchant_id=merchant_id)
        await self._assert_version(cart, expected_cart_version)

        if cart.item_count <= 0:
            raise BusinessRuleException("Cannot convert an empty cart.")

        cart.status = "converted"
        cart.updated_at = datetime.utcnow()
        cart.version += 1
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
        return cart

    async def expire_due_carts(self, db: AsyncSession) -> int:
        now = datetime.utcnow()
        stmt = select(Cart).where(Cart.status == "active", Cart.expires_at < now)
        result = await db.execute(stmt)
        due_carts = list(result.scalars().all())

        for cart in due_carts:
            cart.status = "expired"
            cart.updated_at = now
            cart.version += 1
            db.add(cart)

        if due_carts:
            await db.commit()
        return len(due_carts)


cart = CRUDCart()
