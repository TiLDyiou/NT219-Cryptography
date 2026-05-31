from typing import Optional
import json
import base64

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dto.checkout_dto import (
    AddressDTO,
    CheckoutContext,
    CheckoutInput,
    CheckoutItemDTO,
)
from app.application.use_cases.checkout import (
    CancelOrderUseCase,
    CheckoutUseCase,
    GetOrderUseCase,
    ListOrdersUseCase,
)
from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.infrastructure.container import get_container
from app.infrastructure.persistence.database import get_db
from app.schemas.order import CheckoutRequest


def _decode_jwt_sub(token: str) -> str:
    """Decode JWT payload (không verify signature vì gateway đã verify)
    và trả về claim 'sub' — ID cố định của user trong Keycloak."""
    try:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        sub = payload.get("sub")
        if sub:
            return sub
    except Exception:
        pass
    raise UnauthorizedException("Invalid token: cannot extract user identity.")


async def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    if x_user_id:
        return x_user_id
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return _decode_jwt_sub(token)
    raise UnauthorizedException("Could not validate user identity.")


async def get_idempotency_key(
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
) -> str:
    if not idempotency_key:
        raise UnauthorizedException("Missing Idempotency-Key header.")
    return idempotency_key


async def get_correlation_id(
    x_correlation_id: Optional[str] = Header(None, alias="X-Correlation-Id"),
) -> Optional[str]:
    return x_correlation_id


async def verify_internal_token(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
) -> None:
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise UnauthorizedException("Invalid internal token.")


def _to_checkout_input(payload: CheckoutRequest) -> CheckoutInput:
    return CheckoutInput(
        cart_id=payload.cart_id,
        payment_method_type=payload.payment_method_type,
        shipping_fee=payload.shipping_fee,
        customer_note=payload.customer_note,
        items=[
            CheckoutItemDTO(
                product_id=item.product_id,
                variant_id=item.variant_id,
                merchant_id=item.merchant_id,
                sku=item.sku,
                product_name=item.product_name,
                variant_label=item.variant_label,
                image_url=item.image_url,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            for item in payload.items
        ],
        shipping_address=AddressDTO(
            full_name=payload.shipping_address.full_name,
            phone=payload.shipping_address.phone,
            email=payload.shipping_address.email,
            address_line1=payload.shipping_address.address_line1,
            address_line2=None,
            city=payload.shipping_address.city,
            state_province=payload.shipping_address.state_province,
            postal_code=payload.shipping_address.postal_code,
        ),
    )


def get_checkout_use_case(db: AsyncSession = Depends(get_db)) -> CheckoutUseCase:
    return get_container().checkout_use_case(db)


def get_list_orders_use_case(db: AsyncSession = Depends(get_db)) -> ListOrdersUseCase:
    return get_container().list_orders_use_case(db)


def get_get_order_use_case(db: AsyncSession = Depends(get_db)) -> GetOrderUseCase:
    return get_container().get_order_use_case(db)


def get_cancel_order_use_case(db: AsyncSession = Depends(get_db)) -> CancelOrderUseCase:
    return get_container().cancel_order_use_case(db)


def build_checkout_context(
    payload: CheckoutRequest,
    user_id: str,
    idempotency_key: str,
    correlation_id: str | None,
    ip_address: str | None,
    user_agent: str | None,
) -> CheckoutContext:
    return CheckoutContext(
        user_id=user_id,
        idempotency_key=idempotency_key,
        correlation_id=correlation_id,
        ip_address=ip_address,
        user_agent=user_agent,
        payload=_to_checkout_input(payload),
    )
